const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const { createApp } = require('../src/app');

function authenticateTestUser(req, res, next) {
  if (req.headers['x-test-user']) {
    req.user = { id: req.headers['x-test-user'] };
  }
  next();
}

test('faz upload, lista e baixa arquivos do proprietário', async (t) => {
  const storageDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-test-'));
  const server = createApp({
    storageDirectory,
    authenticateRequest: authenticateTestUser,
  }).listen(0);
  await once(server, 'listening');
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(storageDirectory, { recursive: true, force: true });
  });

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const emptyFormResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'x-test-user': 'alice' },
    body: new FormData(),
  });
  assert.strictEqual(emptyFormResponse.status, 400);

  const form = new FormData();
  form.append('file', new Blob(['conteúdo do documento']), 'documento.txt');

  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'x-test-user': 'alice' },
    body: form,
  });
  assert.strictEqual(uploadResponse.status, 201);

  const document = await uploadResponse.json();
  assert.strictEqual(document.originalName, 'documento.txt');
  assert.strictEqual(document.owner, 'alice');

  const listResponse = await fetch(`${baseUrl}/documents`, {
    headers: { 'x-test-user': 'alice' },
  });
  assert.deepStrictEqual(await listResponse.json(), [document]);

  const otherOwnerResponse = await fetch(`${baseUrl}/documents`, {
    headers: { 'x-test-user': 'bob' },
  });
  assert.deepStrictEqual(await otherOwnerResponse.json(), []);

  const downloadResponse = await fetch(
    `${baseUrl}/documents/${document.id}/download`,
    { headers: { 'x-test-user': 'alice' } },
  );
  assert.strictEqual(await downloadResponse.text(), 'conteúdo do documento');

  const unauthorizedDownload = await fetch(
    `${baseUrl}/documents/${document.id}/download`,
    { headers: { 'x-test-user': 'bob' } },
  );
  assert.strictEqual(unauthorizedDownload.status, 404);

  const missingDocument = await fetch(
    `${baseUrl}/documents/00000000-0000-4000-8000-000000000000/download`,
    { headers: { 'x-test-user': 'alice' } },
  );
  assert.strictEqual(missingDocument.status, 404);
});

test('preserva o endpoint de saúde', async (t) => {
  const server = createApp().listen(0);
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/health`);
  assert.deepStrictEqual(await response.json(), { status: 'ok' });
});

test('limita requisições de upload', async (t) => {
  const storageDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-rate-limit-'));
  const server = createApp({
    storageDirectory,
    authenticateRequest: authenticateTestUser,
  }).listen(0);
  await once(server, 'listening');
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(storageDirectory, { recursive: true, force: true });
  });

  const uploadUrl = `http://127.0.0.1:${server.address().port}/upload`;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'x-test-user': 'alice' },
      body: new FormData(),
    });
    assert.strictEqual(response.status, 400);
  }

  const limitedResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'x-test-user': 'alice' },
    body: new FormData(),
  });
  assert.strictEqual(limitedResponse.status, 429);
});
