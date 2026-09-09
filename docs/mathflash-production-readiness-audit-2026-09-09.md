Assessment completed read-only. No files, dependencies, settings, or Git state were changed. Findings below distinguish source evidence from behavior that still needs runtime verification.

Git state:

- **Branch:** `main`, tracking `origin/main`.
- **Latest commit:** `be559249edbe472afddcc555b7027957735ef3ee` — “Pin GitHub Pages deployment tool,” September 8, 2026, 17:27:01 EDT.
- **Working tree:** **not clean** because [mathflash-current-state.md](/home/briankdew/linux_projects/mathflash/mathflash-current-state.md) is untracked. No tracked modifications or staged changes were reported. This state was unchanged after inspection.
- Remote freshness was not checked; no fetch was performed.

The application is a single-screen **Expo/React Native TypeScript app**, shared across web, iOS, and Android.

| Area | Current responsibility and evidence |
|---|---|
| Entry points | [package.json](/home/briankdew/linux_projects/mathflash/package.json:4) selects `index.ts`; [index.ts](/home/briankdew/linux_projects/mathflash/index.ts:1) initializes gesture handling and calls `registerRootComponent(App)`. All platforms use this entry. No separate mobile/web application or router is present. |
| Application composition | [App.tsx](/home/briankdew/linux_projects/mathflash/App.tsx:23) loads bundled fonts and assembles the header, practice area, dashboard, and performance sheet. |
| UI components | [src/components](/home/briankdew/linux_projects/mathflash/src/components) contains the problem constellation, keypad, settings, operation selector, session report, and SVG icons. |
| Session orchestration | [useMathSession.ts](/home/briankdew/linux_projects/mathflash/src/hooks/useMathSession.ts:52) coordinates problem queues, input, feedback phases, statistics, voice recognition, and end-of-session logging. State transitions live in [sessionState.ts](/home/briankdew/linux_projects/mathflash/src/hooks/session/sessionState.ts:75). |
| Domain logic | [src/lib](/home/briankdew/linux_projects/mathflash/src/lib) separates problem generation, answer evaluation, settings, progression, performance reporting, telemetry, and speech normalization. [MathEngine.ts](/home/briankdew/linux_projects/mathflash/src/lib/MathEngine.ts:7) generates arithmetic families using operands 1–9, with tens/doubles/squares sets and missing-value variants. |
| Presentation | [src/theme](/home/briankdew/linux_projects/mathflash/src/theme) contains colors, a Figma-derived palette, and styles; [src/hooks/ui](/home/briankdew/linux_projects/mathflash/src/hooks/ui) handles dashboard motion and answer feedback. [assets](/home/briankdew/linux_projects/mathflash/assets) contains fonts, icons, and image assets. |
| Persistence/network | Session state and the last report remain in memory. AsyncStorage holds failed telemetry deliveries; [CloudSync.ts](/home/briankdew/linux_projects/mathflash/src/lib/CloudSync.ts:27) posts reports to an external Google Apps Script endpoint. No active server or authentication implementation was found. |

A static trace from `index.ts` reached **40 local source modules**, including every non-test module under `src`. It found no missing relative imports/assets and no archive references. Assets declared in `app.json` also exist.

Dependency versions are recorded in [package.json](/home/briankdew/linux_projects/mathflash/package.json:18) and the version-3 [package-lock.json](/home/briankdew/linux_projects/mathflash/package-lock.json). All direct installed package versions match their lockfile entries; the lockfile’s root declarations match the manifest.

| Package | Declared → locked version |
|---|---|
| `expo` | `~55.0.31` → `55.0.31` |
| `react`, `react-dom` | Each `19.2.0` → `19.2.0` |
| `react-native` | `0.83.10` → `0.83.10` |
| `react-native-web` | `^0.21.0` → `0.21.2` |
| `@expo/metro-runtime` | `~55.0.12` → `55.0.12` |
| `expo-dev-client` | `~55.0.40` → `55.0.40` |
| `expo-font`, `expo-status-bar` | `~55.0.8` → `55.0.8`; `~55.0.6` → `55.0.6` |
| `expo-speech-recognition` | `^3.1.1` → `3.1.1` |
| AsyncStorage, native picker | `2.2.0` → `2.2.0`; `^2.11.4` → `2.11.4` |
| Gesture Handler | `~2.30.0` → `2.30.1` |
| Reanimated, Worklets, SVG | Exact `4.2.1`, `0.7.4`, `15.15.3` |
| `@expo/vector-icons` | `^15.0.2` → `15.1.1` |
| TypeScript | `~5.9.2` → `5.9.3` |
| Babel preset | `~55.0.5` → `55.0.17` |
| ESLint, Expo ESLint config | `^9.39.1` → `9.39.1`; `~55.0.1` → `55.0.1` |
| Jest, Jest Expo | `^29.7.0` → `29.7.0`; `~55.0.22` → `55.0.22` |
| Testing Library: React Native, Jest Native | `^13.3.3` → `13.3.3`; `^5.4.3` → `5.4.3` |
| `react-test-renderer` | `^19.2.0` → `19.2.0` |
| `@types/react`, `@types/jest` | `~19.2.2` → `19.2.14`; `^29.5.14` → `29.5.14` |
| `gh-pages` | `^6.3.0` → `6.3.0` |

