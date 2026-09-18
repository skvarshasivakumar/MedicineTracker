import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { theme } from '@/theme';
import { initDb } from '@/db/database';
import { useUserStore } from '@/stores/userStore';
import { bootSchedulerOnce, startSchedulerHeartbeat } from '@/services/scheduler';
import { ensureNotificationPermission } from '@/services/notifications';
import { unlockWebSpeech, speak } from '@/services/voice';
import { getUser, getEvent, getMedicine, getSettings, getIntroSeen } from '@/db/repo';
import { ConfirmProvider } from '@/components/ConfirmDialog';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import * as Notifications from 'expo-notifications';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const { user, loaded, refresh } = useUserStore();
  const router = useRouter();
  const segments = useSegments();

  // Init DB + load user
  useEffect(() => {
    (async () => {
      try {
        initDb();
        refresh();
        await ensureNotificationPermission();
        await bootSchedulerOnce();
      } catch (e) {
        console.warn('[boot] error', e);
      } finally {
        setReady(true);
      }
    })();
  }, [refresh]);

  // Heartbeat + AppState
  useEffect(() => {
    if (!ready) return;
    const cleanup = startSchedulerHeartbeat();
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'active') {
        void bootSchedulerOnce();
      }
    });
    return () => { cleanup(); sub.remove(); };
  }, [ready]);

  // Web only: unlock SpeechSynthesis on first user gesture so subsequent
  // speak() calls actually produce audio in Chrome/Edge.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = () => {
      unlockWebSpeech();
      window.removeEventListener('pointerdown', handler, true);
      window.removeEventListener('keydown', handler, true);
      window.removeEventListener('touchstart', handler, true);
    };
    window.addEventListener('pointerdown', handler, true);
    window.addEventListener('keydown', handler, true);
    window.addEventListener('touchstart', handler, true);
    return () => {
      window.removeEventListener('pointerdown', handler, true);
      window.removeEventListener('keydown', handler, true);
      window.removeEventListener('touchstart', handler, true);
    };
  }, []);

  // Handle taps on notifications
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      try {
        const data = r.notification.request.content.data;
        if (data?.type === 'dose' || data?.type === 'dose-renotify') {
          router.push('/');
        } else if (data?.type === 'appointment') {
          router.push('/appointments');
        }
      } catch (e) { console.warn('[notif-response]', e); }
    });
    return () => sub.remove();
  }, [router]);

  // Foreground: OS notification fires but TTS/clip needs a JS nudge to play.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationReceivedListener((n) => {
      try {
        const data = n.request.content.data as any;
        const body = n.request.content.body ?? '';
        const u = getUser();
        const lang = u?.language ?? 'en';
        let clip: string | null = null;
        if (data?.type === 'dose' || data?.type === 'dose-renotify') {
          const eventId = data.eventId as number | undefined;
          if (eventId != null) {
            const ev = getEvent(eventId);
            const med = ev ? getMedicine(ev.medicine_id) : null;
            clip = med?.voice_clip ?? null;
          }
        } else if (data?.type === 'appointment') {
          clip = getSettings().appointment_voice_clip || null;
        }
        // When a custom clip is attached the OS notification channel already plays it.
        // Only fall back to TTS when no clip is configured, to avoid double audio.
        if (!clip) speak(body, lang, null);
      } catch (e) { console.warn('[notif-received]', e); }
    });
    return () => sub.remove();
  }, []);

  // Onboarding gate
  useEffect(() => {
    if (!ready || !loaded) return;
    try {
      const first = segments[0];
      const inOnboarding = first === 'onboarding';
      const inWelcome = first === 'welcome';
      if (!user) {
        let introSeen = false;
        try { introSeen = getIntroSeen(); } catch (e) { console.warn('[intro-check]', e); }
        if (!introSeen && !inWelcome) {
          router.replace('/welcome');
        } else if (introSeen && !inOnboarding && !inWelcome) {
          router.replace('/onboarding');
        }
      } else if (inOnboarding || inWelcome) {
        router.replace('/');
      }
    } catch (e) { console.warn('[onboarding-gate]', e); }
  }, [ready, loaded, user, segments, router]);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <ConfirmProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="welcome" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="medicine/[id]" options={{ presentation: 'modal' }} />
              <Stack.Screen name="medicine/new" options={{ presentation: 'modal' }} />
              <Stack.Screen name="appointment/[id]" options={{ presentation: 'modal' }} />
              <Stack.Screen name="appointment/new" options={{ presentation: 'modal' }} />
            </Stack>
          </ConfirmProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
