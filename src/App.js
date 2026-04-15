import React, { useState, useCallback } from 'react';
import axios from 'axios';
import './App.css';

// Configurar axios com a URL base do backend
const API_URL = 'http://localhost:5000';

function App() {
  const [files, setFiles] = useState([]);
  const [password, setPassword] = useState('');
  const [outputName, setOutputName] = useState('');
  const [compressionLevel, setCompressionLevel] = useState(5);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let newPassword = '';
    for (let i = 0; i < 12; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(newPassword);
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

  const handleSubmit = async () => {
    if (files.length === 0) {
      setError('Selecione pelo menos um arquivo!');
      return;
    }

    if (!password) {
      setError('Digite uma senha!');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setError(null);

    const formData = new FormData();
    files.forEach(file => {
      formData.append('arquivos', file);
    });
    formData.append('senha', password);
    formData.append('nome_saida', outputName);
    formData.append('nivel', compressionLevel);

    try {
      // Simular progresso
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await axios.post(`${API_URL}/compactar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000 // 5 minutos de timeout
      });

      clearInterval(interval);
      setProgress(100);
      setResult(response.data);
      
      setTimeout(() => {
        setIsProcessing(false);
      }, 500);
      
    } catch (error) {
      console.error('Erro:', error);
      let errorMsg = 'Erro ao compactar. Verifique se o servidor está rodando.';
      
      if (error.response) {
        errorMsg = error.response.data?.error || errorMsg;
      } else if (error.request) {
        errorMsg = 'Servidor não está respondendo. Certifique-se de que o backend está rodando em http://localhost:5000';
      }
      
      setError(errorMsg);
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const resetForm = () => {
    setFiles([]);
    setPassword('');
    setOutputName('');
    setResult(null);
    setProgress(0);
    setError(null);
  };

  const handleDownload = () => {
    if (result && result.download_url) {
      window.open(result.download_url, '_blank');
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-container">
          <div className="logo-placeholder">BSBiA</div>
          <div>
            <h1>Compactador Seguro</h1>
            <p>Criptografia AES-256 | Proteção por Senha</p>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="container">
          {/* Área de Upload */}
          <div className="card">
            <div
              className="upload-area"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => document.getElementById('fileInput').click()}
            >
              <div className="upload-icon">📦</div>
              <h3>Selecione seus arquivos</h3>
              <p>Arraste e solte ou clique para escolher</p>
              <small>Suporta múltiplos arquivos | Max 100MB</small>
              <input
                id="fileInput"
                type="file"
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>

            {error && (
              <div className="error-message">
                ⚠️ {error}
              </div>
            )}

            {files.length > 0 && (
              <div className="file-list">
                {files.map((file, index) => (
                  <div key={index} className="file-item">
                    <span className="file-name">📄 {file.name}</span>
                    <span className="file-size">{formatBytes(file.size)}</span>
                    <button
                      className="remove-file"
                      onClick={() => removeFile(index)}
                    >
                      ✖️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Configurações */}
          <div className="card">
            <div className="form-group">
              <label>🔒 Senha de Proteção</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="input"
                />
                <button
                  className="btn-icon"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
                <button className="btn-icon" onClick={generateRandomPassword}>
                  🎲
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>📝 Nome do arquivo (opcional)</label>
              <input
                type="text"
                value={outputName}
                onChange={(e) => setOutputName(e.target.value)}
                placeholder="ex: meus_documentos"
                className="input"
              />
            </div>

            <div className="form-group">
              <label>⚡ Nível de Compressão: {compressionLevel}</label>
              <input
                type="range"
                min="1"
                max="9"
                value={compressionLevel}
                onChange={(e) => setCompressionLevel(parseInt(e.target.value))}
                className="slider"
              />
              <div className="slider-labels">
                <span>Mais Rápido</span>
                <span>Equilibrado</span>
                <span>Mais Compacto</span>
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={isProcessing || files.length === 0}
            >
              {isProcessing ? 'Compactando...' : '🚀 Compactar e Proteger'}
            </button>
          </div>

          {/* Progresso */}
          {isProcessing && (
            <div className="card">
              <div className="progress-container">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="progress-text">Compactando... {progress}%</p>
              </div>
            </div>
          )}

          {/* Resultado */}
          {result && (
            <div className="card result-card">
              <div className="result-header">
                <span className="result-icon">✅</span>
                <h3>Arquivo Protegido!</h3>
              </div>
              <div className="result-info">
                <div className="result-row">
                  <strong>Arquivo:</strong>
                  <span>{result.arquivo}</span>
                </div>
                <div className="result-row">
                  <strong>Senha:</strong>
                  <span className="password-display">{result.senha}</span>
                  <button
                    className="btn-copy"
                    onClick={() => {
                      navigator.clipboard.writeText(result.senha);
                      alert('Senha copiada!');
                    }}
                  >
                    Copiar
                  </button>
                </div>
                <div className="result-row">
                  <strong>Tamanho:</strong>
                  <span>{result.tamanho}</span>
                </div>
              </div>
              <div className="result-actions">
                <button className="btn-download" onClick={handleDownload}>
                  ⬇️ Download
                </button>
                <button className="btn-secondary" onClick={resetForm}>
                  🔄 Novo Arquivo
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="footer">
        <p>🔒 BSBiA Secure Compressor | Todos os direitos reservados</p>
      </footer>
    </div>
  );
}

export default App;