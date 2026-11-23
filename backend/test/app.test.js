const { describe, test, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const { once } = require('node:events');
const express = require('express');
const app = require('../src/app');
const config = require('../src/config');
const documentsRoutes = require('../src/routes/documents.routes');
const { errorHandler } = require('../src/middlewares/error-handler');

// Simula o middleware de autenticação confiável apenas nos testes, lendo a identidade de um cabeçalho de teste.
function createAuthenticatedApp() {
  const testApp = express();
  testApp.use((req, res, next) => {
    if (req.headers['x-test-user']) {
      req.user = { id: req.headers['x-test-user'] };
    }
    next();
  });
  testApp.use(documentsRoutes);
  testApp.use(errorHandler);
  return testApp;
}

async function startServer(expressApp) {
  const server = expressApp.listen(0);
  await once(server, 'listening');
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

function uploadDocument(baseUrl, user, { name, type, content }) {
  const form = new FormData();
  form.append('file', new Blob([content], { type }), name);
  const headers = user ? { 'x-test-user': user } : {};
  return fetch(`${baseUrl}/upload`, { method: 'POST', headers, body: form });
}

describe('rotas de documentos', () => {
  let server;
  let baseUrl;
  let storedBefore;

  before(async () => {
    ({ server, baseUrl } = await startServer(createAuthenticatedApp()));
  });

  after(() => server.close());

  beforeEach(() => {
    storedBefore = new Set(fs.readdirSync(config.storageDir));
  });

  afterEach(() => {
    for (const file of fs.readdirSync(config.storageDir)) {
      if (!storedBefore.has(file)) {
        fs.rmSync(`${config.storageDir}/${file}`, { force: true });
      }
    }
  });

  test('POST /upload sem identidade retorna 401 e não grava arquivo', async () => {
    const { server: plainServer, baseUrl: plainUrl } = await startServer(app);
    try {
      const response = await uploadDocument(plainUrl, null, {
        name: 'relatorio.pdf',
        type: 'application/pdf',
        content: '%PDF-1.4',
      });
      const body = await response.json();

      assert.strictEqual(response.status, 401);
      assert.strictEqual(body.error.code, 'AUTHENTICATION_REQUIRED');
      assert.deepStrictEqual(fs.readdirSync(config.storageDir), [...storedBefore]);
    } finally {
      plainServer.close();
    }
  });

  test('POST /upload grava o arquivo e retorna metadados sem caminho interno', async () => {
    const response = await uploadDocument(baseUrl, 'user-a', {
      name: 'relatorio.pdf',
      type: 'application/pdf',
      content: '%PDF-1.4 conteudo',
    });
    const { document } = await response.json();

    assert.strictEqual(response.status, 201);
    assert.strictEqual(document.originalName, 'relatorio.pdf');
    assert.strictEqual(document.owner, 'user-a');
    assert.strictEqual(document.size, Buffer.byteLength('%PDF-1.4 conteudo'));
    assert.strictEqual(document.storedFilename, undefined);
    assert.strictEqual(document.path, undefined);
    assert.strictEqual(fs.readdirSync(config.storageDir).length, storedBefore.size + 1);
  });

  test('POST /upload rejeita extensão não permitida e MIME incoerente com 415', async () => {
    const executable = await uploadDocument(baseUrl, 'user-a', {
      name: 'script.exe',
      type: 'application/x-msdownload',
      content: 'MZ',
    });
    const mismatched = await uploadDocument(baseUrl, 'user-a', {
      name: 'relatorio.pdf',
      type: 'text/plain',
      content: 'texto',
    });

    assert.strictEqual(executable.status, 415);
    assert.strictEqual((await executable.json()).error.code, 'UNSUPPORTED_FILE_TYPE');
    assert.strictEqual(mismatched.status, 415);
    assert.strictEqual(fs.readdirSync(config.storageDir).length, storedBefore.size);
  });

  test('POST /upload rejeita arquivo acima do limite com 413', async () => {
    const response = await uploadDocument(baseUrl, 'user-a', {
      name: 'grande.pdf',
      type: 'application/pdf',
      content: Buffer.alloc(config.uploadMaxSizeBytes + 1),
    });

    assert.strictEqual(response.status, 413);
    assert.strictEqual((await response.json()).error.code, 'FILE_TOO_LARGE');
  });

  test('GET /documents lista somente os documentos do próprio usuário', async () => {
    await uploadDocument(baseUrl, 'lista-dono', { name: 'a.pdf', type: 'application/pdf', content: 'a' });
    await uploadDocument(baseUrl, 'lista-outro', { name: 'b.pdf', type: 'application/pdf', content: 'b' });

    const response = await fetch(`${baseUrl}/documents`, { headers: { 'x-test-user': 'lista-dono' } });
    const { documents } = await response.json();

    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(
      documents.map((document) => document.originalName),
      ['a.pdf'],
    );
  });

  test('GET /documents/:id/download entrega o arquivo ao dono e responde 404 a outro usuário', async () => {
    const uploadResponse = await uploadDocument(baseUrl, 'user-a', {
      name: 'planilha.xlsx',
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      content: 'conteudo-binario',
    });
    const { document } = await uploadResponse.json();
    const url = `${baseUrl}/documents/${document.id}/download`;

    const owner = await fetch(url, { headers: { 'x-test-user': 'user-a' } });
    const intruder = await fetch(url, { headers: { 'x-test-user': 'user-b' } });

    assert.strictEqual(owner.status, 200);
    assert.strictEqual(await owner.text(), 'conteudo-binario');
    assert.match(owner.headers.get('content-disposition'), /^attachment; filename="planilha\.xlsx"/);
    assert.strictEqual(intruder.status, 404);
    assert.strictEqual((await intruder.json()).error.code, 'DOCUMENT_NOT_FOUND');
  });
});

// Teste de fumaça do seed: garante que o app Express foi exportado.
// Novos testes serão adicionados durante os Steps 2, 6 e 7 com auxílio do Copilot.
test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});
