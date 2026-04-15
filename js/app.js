// Estado da aplicação
let selectedFiles = [];
let isProcessing = false;
let zipBlob = null;

// Elementos DOM
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const passwordInput = document.getElementById('password');
const togglePasswordBtn = document.getElementById('togglePassword');
const generatePasswordBtn = document.getElementById('generatePassword');
const outputNameInput = document.getElementById('outputName');
const compressionLevel = document.getElementById('compressionLevel');
const compactBtn = document.getElementById('compactBtn');
const progressCard = document.getElementById('progressCard');
const resultCard = document.getElementById('resultCard');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');

// Utilitários
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function generateRandomPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'error' ? '#f44336' : '#4caf50'};
        color: white;
        padding: 12px 24px;
        border-radius: 50px;
        font-size: 14px;
        z-index: 10000;
        animation: slideUp 0.3s ease;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Criptografia AES-256
async function encryptWithAES(content, password) {
    // Gerar salt e IV aleatórios
    const salt = CryptoJS.lib.WordArray.random(128 / 8);
    const iv = CryptoJS.lib.WordArray.random(128 / 8);
    
    // Derivar chave usando PBKDF2
    const key = CryptoJS.PBKDF2(password, salt, {
        keySize: 256 / 32,
        iterations: 10000
    });
    
    // Criptografar
    const encrypted = CryptoJS.AES.encrypt(content, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    
    // Combinar salt + iv + dados criptografados
    const combined = salt.concat(iv).concat(encrypted.ciphertext);
    
    return combined.toString(CryptoJS.enc.Base64);
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

// Processar arquivos
async function processFiles() {
    if (selectedFiles.length === 0) {
        showNotification('❌ Selecione pelo menos um arquivo!', 'error');
        return;
    }
    
    const password = passwordInput.value;
    if (!password) {
        showNotification('❌ Digite uma senha para proteger o arquivo!', 'error');
        return;
    }
    
    if (isProcessing) return;
    isProcessing = true;
    compactBtn.disabled = true;
    
    // Mostrar progresso
    progressCard.style.display = 'block';
    resultCard.style.display = 'none';
    
    let originalTotalSize = 0;
    selectedFiles.forEach(f => originalTotalSize += f.size);
    document.getElementById('originalSize').textContent = formatBytes(originalTotalSize);
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        if (progress >= 90) clearInterval(interval);
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `Compactando e criptografando... ${progress}%`;
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
        
        progressText.textContent = 'Aplicando criptografia AES-256...';
        
        // Gerar ZIP
        const level = parseInt(compressionLevel.value);
        const compressionMap = {
            1: 'STORE',
            2: 'DEFLATE',
            3: 'DEFLATE',
            4: 'DEFLATE',
            5: 'DEFLATE',
            6: 'DEFLATE',
            7: 'DEFLATE',
            8: 'DEFLATE',
            9: 'DEFLATE'
        };
        
        zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: compressionMap[level] || 'DEFLATE',
            compressionOptions: { level: Math.min(level, 9) }
        });
        
        // Criptografar o ZIP com AES-256
        const reader = new FileReader();
        const zipBase64 = await new Promise((resolve) => {
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(zipBlob);
        });
        
        const encrypted = await encryptWithAES(zipBase64, password);
        
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
            
            // Download handler
            document.getElementById('downloadBtn').onclick = () => {
                const url = URL.createObjectURL(encryptedBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
                showNotification('📥 Download iniciado!');
            };
            
            // New file handler
            document.getElementById('newFileBtn').onclick = () => {
                selectedFiles = [];
                updateFileList();
                passwordInput.value = '';
                outputNameInput.value = '';
                resultCard.style.display = 'none';
                compactBtn.disabled = true;
            };
            
            // Copy password handler
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

// Upload handlers
uploadArea.addEventListener('click', () => fileInput.click());

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

// Password handlers
togglePasswordBtn.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    togglePasswordBtn.textContent = type === 'password' ? '👁️' : '🙈';
});

generatePasswordBtn.addEventListener('click', () => {
    passwordInput.value = generateRandomPassword();
    showNotification('🔑 Senha forte gerada!');
});

// Compactar
compactBtn.addEventListener('click', processFiles);