const crypto = require('node:crypto');
const documentRepository = require('../repositories/document.repository');
const fileRepository = require('../repositories/file.repository');
const { AppError } = require('../errors');
const { assertContentMatchesExtension } = require('./file-signature.validator');

// Campos expostos ao cliente; caminho físico e tipo MIME ficam internos.
function toPublicDocument(document) {
  return {
    id: document.id,
    originalName: document.originalName,
    size: document.size,
    uploadedAt: document.uploadedAt,
    owner: document.owner,
  };
}

function createDocumentRecord(owner, file) {
  return {
    id: crypto.randomUUID(),
    originalName: file.originalname,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
    mimeType: file.mimetype,
    storedFilename: file.filename,
  };
}

function discardUpload(file) {
  return fileRepository.remove(file.filename);
}

async function registerDocument({ owner, file }) {
  try {
    await assertContentMatchesExtension(file);
  } catch (error) {
    await discardUpload(file);
    throw error;
  }

  const document = createDocumentRecord(owner, file);

  try {
    documentRepository.save(document);
  } catch {
    await discardUpload(file);
    throw new AppError(500, 'UPLOAD_FAILED', 'Não foi possível registrar o documento.');
  }

  return toPublicDocument(document);
}

function listDocuments(owner) {
  try {
    return documentRepository.findAllByOwner(owner).map(toPublicDocument);
  } catch {
    throw new AppError(500, 'DOCUMENT_LIST_FAILED', 'Não foi possível listar os documentos.');
  }
}

async function getDownloadTarget(owner, id) {
  const document = documentRepository.findByIdAndOwner(id, owner);

  if (!document || !(await fileRepository.exists(document.storedFilename))) {
    throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
  }

  return {
    filePath: fileRepository.resolveStoredPath(document.storedFilename),
    originalName: document.originalName,
    mimeType: document.mimeType,
  };
}

module.exports = { registerDocument, listDocuments, getDownloadTarget };
