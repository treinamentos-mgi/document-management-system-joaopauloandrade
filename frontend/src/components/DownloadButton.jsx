import { useState } from 'react';
import { downloadDocument } from '../services/documents.api.js';

export default function DownloadButton({ documentId, fileName }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  async function handleClick() {
    setDownloading(true);
    setError(null);
    try {
      const blob = await downloadDocument(documentId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <button type="button" onClick={handleClick} disabled={downloading}>
        {downloading ? 'Baixando...' : 'Baixar'}
      </button>
      {error && <span role="alert"> {error}</span>}
    </>
  );
}
