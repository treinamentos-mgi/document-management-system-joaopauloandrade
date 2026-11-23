const fs = require('node:fs');
const path = require('node:path');

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createFileStorageService(storageDirectory) {
  return {
    getFilePath(id) {
      if (!UUID_PATTERN.test(id)) {
        return null;
      }

      const filePath = path.join(storageDirectory, id);
      return fs.existsSync(filePath) ? filePath : null;
    },
  };
}

module.exports = createFileStorageService;
