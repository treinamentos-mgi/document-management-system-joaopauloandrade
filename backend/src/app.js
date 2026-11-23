const express = require('express');
const multer = require('multer');
const RateLimit = require('express-rate-limit');
const path = require('node:path');
const { AppError } = require('./errors');
const { attachDevUser } = require('./middlewares/dev-user');
const DocumentRepository = require('./repositories/documentRepository');
const createDocumentService = require('./services/documentService');
const createFileStorageService = require('./services/fileStorageService');
const createDocumentController = require('./controllers/documentController');
const createDocumentRouter = require('./routes/documentRoutes');

const PORT = process.env.PORT || 3000;
const DEFAULT_STORAGE_DIRECTORY = path.resolve(__dirname, '../storage');

function createApp({
  storageDirectory = DEFAULT_STORAGE_DIRECTORY,
  authenticateRequest = attachDevUser,
} = {}) {
  const app = express();
  const documentRepository = new DocumentRepository();
  const documentService = createDocumentService(documentRepository);
  const fileStorageService = createFileStorageService(storageDirectory);
  const documentController = createDocumentController(
    documentService,
    fileStorageService,
  );
  const requestRateLimit = RateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(express.json());
  app.use(authenticateRequest);
  app.use(requestRateLimit);
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  app.use(createDocumentRouter(documentController, storageDirectory));
  app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }

    if (error instanceof AppError) {
      return res.status(error.status).json({
        error: { code: error.code, message: error.message },
      });
    }

    const status = error instanceof multer.MulterError ? 400 : 500;
    res.status(status).json({ error: status === 400 ? error.message : 'Erro interno do servidor' });
  });

  return app;
}

const app = createApp();

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

module.exports = app;
module.exports.createApp = createApp;
