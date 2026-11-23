// Metadados dos documentos mantidos em memória (perdidos ao reiniciar o processo).
const documents = new Map();

function compareNewestFirst(a, b) {
  if (a.uploadedAt !== b.uploadedAt) {
    return a.uploadedAt < b.uploadedAt ? 1 : -1;
  }
  return a.id.localeCompare(b.id);
}

function save(document) {
  documents.set(document.id, document);
  return document;
}

function findAllByOwner(owner) {
  return [...documents.values()]
    .filter((document) => document.owner === owner)
    .sort(compareNewestFirst);
}

function findByIdAndOwner(id, owner) {
  const document = documents.get(id);
  return document && document.owner === owner ? document : null;
}

module.exports = { save, findAllByOwner, findByIdAndOwner };
