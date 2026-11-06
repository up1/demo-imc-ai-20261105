exports.getIndex = (req, res) => {
  res.render('index', {
    title: 'SlipFlow | Slip Dashboard'
  });
};

exports.getUpload = (req, res) => {
  res.render('upload', {
    title: 'SlipFlow | Receipt Extraction'
  });
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const RATE_LIMIT = 100;
const RATE_WINDOW = 60 * 60 * 1000;
const requestsByClient = new Map();
let lastRateLimitCleanup = 0;

function getImageMediaType(buffer) {
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return 'image/png';
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  return null;
}

function consumeRequestQuota(clientId, now = Date.now()) {
  if (now - lastRateLimitCleanup >= RATE_WINDOW) {
    for (const [key, entry] of requestsByClient) {
      if (entry.resetAt <= now) requestsByClient.delete(key);
    }
    lastRateLimitCleanup = now;
  }

  let entry = requestsByClient.get(clientId);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + RATE_WINDOW };
    requestsByClient.set(clientId, entry);
  }

  if (entry.count >= RATE_LIMIT) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { allowed: true, remaining: RATE_LIMIT - entry.count };
}

function parseExtraction(text) {
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd < jsonStart) throw new Error('Invalid extraction response');

  const result = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('Invalid extraction response');
  }

  const shopName = typeof result.shop_name === 'string' ? result.shop_name.trim() : null;
  let totalAmount = result.total_amount ?? null;

  if (typeof totalAmount === 'string') {
    const normalizedAmount = totalAmount.replace(/[^\d.-]/g, '');
    totalAmount = normalizedAmount ? Number(normalizedAmount) : null;
  }

  if (totalAmount !== null && (typeof totalAmount !== 'number' || !Number.isFinite(totalAmount))) {
    throw new Error('Invalid total amount');
  }

  return { shop_name: shopName || null, total_amount: totalAmount };
}

exports.postExtract = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'กรุณาเลือกไฟล์ภาพก่อนดำเนินการ' });
  }

  const mediaType = getImageMediaType(req.file.buffer);
  if (!mediaType || mediaType !== req.file.mimetype) {
    return res.status(415).json({ error: 'รองรับเฉพาะไฟล์ภาพ PNG, JPG หรือ JPEG ที่ถูกต้อง' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'ยังไม่ได้ตั้งค่า Anthropic API key บนเซิร์ฟเวอร์' });
  }

  const quota = consumeRequestQuota(req.ip);
  if (!quota.allowed) {
    res.set('Retry-After', String(quota.retryAfter));
    return res.status(429).json({ error: 'ใช้งานครบ 100 ครั้งต่อชั่วโมงแล้ว กรุณาลองใหม่ภายหลัง' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2026-10-21',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: req.file.buffer.toString('base64')
              }
            },
            {
              type: 'text',
              text: 'Read this receipt or payment slip. Return only a JSON object with exactly these fields: shop_name (string or null) and total_amount (number or null). Use the final total paid, not a subtotal. Do not guess values that are not legible.'
            }
          ]
        }]
      }),
      signal: AbortSignal.timeout(60000)
    });

    if (!response.ok) {
      const status = response.status === 429 ? 503 : 502;
      return res.status(status).json({ error: 'ไม่สามารถอ่านข้อมูลจากบริการ OCR ได้ในขณะนี้' });
    }

    const payload = await response.json();
    const text = payload.content?.find((block) => block.type === 'text')?.text;
    if (!text) throw new Error('Missing extraction text');

    return res.json({ data: parseExtraction(text) });
  } catch {
    return res.status(502).json({ error: 'เกิดข้อผิดพลาดระหว่างอ่านข้อมูล กรุณาลองอีกครั้ง' });
  }
};

exports.consumeRequestQuota = consumeRequestQuota;
exports.getImageMediaType = getImageMediaType;
exports.parseExtraction = parseExtraction;
exports.MAX_FILE_SIZE = MAX_FILE_SIZE;
