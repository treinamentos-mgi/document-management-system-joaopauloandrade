import DownloadButton from './DownloadButton.jsx';

function formatSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KiB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleString('pt-BR');
}

export default function DocumentList({ documents, loading, error, onRetry }) {
  if (loading) {
    return <p>Carregando documentos...</p>;
  }

  if (error) {
    return (
      <div role="alert">
        <p>{error}</p>
        <button type="button" onClick={onRetry}>
          Tentar novamente
        </button>
      </div>
    );
  }

  if (documents.length === 0) {
    return <p>Nenhum documento enviado ainda.</p>;
  }

  return (
    <ul>
      {documents.map((doc) => (
        <li key={doc.id}>
          <strong>{doc.originalName}</strong> — {formatSize(doc.size)} —{' '}
          <time dateTime={doc.uploadedAt}>{formatDate(doc.uploadedAt)}</time>{' '}
          <DownloadButton documentId={doc.id} fileName={doc.originalName} />
        </li>
      ))}
    </ul>
  );
}
