const path = require('node:path');
const config = require('../config');
const fileRepository = require('../repositories/file.repository');
const { AppError } = require('../errors');

// Confere se o conteúdo começa com a assinatura do formato declarado pela extensão.
async function assertContentMatchesExtension(file) {
  const extension = path.extname(file.originalname).toLowerCase();
  const signature = config.fileSignaturesByExtension[extension];

  let header;
  try {
    header = await fileRepository.readLeadingBytes(file.filename, signature.length);
  } catch {
    throw new AppError(500, 'UPLOAD_FAILED', 'Não foi possível ler o arquivo enviado.');
  }

  if (!header.equals(signature)) {
    throw new AppError(
      415,
      'UNSUPPORTED_FILE_TYPE',
      'O conteúdo do arquivo não corresponde ao tipo informado.',
    );
  }
}

module.exports = { assertContentMatchesExtension };
