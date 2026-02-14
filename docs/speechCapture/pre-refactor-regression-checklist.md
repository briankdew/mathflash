# Pre-Refactor Regression Checklist

Use this checklist before and after multi-STT changes to confirm baseline behavior remains intact.

## Session and UI

1. App loads without console errors.
2. `Start` begins a session and `End` stops it.
3. Problem counter starts at `0` and increments as problems advance.
4. `Download log` saves a text file with session lines.

## Voice Mode

1. With mic mode on, prompt shows `Say "Begin" to start.` at session start.
2. Saying `Begin` hides prompt and starts the first problem.
3. Spoken numeric answers submit and advance in Learning mode.
4. Empty/non-numeric final recognition events trigger skip handling (per `On error` behavior).

## Typed Mode

1. Toggling to typed mode stops voice recognition.
2. Input accepts numeric content only.
3. Typed number auto-submits and advances in Learning mode.

## Modes and Settings

1. `Mode` switch updates behavior (`Learning` vs `Evaluation` blink flow).
2. `Operation` switch updates equation operator (`+` or `×`).
3. `Missing value` updates visible/hidden operands/result correctly.
4. `On error = skip` counts skipped problems toward session end.
5. Blink on/off and rate changes apply without errors.

## Sanity Timing/Logging

1. `REC` lifecycle lines appear when voice mode is active.
2. `SUBMIT`, `CURR_PROB`/`AUTO-NEXT`, and session start/end lines remain consistent.
