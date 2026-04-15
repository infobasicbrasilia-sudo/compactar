import React, { useState, useCallback, useEffect } from 'react';
import JSZip from 'jszip';
import './App.css';

function App() {
  const [files, setFiles] = useState([]);
  const [outputName, setOutputName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Adiciona a imagem de fundo (BrasilIALogo.png) dinamicamente
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      body::before {
        content: "";
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-image: url('/BrasilIALogo.png');
        background-repeat: no-repeat;
        background-position: center;
        background-size: contain;
        opacity: 0.15;
        pointer-events: none;
        z-index: 0;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);
    setError(null);
  }, []);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selectedFiles]);
    setError(null);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const createZip = async () => {
    if (files.length === 0) {
      setError('Selecione pelo menos um arquivo!');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      const zip = new JSZip();
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(Math.round((i / files.length) * 90));
        const content = await file.arrayBuffer();
        zip.file(file.name, content);
      }
      setProgress(95);
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      setProgress(100);

      const timestamp = Date.now();
      const filename = `${outputName || 'compactado'}_${timestamp}.zip`;

      setResult({
        blob: zipBlob,
        filename: filename,
        size: formatBytes(zipBlob.size),
      });
      setIsProcessing(false);
    } catch (err) {
      setError('Erro ao criar ZIP: ' + err.message);
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setFiles([]);
    setOutputName('');
    setResult(null);
    setProgress(0);
    setError(null);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-container">
          <div className="logo">📦</div>
          <div>
            <h1>Brasil IA - Compactador ZIP</h1>
            <p>Compacte seus arquivos em um único ZIP</p>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="container">
          {!result && (
            <>
              <div className="card">
                <div
                  className="upload-area"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('fileInput').click()}
                >
                  <div className="upload-icon">📁</div>
                  <h3>Clique ou arraste arquivos aqui</h3>
                  <p>Selecione um ou mais arquivos</p>
                  <small>Suporta múltiplos arquivos</small>
                  <input
                    id="fileInput"
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                </div>

                {files.length > 0 && (
                  <div className="file-list">
                    {files.map((file, index) => (
                      <div key={index} className="file-item">
                        <span>📄 {file.name} ({formatBytes(file.size)})</span>
                        <button className="remove-file" onClick={() => removeFile(index)}>✖️</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card">
                <div className="form-group">
                  <label>📝 Nome do ZIP (opcional)</label>
                  <input
                    type="text"
                    value={outputName}
                    onChange={(e) => setOutputName(e.target.value)}
                    placeholder="ex: meus_documentos"
                    className="input"
                  />
                </div>

                {error && <div className="error-message">{error}</div>}

                <button
                  className="btn-primary"
                  onClick={createZip}
                  disabled={isProcessing || files.length === 0}
                >
                  {isProcessing ? `Compactando... ${progress}%` : '📦 Criar ZIP'}
                </button>
              </div>

              {isProcessing && (
                <div className="card">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }}>{progress}%</div>
                  </div>
                  <p className="progress-text">Compactando arquivos...</p>
                </div>
              )}
            </>
          )}

          {result && (
            <div className="card result-card">
              <h3 className="success-title">✅ ZIP Criado!</h3>
              <div className="result-info">
                <div className="result-row"><strong>Arquivo:</strong><span>{result.filename}</span></div>
                <div className="result-row"><strong>Tamanho:</strong><span>{result.size}</span></div>
              </div>
              <div className="result-actions">
                <button
                  className="btn-download"
                  onClick={() => {
                    const url = URL.createObjectURL(result.blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = result.filename;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  ⬇️ Download ZIP
                </button>
                <button className="btn-secondary" onClick={resetForm}>🔄 Novo ZIP</button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="footer">
        <p>Desenvolvido pelos alunos de Informática Brasil IA</p>
      </footer>
    </div>
  );
}

export default App;