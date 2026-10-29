# mathflash

Expo / React Native (with react-native-web) arithmetic flash-card trainer. One screen: logo, a "constellation" of three flip cards, a number pad or voice input, a session button, and an operation selector. TypeScript throughout.

## Commands

- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — ESLint, `--max-warnings=0`
- `npm test` — Jest (`--runInBand`), tests in `__tests__` folders next to the code
- `npm run web` / `npm start` — dev server

Run typecheck, lint and tests before pushing. Node is pinned to 20.19.4 (`.nvmrc`).

## Product priorities

- Voice entry is the main selling point and must be fast. The app exists so users can time their responses and see their improvement.
- Response-time data (speech onset, final result, processing time, retry and no-speech counts) must be accurate and consistent. Duplicate events or double-counted metrics are bugs, not noise.
- That timing data will later drive suggested custom problem sets, so keep what we record complete and trustworthy. Check any voice or session change against these.
- A response time is how quickly the user began to say a correct answer after the problem was displayed (speech onset, not the end of the utterance or the browser's final result). Delays that belong to the speech engine (recognizer startup, restarts, late final results, mic stalls) are not the user's. Measure them separately and keep them out of the user's time; never let the user pay for them. Safari on iPhone is the worst offender and is a stopgap until the native iOS app.
- Open voice issue and the agreed discussion order: `docs/open-issues-voice-recognition.md`. Read it before any voice or Performance-report work.
- Before handling any new voice or timing situation, read `docs/voice-timing-principles.md` (the decision test and the table of cases handled) and add the new case to its table.
- In code: a voice attempt's `completedAtPerfMs` is the speech-start time. Engine delays are recorded apart as `captureLagMs` (speech start to answer captured) and `recognizerReadyLagMs` (listening wanted to recognizer ready) and `emptyTryMs` (speech reported but no text and no error, taken off the response time) in the performance row's `voiceDiagnostics`.

## Voice debugging (web only)

- Add `?debug=1` to the page URL for a bottom panel with the full speech-event log: Share saves a `.txt` via the phone's share sheet, Copy copies it, Clear resets it. The log header lists the build and active experiments.
- Safari/WebKit workarounds are on by default only in Safari and in every iPhone/iPad browser (they all use Apple's speech engine); Chrome and other browsers keep the plain behavior, because the workarounds made Chrome return empty recognitions. See `isWebKitSpeechEngine` in `src/lib/voiceExperiments.ts`. The two workarounds are holding a microphone stream open for the whole session (stops Safari handing the next recognition a dead mic) and accepting a valid interim number once it has stayed unchanged for 500ms instead of waiting for Safari's slow final result (numbers that could grow longer, such as "four" -> "fourteen", are held 400ms more).
- Experiment switches, only with `debug=1` and combinable: `&keepmic=1|0` and `&fast=N` (`fast=0` is off) override those defaults either way, plus `&delay=N` (min ms between recognizer sessions), `&abort=1` (abort and wait for `end` before restarting) and `&reuse=1` (one reusable recognizer object). The log header shows `webkitSpeechEngine` and the active switches.
- Logs from the iPhone are saved to the Google Drive folder `ClaudeCode`, which appears on the Chromebook at `/mnt/chromeos/GoogleDrive/MyDrive/ClaudeCode/`.

## Layout

- `App.tsx` — root screen
- `src/components/` — UI components (`icons/` holds the logo and operator icons)
- `src/hooks/` — session state, input, voice (`session/`, `ui/`, `voice/`)
- `src/lib/` — pure logic (`MathEngine`, session phases/stats/telemetry, voice normalization) and `CloudSync`
- `src/theme/` — styles and colors

## Theme and colors

- `src/theme/figmaPalette.ts` holds the palette ramps (beige, blue, green, gray, red, status), copied from Figma. Do not change ramp values.
- `src/theme/colors.ts` maps roles to ramp steps. Per-operation roles live in `operationThemes` (`addsub` = blue, `multdiv` = green); neutrals live in `theme`.
- Components read colors from the theme, never raw hex. Add a new role in `colors.ts` rather than reusing an unrelated one (e.g. `selectorFirst` is separate from `logoMath`).

## Visual conventions

- Cards, keys and the answer card are separated by shadow only: no borders, no gradients.
- Brand voice is lowercase ("mathflash", "addition", "ready...", "add!"); actions are Title Case ("Start Session").
- Custom SVG icons live in `src/components/icons/`; don't swap in an icon library.

## Careful areas

- Voice input (`expo-speech-recognition`, `src/hooks/voice/`) and `CloudSync.ts` need a real device or credentials to exercise. Tests cover only the pure parts, so ask before changing behavior there.
- Animations and layout aren't covered by tests; say so when a change affects them.
