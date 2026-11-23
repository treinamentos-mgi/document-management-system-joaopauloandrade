const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const multer = require('multer');
const { rateLimit } = require('express-rate-limit');

const DEFAULT_STORAGE_DIRECTORY = path.resolve(__dirname, '../../storage');

function createDocumentRouter(controller, storageDirectory = DEFAULT_STORAGE_DIRECTORY) {
  const router = express.Router();
  const storage = multer.diskStorage({
    destination(req, file, callback) {
      fs.mkdir(storageDirectory, { recursive: true }, (error) => {
        callback(error, storageDirectory);
      });
    },
    filename(req, file, callback) {
      callback(null, randomUUID());
    },
  });
  const upload = multer({ storage });
  const uploadRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
  });

  router.post('/upload', uploadRateLimit, upload.single('file'), controller.upload);
  router.get('/documents', controller.list);
  router.get('/documents/:id/download', controller.download);

  return router;
}

module.exports = createDocumentRouter;
