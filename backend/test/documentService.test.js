const { test } = require('node:test');
const assert = require('node:assert/strict');
const DocumentRepository = require('../src/repositories/documentRepository');
const createDocumentService = require('../src/services/documentService');

test('registra e consulta documentos por proprietário', () => {
  const service = createDocumentService(new DocumentRepository());
  const document = service.registerUpload(
    { filename: 'document-id', originalname: 'relatorio.pdf', size: 12 },
    'alice',
  );

  assert.deepStrictEqual(document, {
    id: 'document-id',
    originalName: 'relatorio.pdf',
    size: 12,
    uploadedAt: document.uploadedAt,
    owner: 'alice',
  });
  assert.ok(Number.isFinite(Date.parse(document.uploadedAt)));
  assert.deepStrictEqual(service.listDocuments('alice'), [document]);
  assert.deepStrictEqual(service.listDocuments('bob'), []);
  assert.strictEqual(service.findDocument(document.id, 'bob'), null);
});

test('rejeita registro sem arquivo válido', () => {
  const service = createDocumentService(new DocumentRepository());

  assert.throws(() => service.registerUpload(null), {
    name: 'TypeError',
    message: 'Arquivo inválido',
  });
});
