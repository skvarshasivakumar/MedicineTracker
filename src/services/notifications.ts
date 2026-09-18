import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { speak } from './voice';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let _initialised = false;
const _knownChannels = new Set<string>();

/**
 * A voice clip attached to a notification only produces audible sound in the
 * BACKGROUND if it is bundled as a native resource. That requires:
 *   1. Listing the file in app.json → plugins → expo-notifications → sounds.
 *   2. Rebuilding the native app (EAS build / `expo prebuild`).
 *   3. Android accepts .wav ONLY; iOS accepts .wav/.caf/.aiff (≤ 30s).
 * If the file isn't bundled, we silently fall back to the system default sound
 * — the reminder still fires on time, just without the custom voice.
 */

function isBundledSound(clip?: string | null): boolean {
  if (!clip) return false;
  const lower = clip.trim().toLowerCase();
  if (!lower) return false;
  // Android res/raw only handles .wav; iOS handles wav/caf/aiff at bundle level.
  if (Platform.OS === 'android') return lower.endsWith('.wav');
  return /\.(wav|caf|aiff|mp3|m4a)$/i.test(lower);
}

/** Sanitized channel id derived from a clip filename, or 'default'. */
function channelIdFor(clip?: string | null): string {
  if (!isBundledSound(clip)) return 'default';
  const base = (clip as string).trim().replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return `voice_${base}`;
}

async function ensureChannel(clip?: string | null): Promise<string> {
  if (Platform.OS !== 'android') return 'default';
  const id = channelIdFor(clip);
  if (_knownChannels.has(id)) return id;
  const sound = id === 'default' ? 'default' : (clip as string).trim();
  await Notifications.setNotificationChannelAsync(id, {
    name: id === 'default' ? 'Reminders' : `Reminders (${sound})`,
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    sound,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    enableVibrate: true,
  });
  _knownChannels.add(id);
  return id;
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  if (!_initialised) {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let granted = existing === 'granted';
    if (!granted) {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowSound: true,
          allowBadge: false,
          allowCriticalAlerts: false,
        },
      });
      granted = status === 'granted';
    }
    _initialised = granted;
  }

  // Always make sure the default channel exists; per-clip channels are created lazily.
  await ensureChannel(null);
  return _initialised;
}

export interface ScheduledPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  /** When to fire (absolute). If undefined, fires now. */
  fireAt?: Date;
  /** Optional: speak this text when notification fires (web only). */
  voiceText?: string;
  /** Optional: language code for voice (web only). */
  voiceLang?: 'en' | 'ta';
  /** Optional: custom audio clip filename. On native, used as the OS notification sound. */
  voiceClip?: string | null;
}

export async function scheduleNotification(p: ScheduledPayload): Promise<string> {
  console.log(`[NOTIFY] ${p.title} :: ${p.body} @ ${p.fireAt?.toISOString() ?? 'now'} clip=${p.voiceClip ?? '-'}`);

  if (Platform.OS === 'web') {
    const delay = p.fireAt ? p.fireAt.getTime() - Date.now() : 0;
    const id = `web-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const fire = () => {
      try {
        if (typeof window !== 'undefined' && 'Notification' in window) {
          const w = window as any;
          if (w.Notification.permission === 'default') {
            w.Notification.requestPermission().then(() => {
              if (w.Notification.permission === 'granted') new w.Notification(p.title, { body: p.body });
            });
          } else if (w.Notification.permission === 'granted') {
            new w.Notification(p.title, { body: p.body });
          }
        }
      } catch { /* ignore */ }
      if (p.voiceText && p.voiceLang) speak(p.voiceText, p.voiceLang, p.voiceClip);
    };

    if (delay > 500) {
      const handle = setTimeout(() => { _webTimers.delete(id); fire(); }, delay);
      _webTimers.set(id, handle as unknown as number);
    } else {
      fire();
    }
    return id;
  }

  // --- Native (Android/iOS) ---
  const channelId = await ensureChannel(p.voiceClip);
  const iosSound: string | 'default' =
    Platform.OS === 'ios' && isBundledSound(p.voiceClip) ? (p.voiceClip as string).trim() : 'default';

  const trigger: Notifications.NotificationTriggerInput | null =
    p.fireAt && p.fireAt.getTime() > Date.now() + 500
      ? Platform.OS === 'android'
        ? ({ date: p.fireAt, channelId } as Notifications.NotificationTriggerInput)
        : ({ date: p.fireAt } as Notifications.NotificationTriggerInput)
      : null;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: p.title,
      body: p.body,
      data: p.data ?? {},
      sound: iosSound,
    },
    trigger,
  });
  return id;
}

/** Pending web setTimeout handles, keyed by the id returned from scheduleNotification. */
const _webTimers = new Map<string, number>();

export async function cancelNotification(id: string | null): Promise<void> {
  if (!id) return;
  if (Platform.OS === 'web') {
    const h = _webTimers.get(id);
    if (h !== undefined) {
      clearTimeout(h);
      _webTimers.delete(id);
    }
    return;
  }
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    /* ignore */
  }
}

export async function cancelAll(): Promise<void> {
  if (Platform.OS === 'web') {
    for (const h of _webTimers.values()) clearTimeout(h);
    _webTimers.clear();
    return;
  }
  await Notifications.cancelAllScheduledNotificationsAsync();
}
