# Whisper Endpoint Contract

The browser Whisper adapter sends short audio chunks to:

- `POST /api/stt/whisper`
- `Content-Type: multipart/form-data`
- Form field: `file` (audio chunk, typically `.webm`)

Optional metadata form fields sent with each chunk:

- `session_id`
- `problem_id`
- `segment_id`
- `chunk_id`
- `engine`
- `client_ts_ms`

Expected JSON response:

```json
{ "text": "42" }
```

Accepted response keys:

- `text` (preferred)
- `transcript` (fallback)

If response status is non-2xx, the app logs `STT_ERR` and continues.

## Debug Telemetry

When server debug is enabled (`STT_DEBUG !== '0'`), structured JSONL events are appended to:

- `logs/stt-server-events.jsonl`

This file includes request/ffmpeg/whisper timing plus transcript fields to support AI-assisted analysis across sessions.
