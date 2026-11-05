const assert = require('node:assert/strict');
const test = require('node:test');
const {
  consumeRequestQuota,
  getImageMediaType,
  parseExtraction,
  postExtract
} = require('../controllers/indexController');

test('detects PNG and JPEG from their file signatures', () => {
  assert.equal(getImageMediaType(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'image/png');
  assert.equal(getImageMediaType(Buffer.from([0xff, 0xd8, 0xff, 0x00])), 'image/jpeg');
  assert.equal(getImageMediaType(Buffer.from('not an image')), null);
});

test('parses the requested fields and normalizes a formatted amount', () => {
  assert.deepEqual(
    parseExtraction('Result: {"shop_name":"  Night Market  ","total_amount":"฿1,245.50"}'),
    { shop_name: 'Night Market', total_amount: 1245.5 }
  );
  assert.deepEqual(parseExtraction('{"shop_name":null,"total_amount":null}'), {
    shop_name: null,
    total_amount: null
  });
});

test('limits each client to 100 requests in a one-hour window', () => {
  const clientId = `rate-limit-test-${Math.random()}`;
  const now = Date.now() + 1000;

  for (let request = 0; request < 100; request += 1) {
    assert.equal(consumeRequestQuota(clientId, now).allowed, true);
  }

  assert.equal(consumeRequestQuota(clientId, now).allowed, false);
  assert.equal(consumeRequestQuota(clientId, now + 60 * 60 * 1000).allowed, true);
});

test('sends a base64 image to Anthropic and returns extracted fields', async () => {
  const originalApiKey = process.env.ANTHROPIC_API_KEY;
  const originalFetch = global.fetch;
  const image = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  let responseStatus = 200;
  let responseBody;

  process.env.ANTHROPIC_API_KEY = 'test-key';
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://api.anthropic.com/v1/messages');
    assert.equal(options.headers['anthropic-version'], '2026-10-21');
    const requestBody = JSON.parse(options.body);
    assert.equal(requestBody.messages[0].content[0].source.data, image.toString('base64'));
    assert.equal(requestBody.messages[0].content[0].source.media_type, 'image/png');
    return {
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: '{"shop_name":"Sample Store","total_amount":89.5}' }]
      })
    };
  };

  try {
    await postExtract({
      ip: `anthropic-test-${Math.random()}`,
      file: { buffer: image, mimetype: 'image/png' }
    }, {
      status(status) {
        responseStatus = status;
        return this;
      },
      json(body) {
        responseBody = body;
        return this;
      }
    });

    assert.equal(responseStatus, 200);
    assert.deepEqual(responseBody, {
      data: { shop_name: 'Sample Store', total_amount: 89.5 }
    });
  } finally {
    global.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalApiKey;
  }
});