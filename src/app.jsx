import React, { useState, useCallback } from 'react';
import * as zip from '@zip.js/zip.js';
import './App.css';

function App() {
  const [files, setFiles] = useState([]);
  const [password, setPassword] = useState('');
  const [outputName, setOutputName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

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
  }, []);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Criar ZIP com senha REAL usando zip.js (WebAssembly)
  const createPasswordProtectedZip = async () => {
    if (files.length === 0) {
      alert('Selecione pelo menos um arquivo!');
      return;
    }

    if (!password) {
      alert('Digite uma senha!');
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      // Configurar o zip.js para usar WebAssembly
      zip.configure({
        useWebWorkers: true,
        useCompressionStream: false, // Forçar uso do WASM
      });

      // Criar um BlobWriter para o arquivo final
      const blobWriter = new zip.BlobWriter('application/zip');

      // Criar o ZipWriter com senha (AES-256)
      const zipWriter = new zip.ZipWriter(blobWriter, {
        password: password,
        encryptionStrength: 3, // AES-256
      });

      // Adicionar cada arquivo ao ZIP
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(Math.round((i / files.length) * 80));

        // Ler o arquivo como Blob
        const fileBlob = await file.slice().arrayBuffer();
        const reader = new zip.BlobReader(new Blob([fileBlob]));

        // Adicionar ao ZIP
        await zipWriter.add(file.name, reader);
      }

      setProgress(90);

      // Adicionar arquivo de instruções
      const instructions = `Arquivo ZIP protegido com senha
      
Senha: ${password}

Este arquivo foi criado com criptografia AES-256.
Para extrair, use qualquer programa que suporte ZIP com senha (WinRAR, 7-Zip, Windows nativo).
      `;
      await zipWriter.add('INSTRUCOES.txt', new zip.TextReader(instructions));

      setProgress(95);

      // Finalizar o ZIP
      const zipBlob = await zipWriter.close();

      setProgress(100);

      const timestamp = Date.now();
      const filename = `${outputName || 'protegido'}_${timestamp}.zip`;

      setResult({
        blob: zipBlob,
        filename: filename,
        password: password,
        size: formatBytes(zipBlob.size),
      });

      setIsProcessing(false);

    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao criar ZIP: ' + error.message);
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setFiles([]);
    setPassword('');
    setOutputName('');
    setResult(null);
    setProgress(0);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-container">
          <div className="logo">🔒</div>
          <div>
            <h1>BSBiA - ZIP com Senha (WASM)</h1>
            <p>Criptografia AES-256 | ZIP realmente protegido</p>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="container">
          {/* Upload Area */}
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
              <label>🔒 Senha do ZIP</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite a senha"
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
              <small className="password-hint">
                Esta senha será necessária para extrair o ZIP
              </small>
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

            <button
              className="btn-primary"
              onClick={createPasswordProtectedZip}
              disabled={isProcessing || files.length === 0}
            >
              {isProcessing ? `Criando ZIP protegido... ${progress}%` : '🔒 Criar ZIP com Senha'}
            </button>
          </div>

          {/* Progresso */}
          {isProcessing && (
            <div className="card">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}>
                  {progress}%
                </div>
              </div>
              <p className="progress-text">Criando ZIP com criptografia AES-256...</p>
            </div>
          )}

          {/* Resultado */}
          {result && (
            <div className="card result-card">
              <h3 className="success-title">✅ ZIP Protegido Criado!</h3>
              <div className="result-info">
                <div className="result-row">
                  <strong>Arquivo:</strong>
                  <span>{result.filename}</span>
                </div>
                <div className="result-row">
                  <strong>Senha:</strong>
                  <span className="password-display">{result.password}</span>
                  <button
                    className="copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(result.password);
                      alert('Senha copiada!');
                    }}
                  >
                    Copiar
                  </button>
                </div>
                <div className="result-row">
                  <strong>Tamanho:</strong>
                  <span>{result.size}</span>
                </div>
              </div>
              <div className="security-badge">
                🔐 Este ZIP está protegido com AES-256! Qualquer descompactador vai pedir a senha.
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
                <button className="btn-secondary" onClick={resetForm}>
                  🔄 Novo
                </button>
              </div>
            </div>
          )}

          {/* Info Card */}
          <div className="card info-card">
            <div className="info-content">
              <span className="info-icon">⚡</span>
              <div>
                <h4>WebAssembly de Alta Performance</h4>
                <p>Este sistema usa WebAssembly (WASM) para criptografia AES-256 em tempo real, processando arquivos diretamente no seu navegador.</p>
              </div>
            </div>
            <div className="info-content">
              <span className="info-icon">🔒</span>
              <div>
                <h4>Criptografia Militar</h4>
                <p>O ZIP gerado é compatível com WinRAR, 7-Zip, Windows e qualquer programa que suporte ZIP com senha.</p>
              </div>
            </div>
            <div className="info-content">
              <span className="info-icon">🚀</span>
              <div>
                <h4>100% Client-side</h4>
                <p>Tudo acontece no seu navegador. Seus arquivos nunca saem do seu computador.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="footer">
        <p>BSBiA Secure Compressor | AES-256 Encryption | WebAssembly Powered</p>
      </footer>
    </div>
  );
}

export default App;