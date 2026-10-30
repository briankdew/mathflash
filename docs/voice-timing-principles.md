# Voice response-time principles

Why this exists: the app's value is accurate, consistent response times, which later drive suggested custom problem sets. Browsers and speech engines misbehave in many ways. When a new misbehavior turns up, decide how to handle it with this page, then add it to the table at the bottom.

## What a response time is

The time from the problem being shown to the moment the user **began to say the answer the app accepted**. Not the end of the utterance, not when the browser delivered a result.

## The test for any new situation

Ask, in order:

1. **Whose time is it?** If the user caused it (thinking, stammering, a wrong answer, repeating themselves), it counts. If the speech engine or browser caused it (startup, restarts, late final results, silent failures), it does not.
2. **Can the app tell?** If the browser gives a clear signal (an event with no text and no error, a result that arrives late), act on it. If the app cannot tell a user cause from an engine cause (a stammer versus a dropped answer), do not guess: use the user's side, and record a flag so later analysis can treat it differently.
3. **Is it measured once?** Duplicate events and double-counted metrics are bugs. A late result from an answered utterance must never answer the next problem.
4. **Is the engine's share recorded?** Whatever is taken off the user's time is stored separately (`captureLagMs`, `recognizerReadyLagMs`, `emptyTryMs`), never discarded.
5. **Is it kept to the browser that needs it?** Safari/WebKit workarounds stay Safari-only (`isWebKitSpeechEngine`), so Chrome keeps the behavior that already worked.

## How each browser reports speech (observed 2026-10)

- **Chrome:** `speechstart` fires when it hears sound; text arrives 0.7-2s later. It can report speech and then end with no text and no error. Final results usually arrive. Also fires `speechstart` for noise ("um", coughs).
- **Safari / every iPhone browser:** `speechstart` fires together with the first text. Final results arrive 1.5-3.5s after you start. A second recognition may get a dead microphone unless one is held open. Never produced an empty try in our logs.
- **Neither** gives per-word timestamps on the web, so the app cannot tell when "fourteen" began inside one utterance that started with "four". The native iOS app can.

## Situations and how they are handled

| Situation | Handling | User's time |
|---|---|---|
| Normal answer | Timed from that stretch's `speechstart` | counts |
| Wrong answer, then right answer | Each attempt timed from its own `speechstart` | counts |
| Stammer ("four", then "fourteen") that the browser reports as separate stretches | The accepted stretch's `speechstart` | counts |
| Stammer inside one stretch | Cannot be separated on the web | counts (start of "four") |
| Speech reported, ends with **no text and no error** (empty try) | The stretch's length is added to `emptyTryMs` and subtracted from the response time and the response onset | engine's, taken off |
| Stretch with text, even wrong text | Not an empty try | counts |
| Stretch that ends in an error | Not an empty try (handled by the error paths) | counts |
| Recognizer startup after the problem appears | Recorded as `recognizerReadyLagMs` (from when listening was wanted) | engine's, not charged |
| Safari waits for the final result | Valid interim number accepted after 500ms (900ms if it could grow, e.g. "four" -> "fourteen"); wait recorded as `captureLagMs` | engine's, not charged |
| Late final result after an accepted answer | Ignored | n/a |
| Browser mishears a number ("sex") | Near-miss word list in `voiceNumberNormalization.ts` | counts |
| Browser reports `error network` (speech service lost) | Planned for the new session flow: show "lost speech service", restart listening; the time spent lost is the engine's and is recorded in `rec.error`. Not handled in the current code (it stalls). | engine's |

## Where it lives in code

- `src/hooks/useVoiceAnswerInput.ts`: speech events, empty-try tracking, `submitVoiceAttempt` (builds the attempt).
- `src/hooks/session/sessionPerformanceTracker.ts`: per-problem performance rows and voice diagnostics.
- `src/lib/voiceExperiments.ts`: browser-specific defaults and debug switches.
- Debug log: add `?debug=1`; see `CLAUDE.md`.
