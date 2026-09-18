# Medicine Tracker — React Native (Expo)

A React Native port of the Python/Kivy Medicine Tracker app, implementing every feature listed in `FEATURES.md`. Built with **Expo SDK 51 + TypeScript**, **React Native Paper** (Material 3), **expo-sqlite**, **expo-notifications**, **expo-speech**, **expo-av**, and **expo-router**.

## Quick start

```powershell
cd c:\Users\skv2\Downloads\frontend\medicinetrackerMobileApp
npm install
npx expo start
```

Then:
- Press **a** for Android (USB device or emulator running)
- Press **i** for iOS (macOS + Xcode required)
- Or scan the QR code in **Expo Go** on your phone

### First-time Android setup

If you don't already have an Android dev environment, install **Android Studio** and a virtual device, or just install **Expo Go** from the Play Store and scan the QR code (everything in this app works in Expo Go *except* exact-alarm scheduling on Android 13+, which only kicks in for production builds).

## Feature mapping (FEATURES.md → code)

| # | Feature | Files |
|---|---|---|
| 1 | Onboarding wizard with first medicine | [app/onboarding.tsx](app/onboarding.tsx), [src/components/MedicineForm.tsx](src/components/MedicineForm.tsx) |
| 2 | Home screen (reminders + appointments, 10 + "show more") | [app/(tabs)/index.tsx](app/(tabs)/index.tsx), [src/components/EventCard.tsx](src/components/EventCard.tsx), [src/components/AppointmentCard.tsx](src/components/AppointmentCard.tsx) |
| 3 | Medicine CRUD | [app/(tabs)/medicines.tsx](app/(tabs)/medicines.tsx), [app/medicine/new.tsx](app/medicine/new.tsx), [app/medicine/[id].tsx](app/medicine/[id].tsx) |
| 4 | Scheduler (plan/catch-up/renotify) | [src/services/scheduler.ts](src/services/scheduler.ts) |
| 5 | Took / Skip / Later actions | [src/services/scheduler.ts](src/services/scheduler.ts), [app/(tabs)/index.tsx](app/(tabs)/index.tsx) |
| 6 | Stock management (refill / set / auto-decrement / low-stock alert) | [app/(tabs)/stock.tsx](app/(tabs)/stock.tsx), [src/services/scheduler.ts](src/services/scheduler.ts) |
| 7 | Doctor appointments | [app/(tabs)/appointments.tsx](app/(tabs)/appointments.tsx), [app/appointment/new.tsx](app/appointment/new.tsx), [app/appointment/[id].tsx](app/appointment/[id].tsx) |
| 8 | Voice alerts (serial queue + custom clip + TTS) | [src/services/voice.ts](src/services/voice.ts), [src/services/voiceClips.ts](src/services/voiceClips.ts) |
| 9 | Desktop / device notifications | [src/services/notifications.ts](src/services/notifications.ts) |
| 10 | Caregiver email alerts | [src/services/email.ts](src/services/email.ts) |
| 11 | Settings | [app/(tabs)/settings.tsx](app/(tabs)/settings.tsx) |
| 12 | i18n (en/ta) | [src/i18n.ts](src/i18n.ts) |
| 13 | SQLite + migrations | [src/db/database.ts](src/db/database.ts), [src/db/repo.ts](src/db/repo.ts), [src/db/types.ts](src/db/types.ts) |
| 14 | UI / theme | [src/theme.ts](src/theme.ts), [src/components/Header.tsx](src/components/Header.tsx) |

## Architectural notes — differences from the Python version

### Email (caregiver alerts)
The Python app uses Gmail SMTP directly. Mobile apps can't ship Gmail credentials safely (and Apple/Google block raw SMTP from background contexts). The mobile app supports two paths, with the better one first:

1. **Resend HTTP API (recommended).** Paste a Resend API key + a verified sender email in **Settings**. Caregiver alerts and the "Send test email" button send silently via HTTPS. Any provider with an HTTP send endpoint (SendGrid, Mailgun, Postmark, AWS SES, etc.) can be dropped into [src/services/email.ts](src/services/email.ts) the same way.
2. **expo-mail-composer fallback.** If no API key is configured, the app opens the device's default mail composer pre-filled with the alert so the user / caregiver can tap Send.

### Scheduler
The Python app uses APScheduler in a daemon thread. The RN equivalent uses:
- **expo-notifications** scheduled at the OS level (survives app being killed).
- An in-app **heartbeat** (`startSchedulerHeartbeat`) that re-plans hourly and runs renotify sweeps every 5 minutes while the app is open.
- A **catch-up** pass on every app launch / foreground — overdue events get an OS notification + voice alert immediately, staggered 5 s apart.

True background re-notify when the app is fully terminated is not 100% reliable on iOS — Apple intentionally throttles background work. The OS notification still fires reliably; the renotify chain catches up the moment the user opens the app.

### Voice
- `expo-speech` provides TTS in Tamil (`ta-IN`) and English (`en-US`).
- `expo-av` plays bundled or filesystem audio clips.
- All voice playback runs through a serial queue ([src/services/voice.ts](src/services/voice.ts)) — no overlapping audio, matching the Python `pyttsx3` behaviour.
- Drop clips in [assets/audio/](assets/audio/) and register them in [src/services/voiceClips.ts](src/services/voiceClips.ts).

### Database
- Single-file SQLite via `expo-sqlite` (sync API → mirrors the Python `sqlite3` flow).
- Schema is created with `CREATE TABLE IF NOT EXISTS` on every launch; foreign keys + `ON DELETE CASCADE` enforced via `PRAGMA foreign_keys = ON`.

## Project structure

```
app/                              ← expo-router pages
  _layout.tsx                     ← root layout: DB init, scheduler boot, onboarding gate
  (tabs)/                         ← bottom tab navigator
    _layout.tsx
    index.tsx                     ← Home
    medicines.tsx
    stock.tsx
    appointments.tsx
    settings.tsx
  medicine/new.tsx
  medicine/[id].tsx
  appointment/new.tsx
  appointment/[id].tsx
  onboarding.tsx
src/
  db/
    database.ts                   ← schema + migrations
    repo.ts                       ← typed CRUD helpers
    types.ts
  services/
    notifications.ts              ← expo-notifications wrapper
    voice.ts                      ← serial TTS + audio queue
    voiceClips.ts                 ← require() map for bundled clips
    email.ts                      ← Resend HTTP / mail composer
    scheduler.ts                  ← planning + renotify + action handlers
  components/
    Header.tsx
    MedicineForm.tsx
    EventCard.tsx
    AppointmentCard.tsx
    AppointmentForm.tsx
  stores/
    userStore.ts                  ← Zustand store for current user
  utils/date.ts
  i18n.ts                         ← English + Tamil strings
  theme.ts                        ← MD3 Deep Purple / Amber
assets/
  audio/                          ← drop voice clips here
```

## Building for production

```powershell
# Install EAS once
npm i -g eas-cli
eas login

# Configure for first build
eas build:configure

# Android APK / AAB
eas build -p android --profile preview

# iOS (needs Apple Developer account)
eas build -p ios --profile preview
```

After a production build, the OS-scheduled notifications fire reliably even if the app is killed.
