# speechCapture File Naming Standard

## Descriptor Abbreviations
| Descriptor | Usage |
|---|---|
| `bat` | batch: one or more runs analyzed as a group |
| `fxd` | fixed: STT chunk mode using periodic, fixed-length chunks |
| `log` | log: record of events (user/system/server/etc.) |
| `rpt` | report: structured output from analyzed log data |
| `run` | run: grouped sessions completed together (run ID plus included session IDs) |
| `sc` | speechCapture: app prefix |
| `ses` | session: one or more problems completed from a single Start action |
| `stt` | speech-to-text: voice transcription method |
| `svr` | server: scope descriptor |
| `vad` | voice-activity-detection (VAD): chunk mode (variable-length chunks) |
| `vosk` | Vosk: STT engine |
| `wbsp` | Web Speech: STT engine |
| `wspc` | whisper.cpp: STT engine |
| `ymmdd.hhmm.ss` | timestamp: where `y` is the last digit of the 4-digit year |
| `sN` | number of sessions: total number of sessions represented in a file |
| `pN` | number of problems: total number of problems represented in a file |
| `mic` | microphone: audio source (live capture) |
| `rec` | recording: audio source (static file replay) |
| `mixd` | mixed: more than one stt-engine value found across grouped files |
| `mxd` | mixed: more than one chunk-mode or audio-souorce value found across grouped files |
| `unkn` | unknown: undefined stt-engine value found in grouped files |
| `unk` | unknown: undefined chunk-mode or audio-source value found in grouped files |

## Current Filename Patterns
| File Content Type | Filename Example |
|---|---|
| Session log folder | `sc-session-logs/` |
| Session log (`jsonl`) | `sc_log_ses-60217.1259.15-7bd9_s1_p5_wspc_vad_mic.jsonl` |
| Run log (`jsonl`) | `sc_log_run-60217.1307.27-3zq8_s3_p30_wspc_vad_mic.jsonl` |
| Analyzer output (`json`) | `sc_rpt_bat-60217.1324.58-0nv3_s4_p35_wspc_vad_mic.json` |
| Analyzer output (`csv`) | `sc_rpt_bat-60217.1324.58-0nv3_s4_p35_wspc_vad_mic.csv` |
| Server STT log (`jsonl`) | `sc_log_svr-60217.1307.32.jsonl` |

## General Filename Hierarchy
Use this pattern if/when possible with meaningful, applicable, well-defined descriptors (above):

`<app-name>_<content-type>_<content-scope>-<timestamp>-<unique-id>_<session-count>_<problem-count>_<stt-engine>_<chunk-mode>_<audio-source>.<extension>`
