# Open issue: speech engine reports speech but returns no text ("empty tries")

Status: **design approved 2026-10-29** (`docs/timing-core-design.md`); fix comes with the rebuilt timing core. Raised 2026-10-28. Read `docs/voice-timing-principles.md` first for the timing rules this touches.

## What happens

The browser reports that it heard speech (`speechstart`) and then ends with no text and no error. The user did say the answer (the owner confirms saying "eight" four times for one problem, quiet room); the app got nothing back for the first three.

- Chrome (Chromebook, 2026-10-28): 9 of 29 recognitions that reported speech were empty. They come in runs (four in a row, three in a row), with and without the held-microphone workaround.
- Safari / iPhone: no empty tries seen in any log. But Safari only announces `speechstart` together with its first text, so a failed recognition there would be invisible (it would look like silence). The Safari stalls early on may have been the same failure.

## What we did

- Empty-try time is added up per problem (`emptyTryMs`) and subtracted from the response time and the response onset. It is an estimate: the pauses between the user's repeated tries still count.
- Safari-only workarounds (held mic, accept a stable first guess after 500ms) stay Safari-only. Chrome keeps its original behavior.
- Near-miss word list added so mishearings like "sex" count as 6.

## Checked and not supported

Hypothesis: the user spoke before the recognizer was "really" listening. Across 29 Chrome recognitions, empties began 1.2-2.8s after `start`; tries that returned text began 0.7-3.6s after `start`. The mic was open about 0.1s after `start` and speech was detected each time. No timing threshold separates them. Cannot be fully ruled out. Optional test: on Chrome, wait 2-3s after each problem appears before speaking, for ~10 problems.

## Not decided yet (updated 2026-10-29)

Superseded by the approved design: item 1 (the owner rejected engine-caused "not clean" flags; D1 starts the response at the first speech instead), item 5 (startup measured per restart, design 4.4). Still open: items 2-4.


1. Treat any problem with an empty try as "not clean": keep the time, exclude it from performance averages and from custom-problem-set inputs, and count how many were excluded. (Recommended; no change to the practice flow. `emptyTryMs > 0` is the flag.)
2. A skip rule: after N empty tries in a row on one problem (suggested 3), move on and mark it "unrecognized" instead of retrying forever.
3. Whether skipped problems are re-queued later (a re-shown problem has been seen, so its time is a different measurement; it would need a "retake" flag) or just reported and left out.
4. The Safari blind spot: a dropped answer looks like silence and the timer keeps running. No fix yet.
5. Small cosmetic fix: `recognizerReadyLagMs` is inflated on retries (counts the failed tries); measure each restart from the previous `end`.
6. Speech service lost (found 2026-10-30, Chromebook, github.io, `custrec=1` run, log 11:19): Chrome reported `error network` after speech started and the app then did nothing, so the session stalled on problem 8 with no message and no restart. Agreed (owner, 2026-10-30): handle it in the new session flow (step 3) with a visible "lost speech service" message and an automatic restart. One occurrence in 38 problems; not shown to be caused by `custrec`.
7. Digit-by-digit answers (raised by the owner, 2026-10-30): "seven eight", "one five" and "three zero" must never count; only the real number word does, so users learn correct terminology. Spoken words and spaced digits ("7 8") are rejected, and the new flow shows "Say the whole number". Still open: if a browser itself turns "one five" into "15", the web app cannot tell it from "fifteen", because engines also return digits for normal numbers. No log shows what browsers do with this speech yet; the step 3 tests say these phrases on purpose to find out. The native app may be able to use word timestamps.

## Discussion queue (agreed 2026-10-29, in this order)

1. Speech recognition consistency across devices and platforms: what we can and cannot promise, and what the native iOS app changes (word timestamps, a different engine).
2. Assessment of the code (quality, form, efficiency) for an app that depends on timing. Findings feed the next two.
3. Redesign of the Performance report page, first as a troubleshooting tool for the owner (the data is also read directly by Claude). The current page is a preliminary version.
4. Re-evaluating other original app decisions, as they come up. Add them to the parking lot below.

Status 2026-10-29: topics 1-3 discussed; design approved. Topic 4 continues as items come up.

Only after these: decide the solution for the items under "Not decided yet".

## Parking lot (decisions to revisit)

- Reorganize information that has been "squirreled away" in scattered places (docs, notes, memory). Not now; the owner does not want to derail the current objective.
- Background-noise indicator or message when noise may affect recognition (onset detector can supply the level).
- Learning (paced) vs evaluation (at speed) modes; evaluation pace is in the design, learning later.
- Calibration warm-up (read digits aloud) as a response-time and noise baseline; how often to offer it as a setting.
- User login (premium) so several users on one device keep their own history and settings; after basic app and premium voice settle.
- Free on-device number-only recognizer, if it passes a size-versus-effectiveness test.
