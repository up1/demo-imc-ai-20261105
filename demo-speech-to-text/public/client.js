const $ = (id) => document.getElementById(id);
const fileInput = $("fileInput");
const recordBtn = $("recordBtn");
const transcribeBtn = $("transcribeBtn");
const player = $("player");
const fileInfo = $("fileInfo");
const statusEl = $("status");
const transcriptEl = $("transcript");
const lastUsageEl = $("lastUsage");

let audioBlob = null;
let audioName = null;
let audioDuration = null;
let recorder = null;
let chunks = [];

const MAX_BYTES = 25 * 1024 * 1024;

// ---------- helpers ----------
const escapeHtml = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function measureDuration(blob) {
  // Try the <audio> element first, fall back to Web Audio decoding (needed for MediaRecorder webm).
  const url = URL.createObjectURL(blob);
  const fromElement = await new Promise((resolve) => {
    const a = new Audio();
    a.preload = "metadata";
    a.onloadedmetadata = () => resolve(isFinite(a.duration) ? a.duration : null);
    a.onerror = () => resolve(null);
    a.src = url;
  });
  URL.revokeObjectURL(url);
  if (fromElement) return fromElement;
  try {
    const ctx = new AudioContext();
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    ctx.close();
    return buf.duration;
  } catch {
    return null;
  }
}

async function setAudio(blob, name) {
  if (blob.size > MAX_BYTES) {
    fileInfo.textContent = "File is larger than 25 MB — please compress or split it.";
    transcribeBtn.disabled = true;
    return;
  }
  audioBlob = blob;
  audioName = name;
  audioDuration = await measureDuration(blob);
  player.src = URL.createObjectURL(blob);
  player.hidden = false;
  fileInfo.textContent = `${name} · ${(blob.size / 1024).toFixed(1)} KB · ${
    audioDuration ? audioDuration.toFixed(1) + " s" : "unknown duration"
  }`;
  transcribeBtn.disabled = false;
}

// ---------- file upload ----------
fileInput.addEventListener("change", () => {
  const f = fileInput.files[0];
  if (f) setAudio(f, f.name);
});

// ---------- microphone recording ----------
recordBtn.addEventListener("click", async () => {
  if (recorder && recorder.state === "recording") {
    recorder.stop();
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
    recorder = new MediaRecorder(stream, { mimeType });
    chunks = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: mimeType });
      const ext = mimeType === "audio/webm" ? "webm" : "mp4";
      setAudio(blob, `recording-${Date.now()}.${ext}`);
      recordBtn.textContent = "⏺ Record";
      recordBtn.classList.remove("recording");
    };
    recorder.start();
    recordBtn.textContent = "⏹ Stop";
    recordBtn.classList.add("recording");
    fileInfo.textContent = "Recording…";
  } catch (err) {
    fileInfo.textContent = "Microphone error: " + err.message;
  }
});

// ---------- transcribe ----------
transcribeBtn.addEventListener("click", async () => {
  if (!audioBlob) return;
  transcribeBtn.disabled = true;
  statusEl.textContent = "Transcribing…";
  transcriptEl.textContent = "…";
  lastUsageEl.hidden = true;

  try {
    const headers = {
      "Content-Type": audioBlob.type || "application/octet-stream",
      "X-Filename": encodeURIComponent(audioName),
    };
    if (audioDuration) headers["X-Audio-Duration"] = audioDuration.toFixed(3);
    if ($("language").value) headers["X-Language"] = $("language").value;

    const res = await fetch("/api/transcribe", { method: "POST", headers, body: audioBlob });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || res.statusText);

    transcriptEl.textContent = data.text || "(empty)";
    const r = data.record;
    statusEl.textContent = `Done in ${r.latencyMs} ms` + (data.languages?.length ? ` · languages: ${JSON.stringify(data.languages)}` : "");
    lastUsageEl.hidden = false;
    lastUsageEl.innerHTML = `
      <b>This request</b> ·
      input <b>${r.inputTokens}</b> (audio ${r.audioInputTokens} / text ${r.textInputTokens}) ·
      output <b>${r.outputTokens}</b> · total <b>${r.totalTokens}</b> ·
      duration <b>${r.durationSeconds ? r.durationSeconds.toFixed(1) + "s" : "-"}</b> ·
      cost <b>$${r.cost.toFixed(6)}</b> <span class="muted">(${r.costMethod})</span>
      <details><summary>raw usage</summary><pre>${escapeHtml(JSON.stringify(data.rawUsage, null, 2))}</pre></details>`;

    renderSummary(data.summary);
    prependRow(r);
  } catch (err) {
    statusEl.textContent = "❌ " + err.message;
    transcriptEl.textContent = "—";
  } finally {
    transcribeBtn.disabled = false;
  }
});

// ---------- usage dashboard ----------
function renderSummary(s) {
  const set = (k, v) => (document.querySelector(`[data-k="${k}"]`).textContent = v);
  set("requests", s.requests);
  set("inputTokens", s.inputTokens.toLocaleString());
  set("audioInputTokens", s.audioInputTokens.toLocaleString());
  set("textInputTokens", s.textInputTokens.toLocaleString());
  set("outputTokens", s.outputTokens.toLocaleString());
  set("totalTokens", s.totalTokens.toLocaleString());
  set("audioMinutes", (s.audioSeconds / 60).toFixed(2));
  set("cost", "$" + s.cost.toFixed(6));
}

function prependRow(r) {
  const tbody = $("history");
  tbody.querySelector(".empty")?.remove();
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${new Date(r.createdAt).toLocaleString()}</td>
    <td>${escapeHtml(r.filename)}</td>
    <td>${r.durationSeconds ? r.durationSeconds.toFixed(1) + "s" : "-"}</td>
    <td>${r.inputTokens} (${r.audioInputTokens} / ${r.textInputTokens})</td>
    <td>${r.outputTokens}</td>
    <td>${r.totalTokens}</td>
    <td>${r.latencyMs} ms</td>
    <td title="${r.costMethod}">$${r.cost.toFixed(6)}</td>
    <td class="clip" title="${escapeHtml(r.text)}">${escapeHtml(r.text)}</td>`;
  tbody.prepend(tr);
}

$("resetBtn").addEventListener("click", async () => {
  if (!confirm("Clear all usage history?")) return;
  const res = await fetch("/api/usage", { method: "DELETE" });
  const data = await res.json();
  renderSummary(data.summary);
  $("history").innerHTML = `<tr class="empty"><td colspan="9">No requests yet</td></tr>`;
});
