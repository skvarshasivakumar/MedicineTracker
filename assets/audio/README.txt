Place audio clips here (.wav .mp3 .m4a .ogg .flac .aac).

After dropping a file in, register it in `src/services/voiceClips.ts`:

  'morning_dose.mp3': require('../../assets/audio/morning_dose.mp3'),

The filename you register is what users enter in the Medicine form's
"Custom voice clip" field, or in Settings → Appointment / Low-stock voice clip.

If no clip is configured (or the file isn't bundled) the app uses Expo's
text-to-speech engine in the user's selected language (English / Tamil).
