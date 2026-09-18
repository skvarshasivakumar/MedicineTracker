import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { Platform } from 'react-native';
import { voiceClips } from './voiceClips';


type QueueItem = () => Promise<void>;
const queue: QueueItem[] = [];
let running = false;

async function pump() {
  if (running) return;
  running = true;
  while (queue.length) {
    const item = queue.shift()!;
    try { await item(); } catch (e) { console.warn('[voice] error', e); }
  }
  running = false;
}

function enqueue(item: QueueItem) {
  queue.push(item);
  void pump();
}

const AUDIO_EXT_OK = ['.wav', '.mp3', '.m4a', '.ogg', '.flac', '.aac'];

/**
 * Speak `text` in `lang` (en/ta), or play an audio clip file if `clipFilename`
 * is provided. Plays serially via the voice queue.
 */
export function speak(text: string, lang: 'en' | 'ta', clipFilename?: string | null): void {
  enqueue(async () => {
    if (Platform.OS === 'web') {
      // Try the bundled custom clip first on web too.
      if (clipFilename && clipFilename.trim()) {
        const ok = await tryPlayClipWeb(clipFilename.trim());
        if (ok) return;
      }
      await speakWeb(text, lang);
      return;
    }
    if (clipFilename && clipFilename.trim()) {
      const ok = await tryPlayClip(clipFilename.trim());
      if (ok) return;
    }
    await new Promise<void>((resolve) => {
      Speech.speak(text, {
        language: lang === 'ta' ? 'ta-IN' : 'en-US',
        rate: 0.95,
        onDone: () => resolve(),
        onStopped: () => resolve(),
        onError: () => resolve(),
      });
    });
  });
}

async function tryPlayClipWeb(filename: string): Promise<boolean> {
  try {
    const source = voiceClips[filename];
    if (!source) {
      console.warn(`[voice] clip "${filename}" not registered in src/services/voiceClips.ts`);
      return false;
    }
    // Asset.fromModule on web returns a URL we can hand to HTMLAudioElement.
    const asset = Asset.fromModule(source);
    await asset.downloadAsync();
    const uri = asset.localUri ?? asset.uri;
    if (!uri) return false;
    const w = globalThis as any;
    const a = new w.Audio(uri);
    a.volume = 1;
    await new Promise<void>((resolve) => {
      a.onended = () => resolve();
      a.onerror = (e: any) => { console.warn('[voice] web clip error', e); resolve(); };
      const p = a.play();
      if (p && typeof p.catch === 'function') {
        p.catch((err: any) => { console.warn('[voice] web clip play() rejected', err); resolve(); });
      }
      setTimeout(resolve, 30000);
    });
    return true;
  } catch (e) {
    console.warn('[voice] tryPlayClipWeb failed', e);
    return false;
  }
}

// ============ WEB TTS ============
let _webUnlocked = false;

/** Warm up the browser speech engine on the first user gesture. */
export function unlockWebSpeech(): void {
  if (Platform.OS !== 'web' || _webUnlocked) return;
  try {
    const w = globalThis as any;
    if (!w.speechSynthesis || !w.SpeechSynthesisUtterance) return;
    // A silent (volume 0) utterance is enough to register the gesture in Chrome.
    const u = new w.SpeechSynthesisUtterance(' ');
    u.volume = 0;
    w.speechSynthesis.speak(u);
    _webUnlocked = true;
    console.log('[voice] web speech unlocked');
  } catch { /* ignore */ }
}

async function speakWeb(text: string, lang: 'en' | 'ta'): Promise<void> {
  const w = globalThis as any;
  if (!w.speechSynthesis || !w.SpeechSynthesisUtterance) {
    console.warn('[voice] web speechSynthesis not available');
    return;
  }
  // Make sure the synth is "warm" — some browsers go to sleep after idle.
  try { w.speechSynthesis.resume?.(); } catch { /* ignore */ }

  // Ensure voices are loaded (some browsers populate them async)
  let voices: any[] = w.speechSynthesis.getVoices?.() ?? [];
  if (voices.length === 0) {
    await new Promise<void>((resolve) => {
      const t = setTimeout(resolve, 500);
      w.speechSynthesis.onvoiceschanged = () => { clearTimeout(t); resolve(); };
    });
    voices = w.speechSynthesis.getVoices?.() ?? [];
  }
  const want = lang === 'ta' ? 'ta-IN' : 'en-US';
  const match = voices.find((v) => v.lang === want)
              ?? voices.find((v) => v.lang?.startsWith(lang))
              ?? voices[0];

  const u = new w.SpeechSynthesisUtterance(text);
  if (match) u.voice = match;
  u.lang = match?.lang ?? want;
  u.rate = 0.95;
  u.volume = 1;
  console.log('[voice] speaking:', text, '| lang:', u.lang, '| voice:', match?.name);

  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    u.onend = finish;
    u.onerror = (e: any) => { console.warn('[voice] utterance error', e?.error); finish(); };
    try {
      w.speechSynthesis.speak(u);
    } catch (e) {
      console.warn('[voice] speak() threw', e);
      finish();
    }
    // Safety: if browser silently drops it, resolve after 8s
    setTimeout(finish, 8000);
  });
}

async function tryPlayClip(filename: string): Promise<boolean> {
  const lower = filename.toLowerCase();
  if (!AUDIO_EXT_OK.some((e) => lower.endsWith(e))) return false;
  try {
    const source = voiceClips[filename];
    if (!source) {
      const path = `${FileSystem.documentDirectory}audio/${filename}`;
      const info = await FileSystem.getInfoAsync(path);
      if (!info.exists) return false;
      const { sound } = await Audio.Sound.createAsync({ uri: path });
      await sound.playAsync();
      await waitForPlayback(sound);
      await sound.unloadAsync();
      return true;
    }
    const asset = Asset.fromModule(source);
    await asset.downloadAsync();
    const { sound } = await Audio.Sound.createAsync(source);
    await sound.playAsync();
    await waitForPlayback(sound);
    await sound.unloadAsync();
    return true;
  } catch (e) {
    console.warn('[voice] clip play failed', e);
    return false;
  }
}

function waitForPlayback(sound: Audio.Sound): Promise<void> {
  return new Promise((resolve) => {
    sound.setOnPlaybackStatusUpdate((st) => {
      if (!('isLoaded' in st) || !st.isLoaded) return;
      if (st.didJustFinish) resolve();
    });
  });
}
