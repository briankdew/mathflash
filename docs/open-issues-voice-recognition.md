# Open issue: speech engine reports speech but returns no text ("empty tries")

Status: **open**, raised 2026-10-28, not yet resolved. Read `docs/voice-timing-principles.md` first for the timing rules this touches.

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

## Not decided yet

1. Treat any problem with an empty try as "not clean": keep the time, exclude it from performance averages and from custom-problem-set inputs, and count how many were excluded. (Recommended; no change to the practice flow. `emptyTryMs > 0` is the flag.)
2. A skip rule: after N empty tries in a row on one problem (suggested 3), move on and mark it "unrecognized" instead of retrying forever.
3. Whether skipped problems are re-queued later (a re-shown problem has been seen, so its time is a different measurement; it would need a "retake" flag) or just reported and left out.
4. The Safari blind spot: a dropped answer looks like silence and the timer keeps running. No fix yet.
5. Small cosmetic fix: `recognizerReadyLagMs` is inflated on retries (counts the failed tries); measure each restart from the previous `end`.

## Discussion queue (agreed 2026-10-29, in this order)

1. Speech recognition consistency across devices and platforms: what we can and cannot promise, and what the native iOS app changes (word timestamps, a different engine).
2. Assessment of the code (quality, form, efficiency) for an app that depends on timing. Findings feed the next two.
3. Redesign of the Performance report page, first as a troubleshooting tool for the owner (the data is also read directly by Claude). The current page is a preliminary version.
4. Re-evaluating other original app decisions, as they come up. Add them to the parking lot below.

Only after these: decide the solution for the items under "Not decided yet".

## Parking lot (decisions to revisit)

- Reorganize information that has been "squirreled away" in scattered places (docs, notes, memory). Not now; the owner does not want to derail the current objective.
