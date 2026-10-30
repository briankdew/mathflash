# Timing core design (draft, 2026-10-29)

Status: **approved 2026-10-29** with D1-D3 as recommended and voice input built for numbers only (section 6a). Read with `docs/voice-timing-principles.md`. This replaces the voice, session-flow and performance-recording code; the UI, math engine, number normalization and settings stay.

## For the owner (summary)

- **Goal:** consistent response times, first across sessions on one device, then across devices. Shown in seconds to 0.1.
- **How:** the app writes down everything that happens (card shown, speech heard, text returned, answer accepted) with exact times, and one separate piece of code works out the response times from that record afterwards. Every browser quirk becomes a rule in one place, testable with your real logs.
- **Next card right away:** on Safari, one recognizer listens for the whole session instead of restarting for every card (your 13:25 and 13:36 iPhone logs show this works; it only failed because the old code ignored the answers). That removes the restart gap between cards.
- **Built alongside:** the new core runs only with `?core=2` until it has proven itself. Your students keep the current version.
- **Numbers only:** voice input is designed around spoken numbers alone, which lets the app pick the best of several guesses and repair split numbers (section 6a).
- **Decisions (approved):** D1-D3 at the end.

## 1. Goals and non-goals

1. A response time = problem visibly shown -> user began the answer the app accepted (principles doc).
2. Consistency over absolute accuracy. A steady engine delay is tolerated and recorded; a varying one is removed from the user's time where the app can tell, recorded either way.
3. Next card can appear immediately after an answer (evaluation pace); a paced learning mode must be addable later.
4. Keypad and voice go through the same scorer.
5. Times are stored in milliseconds; everything shown to people is in seconds to 0.1.
6. The web build must keep working on Chrome (Chromebook, Android) and Safari (iPhone). The native app later reuses the record and scorer unchanged.
7. Not in scope now: user logins, stored history, cloud sync changes, a paid or downloaded recognizer.

## 2. Layers

```
Instruments  ->  Session record  ->  Scorer  ->  Report / export
(browser, mic,    (append-only list   (pure      (Performance sheet,
 screen, keypad)   of timed events)    function)  Share file, log script)
        ^                                  |
        |__________ Session flow __________|
                  (state machine: what is on screen, when to listen,
                   when to advance; reads only "answer accepted")
```

- **Instruments** only report what happened, with a time. They make no timing decisions.
- **Session record** is the single source of truth for a session. The debug panel, the Share file and the report are all views of it.
- **Scorer** is a pure function `score(record) -> rows`. No browser code, so it runs in tests and in the log script. It has a version number; changing a rule bumps it, and old records can be rescored.
- **Session flow** decides what the user sees. It needs only "an answer was accepted for problem P" from the voice side, not timings.

## 3. Session record

One clock for everything: `performance.now()` milliseconds. Where the browser gives its own event time (`Event.timeStamp`, same clock on modern browsers) it is stored as well, because it is when the browser created the event rather than when our code got around to it.

Every event: `{ seq, t, browserT?, kind, ...fields }`.

| kind | fields | notes |
|---|---|---|
| `session.started` | device, browser, engine (`webkit` / `chrome` / `native`), build, experiments, settings, input mode, pace | the header of every export |
| `problem.shown` | problemId, index, spec (left, right, result, missing, correct) | `t` = first frame the card is drawn (two animation frames after the update), not when the state changed |
| `problem.left` | problemId, reason (answered, ended, reset) | |
| `rec.requested` / `rec.started` / `rec.ended` | recId, continuous | `recId` = a new number per browser recognizer object |
| `rec.speechstart` / `rec.speechend` | recId | Safari: arrives with first text |
| `rec.result` | recId, resultIndex, text, isFinal | only the newest piece of text, never the whole running transcript |
| `rec.error` | recId, code | `aborted` and `busy` kept in the record, ignored by the flow |
| `audio.onset` / `audio.offset` | level, noiseFloor | only with the onset-detector experiment (section 7) |
| `key.digit` / `key.clear` / `key.submit` | digit | keypad |
| `answer.accepted` | problemId, value, via (`final`, `stable`, `speechend`, `end`, `keypad`), recId, resultSeq | the voice/keypad side's claim; the scorer re-derives timing from the raw events |
| `answer.checked` | problemId, value, correct | |

