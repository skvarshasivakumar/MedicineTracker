# Deploy Medicine Tracker (Expo CLI only)

Fresh, minimal steps. Run everything from the project root:
`C:\Users\skv2\Downloads\Projects\medicinetrackerMobileApp`

Use a **non-proxied network** (home Wi-Fi or mobile hotspot). Corporate proxies drop the upload with `ECONNRESET`.

---

## A. One-time setup (per machine)

1. Install Node 20 LTS: https://nodejs.org
2. Install the EAS CLI:
   ```powershell
   npm install -g eas-cli
   ```
3. Create a free Expo account: https://expo.dev/signup
4. Clear any proxy env vars in the current shell:
   ```powershell
   $env:HTTPS_PROXY=$null; $env:HTTP_PROXY=$null
   $env:https_proxy=$null; $env:http_proxy=$null
   ```
5. Log in:
   ```powershell
   eas login
   ```

---

## B. Deploy the web app (EAS Hosting)

1. Install deps + type-check:
   ```powershell
   npm install
   npx tsc --noEmit
   ```
2. Export the web bundle:
   ```powershell
   Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
   npx expo export --platform web
   ```
3. (Optional) Trim unused icon fonts to shrink the upload:
   ```powershell
   Get-ChildItem dist -Recurse -File -Filter *.ttf |
     Where-Object { $_.Name -notlike "MaterialCommunityIcons*" } |
     Remove-Item -Force
   ```
4. Deploy to production:
   ```powershell
   eas deploy --prod
   ```
5. Answer prompts:
   - Account → `varshask`
   - Configure existing project → **yes**
   - Preview URL → accept default (`medicine-tracker.expo.app`)
6. Command prints the live URL. Open it to verify.
7. Ship future web updates: repeat B2 → B4.

---

## C. Build the Android APK (sideloadable)

Sideload = install the `.apk` directly on a phone without the Play Store.

1. Confirm `app.json` has `expo.android.package` set (currently `com.example.medicinetracker`).
2. Configure EAS build once:
   ```powershell
   eas build:configure
   ```
   Select **Android**. Accept defaults.
3. Ensure `eas.json` has a `preview` profile that produces an APK:
   ```jsonc
   {
     "build": {
       "preview": {
         "distribution": "internal",
         "android": { "buildType": "apk" }
       }
     }
   }
   ```
4. Kick off the cloud build:
   ```powershell
   eas build --platform android --profile preview
   ```
5. Wait for the build URL (10–20 min on the free tier). Download the `.apk` when it turns green.
6. Install on a phone:
   - Copy the APK to the device → tap → allow "install from unknown sources" → Install.
   - Or via USB debugging: `adb install path\to\app.apk`

---

## D. OTA JS-only updates (no rebuild)

For UI or logic tweaks after an APK is installed:

```powershell
eas update --branch production --message "short note"
```

Users pick up the change on next app launch. Native changes (new Expo plugin, permission, icon) still require a fresh `eas build`.

---

## Bump the version before each new APK build

Edit `app.json`:

```jsonc
{
  "expo": {
    "version": "1.0.1",
    "android": { "versionCode": 2 }
  }
}
```

---

## Troubleshooting

- **`ECONNRESET` on `eas deploy` / `eas build`** → proxy or firewall is killing the upload. Switch to a non-proxied network and unset `HTTPS_PROXY` / `HTTP_PROXY` before retrying.
- **`Project ID not configured`** → run `eas init`.
- **APK crashes on launch** → `adb logcat | findstr ReactNative` for the JS error.
- **No notifications on phone** → Settings → Apps → Medicine Tracker → Battery → Unrestricted.

Updated todo list

Great question — there are **two different things** and only one of them is a native "build":

## 1. Web hosting (what `eas deploy` does)

Your app happens to also run in a browser (React Native + React Native Web). To host it as a website you don't build a binary — you just export a folder of HTML/JS/CSS and upload that folder to Expo's CDN.

```powershell
npx expo export --platform web   # produces dist/ (the "build" step, but just JS)
eas deploy --prod                # uploads dist/ to https://medicine-tracker.expo.app
```

- No Android/iOS SDK involved.
- Takes ~30 seconds.
- Result is a URL anyone can open in Chrome/Safari.
- This is what we've been trying (blocked by the proxy).

So yes, there **is** a build here — but it's just a JS/HTML bundle produced by `expo export`. The word "build" in the Expo world usually means the *native* binary below.

## 2. Native binary (what `eas build` does)

To install on an Android phone you need a real `.apk` file. That requires compiling native Java/Kotlin + your JS bundle together.

```powershell
eas build --platform android --profile preview   # cloud build → produces .apk
```

- Runs on Expo's Linux+Android SDK build farm.
- Takes 10–20 min.
- Result is a downloadable `.apk` you install on a phone.

## Which do you actually want?

| Goal | Command | Result |
|---|---|---|
| Share a link people open in a browser | `eas deploy --prod` | `https://medicine-tracker.expo.app` |
| Install on your Android phone | `eas build -p android --profile preview` | `.apk` file |
| Both | Do both |

The medicine tracker uses `expo-notifications`, `expo-sqlite`, and background scheduling. Those **only work fully on a real phone build (`.apk`)**. On the web version, notifications fall back to browser notifications and only fire while the tab is open. So for actual daily use → APK. For a demo link → web.

> Project export: static - exported 1 minute ago
√ Created deployment
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■| 100% Uploading 31 assets
√ Promoted deployment to production

🎉 Your deployment is ready
https://expo.dev/projects/821a83a6-e56f-4f66-8e7f-04983253024b/hosting/deployments