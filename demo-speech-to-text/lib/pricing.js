// Pricing for gpt-transcribe
// https://developers.openai.com/api/docs/models/gpt-transcribe
// The model page lists a per-minute rate ($0.0045 / minute of audio).
// Optional per-1M-token rates can be set via env if you want token-based cost instead.

const num = (v, d) => (v === undefined || v === "" ? d : Number(v));

const PRICING = {
  perMinute: num(process.env.PRICE_PER_MINUTE, 0.0045),
  audioInputPer1M: num(process.env.PRICE_AUDIO_INPUT_PER_1M, 0),
  textInputPer1M: num(process.env.PRICE_TEXT_INPUT_PER_1M, 0),
  outputPer1M: num(process.env.PRICE_OUTPUT_PER_1M, 0),
};

const tokenPricingEnabled = () =>
  PRICING.audioInputPer1M > 0 || PRICING.textInputPer1M > 0 || PRICING.outputPer1M > 0;

/**
 * @param usage  the `usage` object returned by the transcription API (tokens or duration variant)
 * @param durationSeconds  audio length in seconds (from API duration usage, or measured by the browser)
 */
function calculateCost(usage, durationSeconds) {
  if (usage?.type === "tokens" && tokenPricingEnabled()) {
    const audio = usage.input_token_details?.audio_tokens ?? usage.input_tokens ?? 0;
    const text = usage.input_token_details?.text_tokens ?? 0;
    const output = usage.output_tokens ?? 0;
    const total =
      (audio * PRICING.audioInputPer1M + text * PRICING.textInputPer1M + output * PRICING.outputPer1M) / 1_000_000;
    return { total, method: "tokens" };
  }

  if (durationSeconds) {
    return { total: (durationSeconds / 60) * PRICING.perMinute, method: "per-minute" };
  }

  return { total: 0, method: "unknown" };
}

module.exports = { PRICING, calculateCost };
