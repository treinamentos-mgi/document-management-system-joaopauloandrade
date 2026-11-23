const { AppError } = require('../errors');

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }
  if (error instanceof AppError) {
    return res.status(error.status).json({ error: { code: error.code, message: error.message } });
  }
  if (error.type === 'entity.parse.failed') {
    return res
      .status(400)
      .json({ error: { code: 'INVALID_JSON', message: 'Corpo JSON inválido.' } });
  }

  console.error(error);
  return res
    .status(500)
    .json({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' } });
}

module.exports = { errorHandler };