Because every recognizer event carries its `recId`, a late `end` or result from an old recognizer can never be mistaken for the current one (the leftover-event risk in the code assessment).

## 4. Scorer rules

### 4.1 Utterances

An **utterance** is one stretch of speech: from its onset to its end. Its onset is, in order of preference, whatever this session has available for **every** problem (one source per session, never mixed, so sessions compare like with like):

1. `audio.onset` from our own detector (when enabled and healthy for the whole session);
2. `rec.speechstart` (Chrome);
3. the arrival of the utterance's first text (Safari; continuous mode, which gives no per-utterance `speechstart`).

The record and report name the source used (`onsetSource`).

### 4.2 Which problem an utterance belongs to

The problem that was on screen **when the utterance began**. A late final result for answer N that arrives after card N+1 appeared belongs to N and is ignored for N+1. This replaces the 5-second "ignore late results" timer.

### 4.3 Response time per attempt

- Each `answer.accepted` is an attempt. Its utterance is the one whose text was accepted.
- **Response time** = attempt's onset - `problem.shown`.
- **Before the accepted utterance**, a problem can have utterances that returned no text (Unrecognized) or only a fragment that is not a number and not a different complete answer ("if", "teen"). Rule D1 decides how they are treated (see Decisions; recommended: the response starts at the first of them).
- An utterance whose text was a different valid number is a separate wrong attempt, never merged.

### 4.4 Per-problem row

- `firstResponseMs` (first attempt, right or wrong) and `correctResponseMs` (the accepted correct attempt), both kept. Today only the first is stored.
- Outcome (`correct_first_try`, `wrong_then_correct`, `wrong_only`, `no_answer`), attempts with their values.
- Engine shares, each measured once: `captureLagMs` (onset -> answer accepted), `startupLagMs` (recognizer asked for -> started, each restart measured from the previous `rec.ended`), `notListeningMs` (onset before the recognizer had started; only knowable with the detector).
- Counts for this problem only: utterances, Unrecognized, fragments, restarts, errors by code. Today these are session totals.
- `onsetSource`, `scorerVersion`.

### 4.5 Session summary

Median and spread (middle half) of response time and of capture lag, per input mode and onset source. These are the consistency numbers. No problem is excluded from any average.

## 5. Session flow

A small reducer (state machine) with explicit states: `idle -> preparing -> showing(P) -> feedback(P) -> showing(P+1) ... -> done`.

- **Pace** is a setting. *Evaluation* (default once D2 is agreed): on an accepted answer the next card appears at once and the correct/wrong feedback plays over the change (the "pile" moment). *Learning* (later): a pause after each answer.
- **Wrong answers:** per D2.
- **Listening** is a session-level resource, not per problem:
  - **Safari / WebKit:** one continuous recognizer for the whole session, with the held microphone. If it ends on its own (silence, time limit) it is restarted at once; that restart is recorded and its time is the engine's.
  - **Chrome:** keeps today's known-good behavior (a new recognizer per card, no held mic), started as soon as the previous answer is accepted so it is ready by the time the next card is drawn. Continuous mode on Chrome is an experiment switch (`&continuous=1`) to compare, because it is untested there.
- The accept rules carry over unchanged: Safari accepts a stable number after 0.5 s (0.9 s if it could grow, "four" -> "fourteen"); Chrome accepts a final result, or the last interim 0.25 s after `speechend`.
- The first card no longer includes the 0.22 s fade in its time: `problem.shown` is taken when the card is fully visible.

## 6. Instruments

- **Web recognizer:** our own thin wrapper around the browser's speech API (extending `src/lib/webSpeechRecognizer.ts`) instead of going through the library on web. It gives us `recId`, `Event.timeStamp`, `resultIndex`, and listeners that are really removed. The library stays for the native app.
- **Screen:** the card reports when it is drawn (two animation frames after the update).
- **Keypad:** digit times as now, taken in the press handler.
- Instruments push events into the record and nothing else.

## 6a. Number-only voice input (owner decision, 2026-10-29)

Voice input accepts spoken numbers only. Browsers do not let a web page restrict the recognizer to a vocabulary, so on the web this is done by choosing and repairing what comes back; the native app and a future on-device recognizer can restrict the engine itself.

