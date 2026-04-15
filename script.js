let selectedFiles = [];
let isProcessing = false;
let encryptedBlob = null;

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

compressionLevel.addEventListener('input', () => {
    levelValue.textContent = compressionLevel.value;
});

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
        background: ${type === 'error' ? '#EF4444' : '#10B981'};
        color: white;
        padding: 12px 24px;
        border-radius: 50px;
        font-size: 14px;
        z-index: 10000;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

async function encryptWithAES(content, password) {
    const salt = CryptoJS.lib.WordArray.random(128 / 8);
    const iv = CryptoJS.lib.WordArray.random(128 / 8);
    const key = CryptoJS.PBKDF2(password, salt, {
        keySize: 256 / 32,
        iterations: 10000
    });
    const encrypted = CryptoJS.AES.encrypt(content, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    const combined = salt.concat(iv).concat(encrypted.ciphertext);
    return combined.toString(CryptoJS.enc.Base64);
}

async function decryptWithAES(encryptedData, password) {
    const combined = CryptoJS.enc.Base64.parse(encryptedData);
    const salt = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4), 16);
    const iv = CryptoJS.lib.WordArray.create(combined.words.slice(4, 8), 16);
    const ciphertext = CryptoJS.lib.WordArray.create(combined.words.slice(8), combined.sigBytes - 32);
    const key = CryptoJS.PBKDF2(password, salt, {
        keySize: 256 / 32,
        iterations: 10000
    });
    const decrypted = CryptoJS.AES.decrypt({ ciphertext: ciphertext }, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    return decrypted.toString(CryptoJS.enc.Base64);
}

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
        progress += 10;
        if (progress >= 90) clearInterval(interval);
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `Compactando... ${progress}%`;
    }, 200);
    try {
        const zip = new JSZip();
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            const content = await file.arrayBuffer();
            zip.file(file.name, content);
        }
        progressText.textContent = 'Aplicando criptografia AES-256...';
        const level = parseInt(compressionLevel.value);
        const zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: Math.min(level, 9) }
        });
        const reader = new FileReader();
        const zipBase64 = await new Promise((resolve) => {
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(zipBlob);
        });
        const encrypted = await encryptWithAES(zipBase64, password);
        encryptedBlob = new Blob([encrypted], { type: 'application/octet-stream' });
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
            document.getElementById('downloadBtn').onclick = () => {
                const url = URL.createObjectURL(encryptedBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
            };
            document.getElementById('newFileBtn').onclick = () => {
                selectedFiles = [];
                updateFileList();
                passwordInput.value = '';
                outputNameInput.value = '';
                resultCard.style.display = 'none';
                compactBtn.disabled = true;
            };
            document.getElementById('copyPassword').onclick = () => {
                navigator.clipboard.writeText(password);
                showNotification('📋 Senha copiada!');
            };
        }, 500);
    } catch (error) {
        clearInterval(interval);
        progressCard.style.display = 'none';
        showNotification(`❌ Erro: ${error.message}`, 'error');
    } finally {
        isProcessing = false;
        compactBtn.disabled = selectedFiles.length === 0;
    }
}

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
    showNotification('🔓 Descriptografando...', 'info');
    try {
        const encryptedText = await file.text();
        const decryptedBase64 = await decryptWithAES(encryptedText, password);
        const binaryString = atob(decryptedBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const zipBlob = new Blob([bytes], { type: 'application/zip' });
        const zip = await JSZip.loadAsync(zipBlob);
        const firstFile = Object.keys(zip.files)[0];
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
        };
        showNotification('✅ Descriptografado com sucesso!');
    } catch (error) {
        showNotification('❌ Senha incorreta ou arquivo corrompido!', 'error');
    }
});

uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        selectedFiles.push(...Array.from(e.target.files));
        updateFileList();
        showNotification(`✅ ${e.target.files.length} arquivo(s) adicionado(s)`);
    }
    fileInput.value = '';
});
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
togglePasswordBtn.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    togglePasswordBtn.textContent = type === 'password' ? '👁️' : '🙈';
});
generatePasswordBtn.addEventListener('click', () => {
    passwordInput.value = generateRandomPassword();
    showNotification('🔑 Senha forte gerada!');
});
compactBtn.addEventListener('click', processFiles);

console.log('🚀 App pronto!');