Runtime/toolchain declarations:

- Node: **`>=20.19.4 <21`**, with **`20.19.4`** selected by [.nvmrc](/home/briankdew/linux_projects/mathflash/.nvmrc:1). The inspected shell actually resolves **Node `18.20.4`**, outside that range.
- EAS CLI: **`>=18.0.6`**, with remote app-version management. [eas.json](/home/briankdew/linux_projects/mathflash/eas.json:2)
- App/package version: **`1.0.0`**. No package-manager version, project-specific Java/Xcode/Gradle version, or EAS build image is explicitly pinned in root configuration.

Build and deployment configuration is partly established:

- Development scripts run `expo start`, including `--web`, `--ios`, and `--android`. They are launch commands; there are **no package scripts for production build, web export, or deployment**. Babel uses `babel-preset-expo`; no custom Metro configuration exists. [package.json](/home/briankdew/linux_projects/mathflash/package.json:8), [babel.config.js](/home/briankdew/linux_projects/mathflash/babel.config.js:1)
- Web assets are configured for **`/mathflash`** through `expo.experiments.baseUrl`. Existing ignored [dist/index.html](/home/briankdew/linux_projects/mathflash/dist/index.html) references a Metro web bundle at that prefix. This establishes an existing export artifact, not proof that it matches HEAD or is currently deployed. [app.json](/home/briankdew/linux_projects/mathflash/app.json:30)
- GitHub Pages tooling is installed and locked, but no tracked CI workflow or deployment procedure establishes the published branch, destination, or release verification.
- EAS has internal development-client and preview profiles, plus production auto-increment and an empty production submission profile. An EAS project ID and iOS bundle identifier are configured; **`android.package` is absent**. Generated `ios/` and `android/` directories are absent and ignored. [eas.json](/home/briankdew/linux_projects/mathflash/eas.json:6), [app.json](/home/briankdew/linux_projects/mathflash/app.json:14), [.gitignore](/home/briankdew/linux_projects/mathflash/.gitignore)
- No explicit OTA update URL/runtime version or platform build-image selection is configured.

Speech recognition is integrated into the active practice flow:

- [expoSpeechRecognitionAdapter.ts](/home/briankdew/linux_projects/mathflash/src/lib/expoSpeechRecognitionAdapter.ts:40) wraps `expo-speech-recognition` availability, permissions, start/stop, and event listeners.
- [useVoiceAnswerInput.ts](/home/briankdew/linux_projects/mathflash/src/hooks/useVoiceAnswerInput.ts:85) handles recognition lifecycle and availability, including secure-origin checks on web. Recognition uses `en-US`, interim results, one alternative, noncontinuous sessions, contextual number hints, and on-device recognition when reported supported.
- Results are normalized from digits or English number words. Accepted ranges vary by operation and missing slot; invalid/ambiguous values trigger retry feedback. [voiceNumberNormalization.ts](/home/briankdew/linux_projects/mathflash/src/lib/voiceNumberNormalization.ts:131)
- The hook restarts recognition after 220 ms and can submit the last valid interim result 250 ms after `speechend`. It records speech timing, processing metrics, and raw transcript text. [useVoiceAnswerInput.ts](/home/briankdew/linux_projects/mathflash/src/hooks/useVoiceAnswerInput.ts:239)
- [useMathSession.ts](/home/briankdew/linux_projects/mathflash/src/hooks/useMathSession.ts:239) arms listening during answer entry; [PracticeArea.tsx](/home/briankdew/linux_projects/mathflash/src/components/PracticeArea.tsx:162) submits pending voice attempts into normal answer evaluation. The [ControlDashboard](/home/briankdew/linux_projects/mathflash/src/components/ControlDashboard.tsx:129) exposes mode selection and status; switching modes is disabled during sessions.
- Native permission messages are configured through the Expo plugin. Repository notes specify a development/full native build for voice, and compatible Web Speech browsers on localhost/HTTPS for web. [app.json](/home/briankdew/linux_projects/mathflash/app.json:41), [docs/voice-input.md](/home/briankdew/linux_projects/mathflash/docs/voice-input.md:3)

Quality tooling exists, but this assessment does not establish passing results:

- **Tests:** Jest with `jest-expo/node`, React Native Testing Library, and archive exclusions. There are **10 test files containing 30 static test declarations**, covering math, options, progression, evaluation, report aggregation, reducers, settings, and the measurement overlay. Coverage collection patterns exist, but no coverage threshold or default coverage run is configured. [jest.config.cjs](/home/briankdew/linux_projects/mathflash/jest.config.cjs:1)
- **Coverage gaps:** No dedicated tests were found for `CloudSync`, the speech adapter/hook lifecycle, the full session hook, or browser/native end-to-end flows.
- **Lint:** Expo’s flat ESLint config, exhaustive hook dependencies treated as errors, and zero allowed warnings. [eslint.config.js](/home/briankdew/linux_projects/mathflash/eslint.config.js:1)
- **Types:** Expo base configuration with `strict` and `isolatedModules`; script uses `tsc --noEmit`. [tsconfig.json](/home/briankdew/linux_projects/mathflash/tsconfig.json:1)
- **Formatting:** No project formatter script or dedicated Prettier/EditorConfig configuration was found.
- Builds, tests, lint, type-checking, vulnerability checks, microphone sessions, and external endpoint checks were **not run**.

