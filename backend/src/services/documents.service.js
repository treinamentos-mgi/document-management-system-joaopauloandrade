const crypto = require('node:crypto');
const path = require('node:path');
const config = require('../config');
const documentRepository = require('../repositories/document.repository');
const fileRepository = require('../repositories/file.repository');
const { AppError } = require('../errors');

function toPublicDocument(document) {
  return {
    id: document.id,
    originalName: document.originalName,
    size: document.size,
    uploadedAt: document.uploadedAt,
    owner: document.owner,
  };
}

// Confere se o conteúdo começa com a assinatura do formato declarado pela extensão.
async function assertContentMatchesExtension(file) {
  const extension = path.extname(file.originalname).toLowerCase();
  const signature = config.fileSignaturesByExtension[extension];

  let header;
  try {
    header = await fileRepository.readLeadingBytes(file.filename, signature.length);
  } catch {
    await fileRepository.remove(file.filename);
    throw new AppError(500, 'UPLOAD_FAILED', 'Não foi possível ler o arquivo enviado.');
  }

  if (!header.equals(signature)) {
    await fileRepository.remove(file.filename);
    throw new AppError(
      415,
      'UNSUPPORTED_FILE_TYPE',
      'O conteúdo do arquivo não corresponde ao tipo informado.',
    );
  }
}

async function registerDocument({ owner, file }) {
  await assertContentMatchesExtension(file);

  const document = {
    id: crypto.randomUUID(),
    originalName: file.originalname,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
    mimeType: file.mimetype,
    storedFilename: file.filename,
  };

  try {
    documentRepository.save(document);
  } catch {
    await fileRepository.remove(file.filename);
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
