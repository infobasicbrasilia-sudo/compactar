let selectedFiles = [];
let isProcessing = false;

// Elementos DOM
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const passwordInput = document.getElementById('password');
const togglePasswordBtn = document.getElementById('togglePassword');
const generatePasswordBtn = document.getElementById('generatePassword');
const outputNameInput = document.getElementById('outputName');
const compressionLevel = document.getElementById('compressionLevel');
const levelValue = document.getElementById('levelValue');
const compactBtn = document.getElementById('compactBtn');
const progressCard = document.getElementById('progressCard');
const resultCard = document.getElementById('resultCard');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const decryptBtn = document.getElementById('decryptBtn');
const decryptFileInput = document.getElementById('decryptFileInput');
const decryptCard = document.getElementById('decryptCard');

// Mostrar valor do nível
compressionLevel.addEventListener('input', () => {
    levelValue.textContent = compressionLevel.value;
});

// Formatar bytes
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Gerar senha aleatória
function generateRandomPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// Mostrar notificação
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'error' ? '#EF4444' : type === 'warning' ? '#F59E0B' : '#10B981'};
        color: white;
        padding: 12px 24px;
        border-radius: 50px;
        font-size: 14px;
        z-index: 10000;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Atualizar lista de arquivos
function updateFileList() {
    if (selectedFiles.length === 0) {
        fileList.innerHTML = '';
        return;
    }
    
    fileList.innerHTML = selectedFiles.map((file, index) => `
        <div class="file-item">
            <span class="file-name">📄 ${file.name}</span>
            <span class="file-size">${formatBytes(file.size)}</span>
            <button class="remove-file" data-index="${index}">✖️</button>
        </div>
    `).join('');
    
    document.querySelectorAll('.remove-file').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            selectedFiles.splice(index, 1);
            updateFileList();
            compactBtn.disabled = selectedFiles.length === 0;
        });
    });
    
    compactBtn.disabled = selectedFiles.length === 0;
}

// COMPACTAR E CRIPTOGRAFAR
async function processFiles() {
    if (selectedFiles.length === 0) {
        showNotification('❌ Selecione pelo menos um arquivo!', 'error');
        return;
    }
    
    const password = passwordInput.value;
    if (!password) {
        showNotification('❌ Digite uma senha!', 'error');
        return;
    }
    
    if (isProcessing) return;
    isProcessing = true;
    compactBtn.disabled = true;
    
    progressCard.style.display = 'block';
    resultCard.style.display = 'none';
    
    let originalTotalSize = 0;
    selectedFiles.forEach(f => originalTotalSize += f.size);
    document.getElementById('originalSize').textContent = formatBytes(originalTotalSize);
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += 5;
        if (progress >= 90) clearInterval(interval);
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `Processando... ${progress}%`;
    }, 200);
    
    try {
        // Criar ZIP
        const zip = new JSZip();
        
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            const content = await file.arrayBuffer();
            zip.file(file.name, content);
            progressText.textContent = `Adicionando ${file.name}...`;
        }
        
        progressText.textContent = 'Gerando arquivo ZIP...';
        
        const level = parseInt(compressionLevel.value);
        const zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: Math.min(level, 9) }
        });
        
        progressText.textContent = 'Aplicando criptografia AES-256...';
        
        // Converter para Base64
        const zipBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(zipBlob);
        });
        
        // Extrair apenas o base64 (sem o prefixo)
        const base64Data = zipBase64.split(',')[1];
        
        // Criptografar com AES
        const encrypted = CryptoJS.AES.encrypt(base64Data, password).toString();
        
        // Criar arquivo criptografado
        const encryptedBlob = new Blob([encrypted], { type: 'application/octet-stream' });
        
        clearInterval(interval);
        progressFill.style.width = '100%';
        progressText.textContent = 'Concluído!';
        
        setTimeout(() => {
            progressCard.style.display = 'none';
            
            const timestamp = Date.now();
            const outputName = outputNameInput.value || 'arquivo_criptografado';
            const filename = `${outputName}_${timestamp}.bsbia`;
            
            document.getElementById('resultFilename').textContent = filename;
            document.getElementById('resultPassword').textContent = password;
            document.getElementById('compressedSize').textContent = formatBytes(encryptedBlob.size);
            
            resultCard.style.display = 'block';
            showNotification('✅ Arquivo criptografado com sucesso!');
            
            // Download
            document.getElementById('downloadBtn').onclick = () => {
                const url = URL.createObjectURL(encryptedBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
                showNotification('📥 Download iniciado!');
            };
            
            // Novo arquivo
            document.getElementById('newFileBtn').onclick = () => {
                selectedFiles = [];
                updateFileList();
                passwordInput.value = '';
                outputNameInput.value = '';
                resultCard.style.display = 'none';
                compactBtn.disabled = true;
            };
            
            // Copiar senha
            document.getElementById('copyPassword').onclick = () => {
                navigator.clipboard.writeText(password);
                showNotification('📋 Senha copiada!');
            };
            
        }, 500);
        
    } catch (error) {
        console.error('Erro:', error);
        clearInterval(interval);
        progressCard.style.display = 'none';
        showNotification(`❌ Erro: ${error.message}`, 'error');
    } finally {
        isProcessing = false;
        compactBtn.disabled = selectedFiles.length === 0;
    }
}

