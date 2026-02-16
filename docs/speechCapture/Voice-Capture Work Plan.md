# Measurement-First Voice-Capture Pipeline

Build a measurement-first capture pipeline so we can tune boundaries, latency, and transcription quality with minimal guesswork.

1. [x] **Define unified event schema**
   - [x] Use `session_id`, `problem_id`, `segment_id`, `chunk_id`, `engine`, `ts_ms` across client/server.
   - [x] Persist `event_type` for machine analysis.
   - [x] Keep IDs consistent enough to join client and server runs by `session_id`.

2. [x] **Add client-side capture instrumentation**
   - [x] Log `MIC_RMS`, `MIC_VOICE on/off`, thresholds, and hangover config.
   - [x] Log segment/window lifecycle decisions.
   - [x] Log chunk metadata (size, mime, upload timing).
   - [x] Log transcript processing events (`raw`, `delta`, ignored reasons, submission path).

3. [x] **Add server-side transcription instrumentation**
   - [x] Log request receipt with IDs and file metadata.
   - [x] Log `ffmpeg` start/end duration and status.
   - [x] Log `whisper-cli` start/end duration and status.
   - [x] Log raw/normalized transcript output.
   - [x] Log final response status and payload summary.

4. [x] **Introduce hard problem boundaries (4A: first pass)**
   - [x] Add initial `await_begin` window so begin detection can bootstrap.
   - [x] Open per-problem windows on `problem_changed`.
   - [x] Bind each window/segment to one `problem_id`.
   - [x] Reject stale window/segment results.
   - [x] Prevent non-parseable final (e.g., `"Nice"`) from wedging the session.

5. [ ] **Complete boundary policy (4B: utterance-final boundaries)**
   - [ ] Close answer windows using `MIC_VOICE off + settle` (plus timeout fallback), not first parseable text.
   - [ ] Submit from utterance-final candidate for the active problem.
   - [ ] Keep begin-window behavior separate from answer-window behavior.

6. [ ] **A/B chunking strategy (now a priority)**
   - [ ] **Mode A**: fixed `chunk_ms` periodic uploads.
   - [ ] **Mode B**: utterance-aligned dynamic chunk (voice-on to voice-off, single upload per answer window).
   - [ ] Compare accuracy, latency, request volume, and failure modes.

7. [ ] **Submission and grading integrity rules**
   - [ ] Do not silently coerce ambiguous values (`50` vs `15`, `60` vs `16`).
   - [ ] Add suspicious-recognition flags (for analysis) without changing grading semantics.
   - [ ] Ensure one clear submission policy per mode (`learn` vs `eval/challenge`).

8. [ ] **Persist logs to structured files**
   - [x] JSONL outputs are in place (client session exports + server debug JSONL).
   - [ ] Optional: standardize filenames/rotation for easier batch analysis.
   - [ ] Optional: add single run-manifest file linking client/server logs.

9. [ ] **Add replay/tuning loop**
   - [ ] Save raw segment audio per `segment_id` (optional toggle).
   - [ ] Re-run same audio through different Whisper settings/models.
   - [ ] Compare metrics without re-recording speech.

10. [ ] **Track core tuning metrics per problem/run**
    - [x] `t_process`, `t_speak`, upload latency, first-answer accuracy.
    - [ ] False begin rate.
    - [ ] Wrong-answer-from-stale-audio rate.
    - [ ] Empty/blank transcript rate.
    - [ ] Numeric WER-style proxy (expected vs recognized answer tokens).

11. [ ] **Tune in this order**
    - [ ] Boundary quality first.
    - [ ] Then submission policy.
    - [ ] Then latency (`chunk_ms`, hangover, model).
    - [ ] Then model/decoder accuracy (`tiny.en` vs `base.en`, decode options).

12. [ ] **Regression protocol**
    - [ ] Standard quick set: `3 x 10` problems.
    - [ ] Standard full set: `5 x 10` problems.
    - [ ] Keep environment notes with each batch (`browser`, `mic`, `model`, `chunk mode`).

13. [ ] **Exit criteria before cleanup**
    - [ ] `>=95%` first-answer accuracy on standard quick set (`3 x 10`) for two consecutive runs.
    - [ ] Zero session wedges from non-parseable finals.
    - [ ] Zero cross-problem bleed events in `50+` consecutive problems.
    - [ ] Stable begin detection.
    - [ ] Median/p90 latency within target.
