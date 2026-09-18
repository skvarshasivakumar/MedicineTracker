/**
 * Auto-generated registry of bundled voice clips.
 *
 * Every audio file in `assets/audio/` (.mp3, .m4a, .wav, .aac, .ogg) is picked
 * up at bundle time via Metro's `require.context`. Drop a file in that folder
 * to register it; delete the file to remove it. No manual edits needed.
 *
 * The key is the bare filename (e.g. `morning_dose.mp3`) — that's what users
 * type in the "Custom voice clip" field of the medicine form.
 *
 * NOTE: Metro evaluates require.context at bundle time, so after adding or
 * removing a file you must restart the dev server (stop & rerun `npx expo start`).
 */

// @ts-ignore — require.context is a Metro/webpack extension, not in TS lib.
const ctx = (require as any).context('../../assets/audio', false, /\.(mp3|m4a|wav|aac|ogg)$/i);

export const voiceClips: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  for (const key of ctx.keys()) {
    // key looks like './yellooooo.m4a' — strip the leading './'
    const name = key.replace(/^\.\//, '');
    out[name] = ctx(key);
  }
  return out;
})();

