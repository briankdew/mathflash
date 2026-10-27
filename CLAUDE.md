# mathflash

Expo / React Native (with react-native-web) arithmetic flash-card trainer. One screen: logo, a "constellation" of three flip cards, a number pad or voice input, a session button, and an operation selector. TypeScript throughout.

## Commands

- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — ESLint, `--max-warnings=0`
- `npm test` — Jest (`--runInBand`), tests in `__tests__` folders next to the code
- `npm run web` / `npm start` — dev server

Run typecheck, lint and tests before pushing. Node is pinned to 20.19.4 (`.nvmrc`).

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
