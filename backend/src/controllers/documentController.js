function createDocumentController(documentService, fileStorageService) {
  return {
    upload(req, res, next) {
      if (!req.file) {
        return res.status(400).json({ error: 'Arquivo obrigatório' });
      }

      try {
        const document = documentService.registerUpload(
          req.file,
          req.user.id,
        );
        res.status(201).json(document);
      } catch (error) {
        next(error);
      }
    },

    list(req, res, next) {
      try {
        res.json(documentService.listDocuments(req.user.id));
      } catch (error) {
        next(error);
      }
    },

    download(req, res, next) {
      try {
        const document = documentService.findDocument(
          req.params.id,
          req.user.id,
        );
        const filePath = document && fileStorageService.getFilePath(document.id);

        if (!filePath) {
          return res.status(404).json({ error: 'Documento não encontrado' });
        }

        res.download(filePath, document.originalName, (error) => {
          if (error) {
            next(error);
          }
        });
      } catch (error) {
        next(error);
      }
    },
  };
}

module.exports = createDocumentController;
