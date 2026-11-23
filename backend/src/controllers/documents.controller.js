const multer = require('multer');
const documentsService = require('../services/documents.service');
const fileRepository = require('../repositories/file.repository');
const { AppError } = require('../errors');

function toUploadError(error) {
  if (error instanceof AppError) {
    return error;
  }
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return new AppError(413, 'FILE_TOO_LARGE', 'O arquivo excede o tamanho máximo permitido.');
    }
    return new AppError(400, 'FILE_REQUIRED', 'Envie exatamente um arquivo no campo "file".');
  }
  // Erros de sistema de arquivos (ex.: disco cheio) possuem `syscall`.
  if (error.syscall) {
    return new AppError(500, 'UPLOAD_FAILED', 'Não foi possível gravar o arquivo.');
  }
  return new AppError(400, 'FILE_REQUIRED', 'Requisição multipart inválida.');
}

function receiveFile(req, res, next) {
  fileRepository.uploadSingleFile(req, res, (error) => {
    next(error ? toUploadError(error) : undefined);
  });
}

async function upload(req, res, next) {
  try {
    if (!req.file) {
      throw new AppError(400, 'FILE_REQUIRED', 'Envie um arquivo no campo "file".');
    }
    const document = await documentsService.registerDocument({
      owner: req.user.id,
      file: req.file,
    });
    res.status(201).json({ document });
  } catch (error) {
    next(error);
  }
}

function list(req, res, next) {
  try {
    const documents = documentsService.listDocuments(req.user.id);
    res.status(200).json({ documents });
  } catch (error) {
    next(error);
  }
}

async function download(req, res, next) {
  try {
    const target = await documentsService.getDownloadTarget(req.user.id, req.params.id);
    res.attachment(target.originalName);
    res.type(target.mimeType);
    res.sendFile(target.filePath, (error) => {
      if (error && !res.headersSent) {
        res.removeHeader('Content-Disposition');
        res.removeHeader('Content-Type');
        next(new AppError(500, 'DOWNLOAD_FAILED', 'Não foi possível ler o arquivo.'));
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { receiveFile, upload, list, download };