// DESCRIPTOGRAFAR
decryptBtn.addEventListener('click', () => {
    decryptFileInput.click();
});

decryptFileInput.addEventListener('change', async (e) => {
    if (!e.target.files.length) return;
    
    const file = e.target.files[0];
    const password = prompt('🔐 Digite a senha para descriptografar:');
    
    if (!password) {
        showNotification('❌ Senha necessária!', 'error');
        return;
    }
    
    showNotification('🔓 Descriptografando...', 'warning');
    
    try {
        // Ler arquivo criptografado
        const encryptedText = await file.text();
        
        // Descriptografar
        const decryptedBase64 = CryptoJS.AES.decrypt(encryptedText, password).toString(CryptoJS.enc.Utf8);
        
        if (!decryptedBase64) {
            throw new Error('Senha incorreta');
        }
        
        // Converter Base64 para Blob
        const binaryString = atob(decryptedBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        const zipBlob = new Blob([bytes], { type: 'application/zip' });
        
        // Carregar ZIP
        const zip = await JSZip.loadAsync(zipBlob);
        
        // Listar arquivos
        const filesList = Object.keys(zip.files);
        if (filesList.length === 0) {
            throw new Error('Nenhum arquivo encontrado no ZIP');
        }
        
        // Extrair primeiro arquivo
        const firstFile = filesList[0];
        const content = await zip.files[firstFile].async('blob');
        
        document.getElementById('decryptFilename').textContent = firstFile;
        decryptCard.style.display = 'block';
        
        document.getElementById('downloadDecryptedBtn').onclick = () => {
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = firstFile;
            a.click();
            URL.revokeObjectURL(url);
            showNotification('📥 Download iniciado!');
        };
        
        showNotification('✅ Descriptografado com sucesso!');
        
    } catch (error) {
        console.error('Erro:', error);
        showNotification('❌ Senha incorreta ou arquivo corrompido!', 'error');
        decryptCard.style.display = 'none';
    }
});

// Upload por clique
uploadArea.addEventListener('click', () => fileInput.click());

// Upload por seleção
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        selectedFiles.push(...Array.from(e.target.files));
        updateFileList();
        showNotification(`✅ ${e.target.files.length} arquivo(s) adicionado(s)`);
    }
    fileInput.value = '';
});

// Drag & drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
        selectedFiles.push(...files);
        updateFileList();
        showNotification(`✅ ${files.length} arquivo(s) adicionado(s)`);
    }
});

// Mostrar/ocultar senha
togglePasswordBtn.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    togglePasswordBtn.textContent = type === 'password' ? '👁️' : '🙈';
});

// Gerar senha aleatória
generatePasswordBtn.addEventListener('click', () => {
    passwordInput.value = generateRandomPassword();
    showNotification('🔑 Senha forte gerada!');
});

// Botão compactar
compactBtn.addEventListener('click', processFiles);

console.log('🚀 Aplicação pronta! Selecione arquivos para começar.');