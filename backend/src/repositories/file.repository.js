const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const multer = require('multer');
const config = require('../config');
const { AppError } = require('../errors');

fs.mkdirSync(config.storageDir, { recursive: true });

// O nome físico é gerado pelo sistema; o nome enviado pelo cliente nunca vira caminho.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.storageDir),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${extension}`);
  },
});

// Navegadores enviam octet-stream quando o sistema operacional não reconhece o formato.
const GENERIC_MIME_TYPES = ['application/octet-stream', ''];

function fileFilter(req, file, cb) {
  const extension = path.extname(file.originalname).toLowerCase();
  const expectedMimeType = config.uploadTypesByExtension[extension];
  const declaredMimeType = (file.mimetype || '').toLowerCase();
  const isCompatibleMime =
    declaredMimeType === expectedMimeType || GENERIC_MIME_TYPES.includes(declaredMimeType);

  if (!expectedMimeType || !isCompatibleMime) {
    return cb(new AppError(415, 'UNSUPPORTED_FILE_TYPE', 'Tipo de arquivo não permitido.'));
  }
  return cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.uploadMaxSizeBytes, files: 1 },
});

function resolveStoredPath(storedFilename) {
  return path.join(config.storageDir, path.basename(storedFilename));
}

async function exists(storedFilename) {
  try {
    await fs.promises.access(resolveStoredPath(storedFilename), fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function remove(storedFilename) {
  await fs.promises.rm(resolveStoredPath(storedFilename), { force: true });
}

module.exports = {
  uploadSingleFile: upload.single('file'),
  resolveStoredPath,
  exists,
  remove,
};
