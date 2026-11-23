import { useState } from 'react';
import { uploadDocument } from '../services/documents.api.js';

const ACCEPTED_EXTENSIONS = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx';

export default function UploadComponent({ onUploaded }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedFile) {
      return;
    }

    const form = event.currentTarget;
    setUploading(true);
    setError(null);
    try {
      await uploadDocument(selectedFile);
      setSelectedFile(null);
      form.reset();
      onUploaded();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        disabled={uploading}
        onChange={(event) => setSelectedFile(event.target.files[0] ?? null)}
      />
      <button type="submit" disabled={!selectedFile || uploading}>
        {uploading ? 'Enviando...' : 'Enviar'}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
