const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const multer = require('multer');
const { requireUser } = require('../middlewares/require-user');

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

  router.post('/upload', requireUser, upload.single('file'), controller.upload);
  router.get('/documents', requireUser, controller.list);
  router.get('/documents/:id/download', requireUser, controller.download);

  return router;
}

module.exports = createDocumentRouter;
