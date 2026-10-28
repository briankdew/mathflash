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

## Voice debugging (web only)

- Add `?debug=1` to the page URL for a bottom panel with the full speech-event log: Share saves a `.txt` via the phone's share sheet, Copy copies it, Clear resets it. The log header lists the build and active experiments.
- Experiments, only with `debug=1` and combinable: `&delay=N` (min ms between recognizer sessions), `&abort=1` (abort and wait for `end` before restarting), `&reuse=1` (one reusable recognizer object), `&keepmic=1` (hold a microphone stream open for the whole session), `&continuous=1` (one recognizer for the whole session, never restarted between problems), `&fast=N` (accept a valid interim number unchanged for N ms instead of waiting for the final result). See `src/lib/voiceExperiments.ts`.
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
