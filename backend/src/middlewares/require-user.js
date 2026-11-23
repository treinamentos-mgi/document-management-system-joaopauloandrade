const { AppError } = require('../errors');

// A identidade deve ser definida por um middleware de autenticação confiável
// executado antes destas rotas. O cliente nunca informa o próprio `req.user`.
function requireUser(req, res, next) {
  const userId = req.user && req.user.id;

  if (typeof userId !== 'string' || userId.trim() === '') {
    return next(new AppError(401, 'AUTHENTICATION_REQUIRED', 'Autenticação necessária.'));
  }
  return next();
}

module.exports = { requireUser };
