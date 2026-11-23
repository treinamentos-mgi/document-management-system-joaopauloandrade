const express = require('express');
const documentsController = require('../controllers/documents.controller');
const { requireUser } = require('../middlewares/require-user');

const router = express.Router();

// requireUser precede o recebimento do arquivo para não gravar uploads de
// requisições não autenticadas.
router.post('/upload', requireUser, documentsController.receiveFile, documentsController.upload);
router.get('/documents', requireUser, documentsController.list);
router.get('/documents/:id/download', requireUser, documentsController.download);

module.exports = router;
