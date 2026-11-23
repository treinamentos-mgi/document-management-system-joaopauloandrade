const express = require('express');
const multer = require('multer');
const path = require('node:path');
const DocumentRepository = require('./repositories/documentRepository');
const createDocumentService = require('./services/documentService');
const createFileStorageService = require('./services/fileStorageService');
const createDocumentController = require('./controllers/documentController');
const createDocumentRouter = require('./routes/documentRoutes');

const PORT = process.env.PORT || 3000;
const DEFAULT_STORAGE_DIRECTORY = path.resolve(__dirname, '../storage');

function createApp({ storageDirectory = DEFAULT_STORAGE_DIRECTORY } = {}) {
  const app = express();
  const documentRepository = new DocumentRepository();
  const documentService = createDocumentService(documentRepository);
  const fileStorageService = createFileStorageService(storageDirectory);
  const documentController = createDocumentController(
    documentService,
    fileStorageService,
  );

  app.use(express.json());
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  app.use(createDocumentRouter(documentController, storageDirectory));
  app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
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
