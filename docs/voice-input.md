# Voice Input Build Notes

MathFlash voice input uses `expo-speech-recognition`, which requires a native build.

- Web voice input can run in compatible browsers that support the Web Speech API when the app is served from `localhost` or `https`.
- `Expo Go` is not sufficient for native iOS/Android voice input.
- Use an Expo development build or a full native build.
- After dependency or plugin changes, regenerate the native projects with `npx expo run:ios` or `npx expo run:android`.
