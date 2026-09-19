I've analyzed the code. The most likely cause of your Android 16 crash is a **Reanimated v4 babel plugin misconfiguration**, plus some Android SDK 35+ (edge-to-edge) config gaps. Let me fix these.

## Root causes

1. **Babel plugin is wrong for Reanimated 4** — `babel.config.js` uses `react-native-reanimated/plugin`, but Reanimated **v4** moved the plugin to `react-native-worklets`. Your `package.json` already has `react-native-worklets: 0.10.1`, so we just need to switch it. With a broken plugin, worklets don't compile — `expo-router` / `react-native-screens` navigation crashes as soon as the `Stack` mounts, which perfectly matches your "opens glitched then closes" symptom.
2. **Android 15/16 edge-to-edge not declared** — SDK 35+ (Android 15) enforces edge-to-edge display; Expo SDK 57 needs `android.edgeToEdgeEnabled: true` in `app.json`.
3. **Conflicting Android permissions** — both `SCHEDULE_EXACT_ALARM` and `USE_EXACT_ALARM` listed; Play/OS require only one. `FOREGROUND_SERVICE` listed manually can also conflict with expo plugins that add their own. Removing the manually-listed ones lets the Expo config plugins handle them correctly.
4. **Deprecated notification handler flags** — `shouldShowAlert` was removed in expo-notifications v0.29+, replaced by `shouldShowBanner` + `shouldShowList`. Leaving old flag causes a runtime warning but isn't the crash; still worth cleaning.
5. **`expo-av` import at boot** — deprecated in SDK 54+. Making it lazy prevents a native init failure from taking down the app. 

Replacing 7 lines with 12 lines in 


```

```
Now update `app.json` — declare edge-to-edge and clean permissions: 

Replacing 13 lines with 12 lines in 


```

```
Now clean up the notification handler (remove deprecated `shouldShowAlert`):  

Replacing 9 lines with 8 lines in 


```

```
Now make `expo-av` load lazily so if its native module fails to 

Created 4 todos

link on Android 16, the app still boots (voice clip playback silently falls back to TTS):  

Read , lines 1 to 10

Replacing 45 lines with 62 lines in 


```

```


Checked , , , , no problems found

All four files compile cleanly. Here's what changed and how to rebuild:

## Changes made

| File | Change | Why |
|---|---|---|
| `babel.config.js` | `react-native-reanimated/plugin` → `react-native-worklets/plugin` | **Primary crash fix.** Reanimated v4 moved the Babel plugin package; wrong name silently breaks worklets and crashes `expo-router` at first render on Android. |
| `app.json` | Added `android.edgeToEdgeEnabled: true`; removed `SCHEDULE_EXACT_ALARM` and `FOREGROUND_SERVICE` from manual permissions | Android 15+/16 enforces edge-to-edge. `USE_EXACT_ALARM` alone is enough; `FOREGROUND_SERVICE` is auto-added by `expo-notifications`/`expo-background-fetch`. |
| `notifications.ts` | Removed deprecated `shouldShowAlert` from `setNotificationHandler` | Removed in `expo-notifications` for SDK 54+. |
| `voice.ts` | Lazy-load `expo-av` inside `tryPlayClip`, wrapped in try/catch | `expo-av` is deprecated in SDK 54+; lazy import prevents a broken native module from crashing app boot — clip playback safely no-ops instead. |

## Rebuild steps (mandatory — these are native-side changes)

An OTA `eas update` will **not** fix this; the babel plugin, permissions, and edge-to-edge flag all bake into the native `.apk`.

```powershell
# 1. Clear caches
Remove-Item -Recurse -Force node_modules, .expo, dist -ErrorAction SilentlyContinue
npm install

# 2. Bump versionCode in app.json before rebuilding (e.g. "versionCode": 2)

# 3. Rebuild the APK
eas build --platform android --profile preview --clear-cache
```

The `--clear-cache` flag is important — it forces EAS to recompile the JS bundle with the new babel plugin.

## If it still crashes after this rebuild

Grab the native crash log so we can see the exact stack:

```powershell
adb logcat -c
# now launch the app on the phone, wait for it to crash, then:
adb logcat -d *:E ReactNative:V ReactNativeJS:V AndroidRuntime:E > crash.log
```

Send me `crash.log` and I'll pinpoint the remaining issue.

Starting: *Make expo-av import lazy in voice.ts* (4/4)

Made changes.
