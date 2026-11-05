const path = require("path");
const express = require("express");
const OpenAI = require("openai");
const { toFile } = require("openai");
const { calculateCost, PRICING } = require("./lib/pricing");
const store = require("./lib/usage-store");

const PORT = process.env.PORT || 3000;
const MODEL = process.env.OPENAI_MODEL || "gpt-transcribe";
const MAX_BYTES = 25 * 1024 * 1024; // OpenAI limit: 25 MB per file
const ALLOWED_EXT = ["mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm"];

if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY. Copy .env.example to .env and set your key.");
  process.exit(1);
}

const openai = new OpenAI();
const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

app.get("/", (req, res) => {
  res.render("index", {
    model: MODEL,
    pricing: PRICING,
    summary: store.summary(),
    records: store.list(),
  });
});

// The browser sends the audio file as the raw request body.
// Metadata travels in headers: X-Filename, X-Audio-Duration (seconds, measured in the browser).
app.post(
  "/api/transcribe",
  express.raw({ type: ["audio/*", "video/*", "application/octet-stream"], limit: MAX_BYTES }),
  async (req, res) => {
    try {
      const buffer = req.body;
      if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        return res.status(400).json({ error: "No audio received." });
      }

      const filename = decodeURIComponent(req.get("X-Filename") || "audio.webm");
      const ext = filename.split(".").pop().toLowerCase();
      if (!ALLOWED_EXT.includes(ext)) {
        return res.status(400).json({ error: `Unsupported file type .${ext}. Use: ${ALLOWED_EXT.join(", ")}` });
      }
      const clientDuration = Number(req.get("X-Audio-Duration")) || null;
      const language = req.get("X-Language") || undefined;

      const started = Date.now();
      const file = await toFile(buffer, filename, { type: req.get("Content-Type") });
      const transcription = await openai.audio.transcriptions.create({
        file,
        model: MODEL,
        ...(language ? { language } : {}),
      });
      const latencyMs = Date.now() - started;

      const usage = transcription.usage || null;
      const durationSeconds = usage?.type === "duration" ? usage.seconds : clientDuration;
      const cost = calculateCost(usage, durationSeconds);

      const record = store.add({
        id: Date.now().toString(36),
        createdAt: new Date().toISOString(),
        model: MODEL,
        filename,
        bytes: buffer.length,
        durationSeconds,
        latencyMs,
        usageType: usage?.type || "none",
        inputTokens: usage?.input_tokens ?? 0,
        audioInputTokens: usage?.input_token_details?.audio_tokens ?? 0,
        textInputTokens: usage?.input_token_details?.text_tokens ?? 0,
        outputTokens: usage?.output_tokens ?? 0,
        totalTokens: usage?.total_tokens ?? 0,
        cost: cost.total,
        costMethod: cost.method,
        text: transcription.text,
      });

      res.json({
        text: transcription.text,
        languages: transcription.languages,
        rawUsage: usage,
        record,
        summary: store.summary(),
      });
    } catch (err) {
      console.error(err);
      const status = err.status || 500;
      res.status(status).json({ error: err.message || "Transcription failed" });
    }
  }
);

app.get("/api/usage", (req, res) => {
  res.json({ summary: store.summary(), records: store.list() });
});

app.delete("/api/usage", (req, res) => {
  store.reset();
  res.json({ summary: store.summary(), records: [] });
});

// Body-size errors from express.raw
app.use((err, req, res, next) => {
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "File is larger than 25 MB." });
  }
  next(err);
});

app.listen(PORT, () => {
  console.log(`Speech-to-text demo running at http://localhost:${PORT} (model: ${MODEL})`);
});
