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
    - [x] Treat recoverable invalid/tiny audio chunks as non-fatal (`200` with empty transcript) to prevent session wedges.

4. [x] **Establish problem boundaries and set boundary policy**
   1. [x] **4.1 Introduce hard problem boundaries (first pass)**
       - [x] Add initial `await_begin` window so begin detection can bootstrap.
       - [x] Open per-problem windows on `problem_changed`.
       - [x] Bind each window/segment to one `problem_id`.
       - [x] Reject stale window/segment results.
       - [x] Prevent non-parseable final (e.g., `"Nice"`) from wedging the session.

   2. [x] **4.2 Complete boundary policy (utterance-final boundaries)**
       - [x] Close answer windows using `MIC_VOICE off + settle` (plus timeout fallback), not first parseable text.
       - [x] Submit from utterance-final candidate for the active problem.
       - [x] Keep begin-window behavior separate from answer-window behavior.

5. [x] **A/B chunking strategy (now a priority)**
    - [x] **Mode A**: fixed `chunk_ms` periodic uploads (`fixed`).
    - [x] **Mode B**: utterance-aligned dynamic chunk (voice-on to voice-off, single upload per answer window) (`vad`).
    - [x] Compared accuracy, latency, request volume, and failure modes in structured `3 x 10` runs.
    - [x] Selected **utterance/vad** as default mode; kept **periodic/fixed** available as fallback via URL param.

6. [ ] **Submission and grading integrity rules**
    - [x] Do not silently coerce ambiguous values (`50` vs `15`, `60` vs `16`).
    - [x] Add suspicious-recognition flags (for analysis) without changing grading semantics.
    - [ ] Ensure one clear submission policy per mode (`learn` vs `eval/challenge`).
    - [ ] `NOTE (deferred)`: finalize `eval/challenge` behavior after `learn` mode is fully tuned/stable.

7. [ ] **Persist logs to structured files**
    - [x] JSONL outputs are in place (client session exports + server debug JSONL).
    - [ ] Optional: standardize filenames/rotation for easier batch analysis.
    - [ ] Optional: add single run-manifest file linking client/server logs.

8. [ ] **Add replay/tuning loop**
    - [ ] Save raw segment audio per `segment_id` (optional toggle).
    - [ ] Re-run same audio through different Whisper settings/models.
    - [ ] Compare metrics without re-recording speech.

9. [ ] **Track core tuning metrics per problem/run**
    - [x] `t_process`, `t_speak`, upload latency, first-answer accuracy.
    - [x] False begin rate.
    - [x] Wrong-answer-from-stale-audio rate.
    - [x] Empty/blank transcript rate.
    - [x] Numeric WER-style proxy (expected vs recognized answer tokens).

10. [ ] **Tune in this order**
    - [ ] Boundary quality first.
    - [ ] Then submission policy.
    - [ ] Then latency (`chunk_ms`, hangover, model).
    - [ ] Then model/decoder accuracy (`tiny.en` vs `base.en`, decode options).

11. [ ] **Regression protocol**
    - [ ] Standard quick set: `3 x 10` problems.
    - [ ] Standard full set: `5 x 10` problems.
    - [ ] Keep environment notes with each batch (`browser`, `mic`, `model`, `chunk mode`).
    - [ ] Add a separate structured atypical-input protocol (nonsense audio, prolonged silence, intentional wrong answers).

12. [ ] **Exit criteria before cleanup**
    - [ ] `>=95%` first-answer accuracy on standard quick set (`3 x 10`) for two consecutive runs.
    - [ ] Zero session wedges from non-parseable finals.
    - [ ] Zero cross-problem bleed events in `50+` consecutive problems.
    - [ ] Stable begin detection.
    - [ ] Median/p90 latency within target.

13. [ ] **Test-run QoL logging pipeline (server-backed)**
    - [x] Keep manual `Download log` for normal/non-test sessions, but export a single run-format JSONL (matching test-run schema) for analysis portability.
    - [x] Add server endpoint for client event ingestion/storage (test-run mode only).
    - [x] Add visible `Test run` toggle near `Start` button:
        - [x] `On` (green): append sessions into a shared run file/group.
        - [x] `Off` (red): preserve current per-session manual export behavior.
    - [x] Introduce `run_id` and `session_index_in_run` fields in client events for grouping.
    - [x] Rename working log folder to `speechcapture-session-logs`.
    - [ ] Continue phased adoption of standardized filename conventions (`ses`/`run`/`bat`/`svr` patterns).
    - [ ] Ensure logs remain engine-aware (`webspeech`, `vosk`, `whisper`) so cross-engine testing is comparable.
    - [ ] Update analyzer to accept/filter by `run_id` when test-run mode is used.

14. [ ] **Chunk-mode terminology alignment (`fixed` / `vad`)**
    - [ ] Standardize chunk-mode naming to `fixed` and `vad` across UI labels.
    - [ ] Standardize event/log/analyzer outputs to `fixed` and `vad`.
    - [ ] Keep backward-compatible mapping from legacy names (`periodic` -> `fixed`, `utterance` -> `vad`) during transition.

15. [ ] **Analyzer evolution (skeleton, phased)**
    - [ ] Near-term: accept mixed input sets containing any combination of `ses` and `run` files in one analysis pass.
    - [ ] Near-term: preserve current report behavior when `stt/chunk/source` descriptors are homogeneous.
    - [ ] Near-term (optional): add separate cohort summaries for `vad` vs `fixed` when both appear in the same selected set.
    - [ ] Deferred: cross-engine comparative reporting (`webspeech` vs `whisper` vs `vosk`) after sufficient structured data exists.
    - [ ] Deferred: `mic` vs `rec` comparative reporting after replay/audio-file workflows are implemented.

16. [ ] **Server log strategy (`svr`)**
    - [x] Near-term decision: keep a single append-only server debug log file for operational simplicity.
    - [x] Near-term requirement: ensure server events continue to include join keys needed for troubleshooting/analysis (for example `session_id`, `run_id`, `engine`).
    - [x] Adopt standardized append-file naming pattern for server logs (`sc_log_svr-ymmdd.hhmm.ss.jsonl`).
    - [ ] Deferred enhancement: optional server-log rotation/splitting (for example per-run files) when workflow value outweighs added file-management overhead.
