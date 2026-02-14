# Whisper Endpoint Contract

The browser Whisper adapter sends short audio chunks to:

- `POST /api/stt/whisper`
- `Content-Type: multipart/form-data`
- Form field: `file` (audio chunk, typically `.webm`)

Expected JSON response:

```json
{ "text": "42" }
```

Accepted response keys:

- `text` (preferred)
- `transcript` (fallback)

If response status is non-2xx, the app logs `STT_ERR` and continues.
