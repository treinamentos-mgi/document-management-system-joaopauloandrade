class DocumentRepository {
  constructor() {
    this.documents = new Map();
  }

  save(document) {
    this.documents.set(document.id, { ...document });
    return { ...document };
  }

  findAll() {
    return [...this.documents.values()].map((document) => ({ ...document }));
  }

  findById(id) {
    const document = this.documents.get(id);
    return document ? { ...document } : null;
  }
}

module.exports = DocumentRepository;