Inactive and experimental material is clearly separated:

- Ignored, untracked [archive](/home/briankdew/linux_projects/mathflash/archive) contains the former HTML app, Express/Multer server, speech-capture tooling, Web Speech/Whisper/Vosk adapters, logs, and `whisper.cpp`. These are **not on the active import path**. Their dependencies and deployment assumptions do not describe the current app.
- `dist/`, `.expo/`, and `node_modules/` are local generated/dependency areas.
- The measurement overlay is active development tooling, gated by `__DEV__` in both rendering and settings. [App.tsx](/home/briankdew/linux_projects/mathflash/App.tsx:204), [SettingsPanel.tsx](/home/briankdew/linux_projects/mathflash/src/components/SettingsPanel.tsx:313)
- [docs/alpha-testing-prep.md](/home/briankdew/linux_projects/mathflash/docs/alpha-testing-prep.md:20) is an informal backlog, including mobile-browser layout, historical reporting, and login. It is not evidence that those features exist.

1. **Current-state summary**

   mathflash™ has a coherent shared Expo application, separated UI/domain/session modules, integrated speech input, and basic quality tooling. Static imports and configured assets resolve, and direct dependencies match the lockfile. Production readiness remains unverified, particularly around telemetry delivery, native releases, speech behavior, and deployment reproducibility.

2. **Production-readiness concerns, roughly ranked**

   - **High — Telemetry delivery can silently fail or duplicate.** Web `no-cors` requests provide no acceptance confirmation before queue deletion. A partial batch failure requeues already-sent entries; overlapping saves are not serialized. Retries occur only on subsequent saves, with no timeout or queue limit. [CloudSync.ts](/home/briankdew/linux_projects/mathflash/src/lib/CloudSync.ts:50)
   - **High — Telemetry destination and data handling need verification.** Blank/missing environment configuration falls back to a hardcoded endpoint, making the `disabled` branch effectively unreachable through an empty setting. Reports include raw recognition transcripts; the active UI exposes no telemetry opt-out. Endpoint ownership, acceptance, access, and retention are not established here. [appConfig.ts](/home/briankdew/linux_projects/mathflash/src/lib/appConfig.ts:1), [sessionPerformanceTracker.ts](/home/briankdew/linux_projects/mathflash/src/hooks/session/sessionPerformanceTracker.ts:130), [sessionTelemetry.ts](/home/briankdew/linux_projects/mathflash/src/lib/sessionTelemetry.ts:120)
   - **High for local verification — Node mismatch.** The current shell is below both the repository’s declared range and locked React Native/Metro requirements. [package.json](/home/briankdew/linux_projects/mathflash/package.json:5), [package-lock.json](/home/briankdew/linux_projects/mathflash/package-lock.json)
   - **Medium–high — Release configuration is incomplete or externally dependent.** Android identity is missing; native credentials/submission readiness and the actual Pages publishing setup remain unverified. No tracked automated release/check pipeline exists.
   - **Medium — Speech lifecycle lacks integration evidence.** Real-device permissions, interruptions, delayed final results, interim fallback, and recovery require testing beyond the existing reducer/normalization tests. [useVoiceAnswerInput.ts](/home/briankdew/linux_projects/mathflash/src/hooks/useVoiceAnswerInput.ts:474)
   - **Medium — Font failures can leave a blank application.** `App` ignores the font-loading error result and returns `null` until fonts load. [App.tsx](/home/briankdew/linux_projects/mathflash/App.tsx:35)
   - **Medium, depending on release expectations — Settings/history are not durable.** Session settings and the last report live in React state; durable historical retrieval is absent. Mobile-browser viewport behavior is also explicitly awaiting verification in the alpha tracker. [sessionState.ts](/home/briankdew/linux_projects/mathflash/src/hooks/session/sessionState.ts:75), [alpha-testing-prep.md](/home/briankdew/linux_projects/mathflash/docs/alpha-testing-prep.md:22)

3. **Recommended next inspection/verification steps**

   - Establish a verification environment matching the declared Node version, then record type-check, lint, and test results.
   - Verify the deployed Pages artifact and `/mathflash` asset paths against HEAD; inspect EAS build history, Android identity, and release configuration.
   - Exercise complete keypad and voice sessions across target browsers and native builds, including denial, interruption, retries, and session resets.
   - Trace telemetry receipt end to end, including offline recovery, partial failures, concurrent saves, and transcript storage.
   - Check font-failure behavior, mobile safe areas, accessibility, and expectations for persistent settings/history.