# Speech to Text demo (OpenAI `gpt-transcribe`)

A small web app built with **Node.js + Express + EJS**. It transcribes audio with the OpenAI
[Speech to text API](https://developers.openai.com/api/docs/guides/speech-to-text) and tracks
**token usage (input/output)** and **cost** for each request of the
[`gpt-transcribe`](https://developers.openai.com/api/docs/models/gpt-transcribe) model.

## Features

- Upload an audio file (mp3, mp4, mpeg, mpga, m4a, wav, webm, up to 25 MB) **or record from the microphone**
- Optional language hint (th, en, ja, zh)
- Usage monitoring dashboard:
  - Input tokens (audio / text), output tokens, total tokens
  - Audio minutes and latency
  - Cost per request and total cost (USD)
  - History saved to `data/usage.json` (you can reset it from the UI)

## Requirements

- Node.js **20.12+** (uses the built-in `--env-file-if-exists` flag)
- An OpenAI API key: <https://platform.openai.com/api-keys>

## Steps to run

```bash
# 1. Go to the project folder
cd demo-speech-to-text

# 2. Install dependencies
npm install

# 3. Create .env and set your API key
cp .env.example .env
#   then edit .env → OPENAI_API_KEY=sk-...

# 4. Start the server
npm start          # or: npm run dev  (restarts when files change)

# 5. Open the web app
open http://localhost:3000
```

Then:

1. Click **Choose file** or **Record** (allow microphone access, then click **Stop**).
2. Click **Transcribe**.
3. Read the transcript and check the **Usage monitoring** section for tokens and cost.

## How usage and cost are calculated

The transcription API returns a `usage` object in one of two shapes:

```jsonc
// token-billed
{ "type": "tokens", "input_tokens": 120, "output_tokens": 35, "total_tokens": 155,
  "input_token_details": { "audio_tokens": 120, "text_tokens": 0 } }

// duration-billed
{ "type": "duration", "seconds": 12.4 }
```

The app records both shapes.

| Setting | Default | Meaning |
|---|---|---|
| `PRICE_PER_MINUTE` | `0.0045` | Price from the `gpt-transcribe` model page ($ per minute of audio) |
| `PRICE_AUDIO_INPUT_PER_1M` | `0` | Optional: $ per 1M audio input tokens |
| `PRICE_TEXT_INPUT_PER_1M` | `0` | Optional: $ per 1M text input tokens |
| `PRICE_OUTPUT_PER_1M` | `0` | Optional: $ per 1M output tokens |

- **Default:** cost = audio minutes × `PRICE_PER_MINUTE`. The audio length comes from `usage.seconds`
  when the API returns it. Otherwise the browser measures it before upload.
- **Token-based:** if you set any `PRICE_*_PER_1M` value, cost = tokens × token price
  (shown as `tokens` in the cost tooltip).

> Prices can change. Check the [model page](https://developers.openai.com/api/docs/models/gpt-transcribe)
> and update `.env` if they do.

## API endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Web UI (EJS) |
| `POST` | `/api/transcribe` | Raw audio body. Headers: `Content-Type`, `X-Filename`, `X-Audio-Duration` (optional), `X-Language` (optional) |
| `GET` | `/api/usage` | Usage summary and history as JSON |
| `DELETE` | `/api/usage` | Reset usage history |

Example with curl:

```bash
curl -X POST http://localhost:3000/api/transcribe \
  -H "Content-Type: audio/mpeg" \
  -H "X-Filename: sample.mp3" \
  --data-binary @sample.mp3
```

## Project structure

```
demo-speech-to-text/
├── app.js               # Express server + OpenAI call
├── lib/
│   ├── pricing.js       # cost calculation
│   └── usage-store.js   # JSON-file usage history
├── views/index.ejs      # UI
├── public/
│   ├── client.js        # upload / record / dashboard logic
│   └── style.css
├── data/usage.json      # created at runtime
└── .env.example
```
