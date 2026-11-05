// Very small JSON-file store for usage history (good enough for a demo).
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "data", "usage.json");

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return [];
  }
}

let records = load();

function save() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(records, null, 2));
}

function add(record) {
  records.unshift(record);
  save();
  return record;
}

function list() {
  return records;
}

function reset() {
  records = [];
  save();
}

function summary() {
  return records.reduce(
    (s, r) => {
      s.requests += 1;
      s.inputTokens += r.inputTokens;
      s.audioInputTokens += r.audioInputTokens;
      s.textInputTokens += r.textInputTokens;
      s.outputTokens += r.outputTokens;
      s.totalTokens += r.totalTokens;
      s.audioSeconds += r.durationSeconds || 0;
      s.cost += r.cost;
      return s;
    },
    {
      requests: 0,
      inputTokens: 0,
      audioInputTokens: 0,
      textInputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      audioSeconds: 0,
      cost: 0,
    }
  );
}

module.exports = { add, list, reset, summary };
