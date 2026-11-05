const assert = require('node:assert/strict');
const express = require('express');
const { after, before, test } = require('node:test');
const { MAX_FILE_SIZE } = require('../controllers/indexController');
const router = require('../routes');

const app = express();
app.use(router);
let server;
let baseUrl;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

async function uploadImage(data, type, filename) {
  const formData = new FormData();
  formData.append('slip', new Blob([data], { type }), filename);
  return fetch(`${baseUrl}/api/extract`, { method: 'POST', body: formData });
}

test('rejects unsupported file types', async () => {
  const response = await uploadImage('not an image', 'application/pdf', 'receipt.pdf');
  assert.equal(response.status, 415);
});

test('rejects images with invalid file signatures', async () => {
  const response = await uploadImage('not a PNG', 'image/png', 'receipt.png');
  assert.equal(response.status, 415);
});

test('rejects files larger than 5 MB', async () => {
  const response = await uploadImage(Buffer.alloc(MAX_FILE_SIZE + 1), 'image/png', 'large.png');
  assert.equal(response.status, 413);
});

test('returns a safe configuration error when the API key is missing', async () => {
  const originalApiKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;

  try {
    const imageHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const response = await uploadImage(imageHeader, 'image/png', 'receipt.png');
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /Anthropic API key/);
  } finally {
    if (originalApiKey !== undefined) process.env.ANTHROPIC_API_KEY = originalApiKey;
  }
});