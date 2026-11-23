const config = require('../config');

// Define o usuário de desenvolvimento a partir de DEV_USER_ID. Nunca lê dados enviados pelo cliente.
function attachDevUser(req, res, next) {
  if (config.devUserId) {
    req.user = { id: config.devUserId };
  }
  next();
}

module.exports = { attachDevUser };