1. **Several guesses, first valid number wins.** Ask the browser for up to 5 alternatives per result (`maxAlternatives`) and take the first that is a valid number in the problem's answer range. Recorded: which alternative was used. Chrome supports this; Safari may return only one, which then behaves as today.
2. **Split numbers are joined.** When consecutive utterances on one problem are fragments that together form a valid number ("if" + "teen" -> fifteen), they are treated as one answer starting at the first fragment, like the near-miss list ("sex" -> 6). The raw pieces are always kept in the record; nothing is shown as said that the engine did not return.
3. **Near-miss list and range check** stay as they are (`voiceNumberNormalization.ts`).
4. **Native app:** pass the problem's possible answers as recognition hints (`contextualStrings`, already built by `buildVoiceContextualStrings`) and prefer on-device recognition.
5. **Research item (after the alpha):** a free on-device recognizer restricted to number words, judged by the size-versus-effectiveness test (download size, speed on an older iPhone, accuracy on students' answers). Because the scorer only reads events, a new engine is one more instrument.
6. Consequence: no spoken commands ("skip", "next") in voice mode.

## 7. Onset detector (experiment, `&vad=1`)

- Reads the sound level from the held microphone (Web Audio, in small frames timed on the audio clock), learns the room's noise level in the first second, and marks an onset when the level stays clearly above it for about 60 ms.
- Logged only at first, beside `speechstart`, so we can measure how far apart and how steady the two are on each device. It becomes the onset source only if the data says it is steadier.
- Chrome risk: holding a mic stream once made Chrome return empty recognitions. The experiment tests whether a stream used only for measuring does the same.
- Later, the same level readings can drive the background-noise message you suggested.

## 8. Calibration warm-up (later, optional)

A few "read this digit aloud" cards before a session. Their median response becomes a baseline for that device and session, stored beside the times (not subtracted by default). How often it is offered becomes a setting.

## 9. Report and export

- **Share session data** (`?debug=1` for now): one file with the session record and the scored rows (JSON), plus the readable log. `scripts/summarize-voice-logs.mjs` reads it.
- **Performance sheet** (owner's troubleshooting view, preliminary): one line per problem in seconds (problem, outcome, response, first speech, capture lag, startup lag, Unrecognized, fragments), flags on rows where 4.3 applied, and the session consistency line.

## 10. Testing

- **Scorer:** fixtures made from your real logs. Old text logs are converted to records (0.1 s resolution); new Share files are records already. Example golden cases: Chromebook 16:55 problem 3 (three Unrecognized, then "eight") and problem 6 ("if", "teen", then "15").
- **Session flow:** reducer tests with a fake clock.
- **Instruments:** the web recognizer wrapper with a fake browser recognizer (as the current hook tests do).
- Typecheck, lint, tests before every merge, as now.

## 11. Build order (each step testable, nothing live until step 6)

1. Session record types, scorer, log-to-record converter, fixtures. No UI change.
2. Web recognizer wrapper with `recId` and browser times; the current app logs through it (debug only).
3. New session flow and voice controller behind `?core=2`.
4. Share export and the troubleshooting sheet.
5. Onset detector experiment (`&vad=1`).
6. After testing on Chromebook, github.io and iPhone: make `core=2` the default, then delete the old code.

## 12. Risks

- Safari continuous recognition across a whole session is only lightly tested (two short logs). It may end on its own more often than expected; the flow restarts it, and the record shows how often.
- Chrome behavior with a measuring-only mic stream is unknown (section 7).
- "Card drawn" time on the native app needs its own method later.

## Decisions (approved 2026-10-29: all as recommended)

- **D1. Unrecognized and fragment tries before the answer.** Recommended: the response starts at the **first** speech of the problem when everything between it and the accepted answer was Unrecognized or a non-number fragment. Example from your 16:55 log: 1.3 s instead of today's 8.9 s. The cost: a cough or noise just before speaking makes the time a little short. The alternative is today's rule (subtract only the empty stretches), which made that problem 8.9 s.
- **D2. Wrong answer at evaluation pace.** Recommended: like the physical cards, a wrong answer goes on the "wrong" pile and the next card appears at once (the missed problem is reported). Alternative: the card stays until answered correctly, as now.
- **D3. Which time the student sees for a wrong-then-correct problem.** Recommended: the time to the first answer (how fast they responded), with the problem marked as missed. Alternative: the time to the correct answer.
