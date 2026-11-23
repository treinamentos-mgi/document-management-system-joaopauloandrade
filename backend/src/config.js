const path = require('node:path');

const DEFAULT_UPLOAD_MAX_SIZE_BYTES = 10 * 1024 * 1024;

// Extensão -> MIME esperado. Um arquivo só é aceito se a extensão e o MIME
// declarados forem coerentes com esta tabela.
const SUPPORTED_UPLOAD_TYPES = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

// Assinatura (bytes iniciais) do formato real do arquivo, em hexadecimal.
// PDF: %PDF; Office legado (OLE2): D0 CF 11 E0 ...; Office OOXML (ZIP): PK\x03\x04.
const FILE_SIGNATURES_HEX = {
  '.pdf': '25504446',
  '.doc': 'd0cf11e0a1b11ae1',
  '.xls': 'd0cf11e0a1b11ae1',
  '.ppt': 'd0cf11e0a1b11ae1',
  '.docx': '504b0304',
  '.xlsx': '504b0304',
  '.pptx': '504b0304',
};

function parseMaxSize(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_UPLOAD_MAX_SIZE_BYTES;
}

function parseAllowedMimeTypes(value) {
  if (!value) {
    return Object.values(SUPPORTED_UPLOAD_TYPES);
  }
  return value
    .split(',')
    .map((mimeType) => mimeType.trim().toLowerCase())
    .filter(Boolean);
}

const allowedMimeTypes = parseAllowedMimeTypes(process.env.UPLOAD_ALLOWED_MIME_TYPES);

module.exports = {
  storageDir: path.resolve(__dirname, '..', 'storage'),
  // Identidade fixa apenas para desenvolvimento local; ignorada em produção.
  devUserId: process.env.NODE_ENV === 'production' ? null : process.env.DEV_USER_ID || null,
  uploadMaxSizeBytes: parseMaxSize(process.env.UPLOAD_MAX_SIZE_BYTES),
  uploadTypesByExtension: Object.fromEntries(
    Object.entries(SUPPORTED_UPLOAD_TYPES).filter(([, mimeType]) =>
      allowedMimeTypes.includes(mimeType),
    ),
  ),
  fileSignaturesByExtension: Object.fromEntries(
    Object.entries(FILE_SIGNATURES_HEX).map(([extension, hex]) => [
      extension,
      Buffer.from(hex, 'hex'),
    ]),
  ),
};
