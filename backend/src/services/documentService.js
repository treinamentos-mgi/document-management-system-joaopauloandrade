function createDocumentService(documentRepository) {
  return {
    registerUpload(file, owner = 'anonymous') {
      if (!file?.filename || !file.originalname) {
        throw new TypeError('Arquivo inválido');
      }

      return documentRepository.save({
        id: file.filename,
        originalName: file.originalname,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        owner,
      });
    },

    listDocuments(owner = 'anonymous') {
      return documentRepository
        .findAll()
        .filter((document) => document.owner === owner);
    },

    findDocument(id, owner = 'anonymous') {
      const document = documentRepository.findById(id);
      return document?.owner === owner ? document : null;
    },
  };
}

module.exports = createDocumentService;
