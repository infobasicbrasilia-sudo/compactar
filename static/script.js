let selectedFiles = [];

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const passwordInput = document.getElementById('password');
const generateBtn = document.getElementById('generatePassword');
const outputNameInput = document.getElementById('outputName');
const compactBtn = document.getElementById('compactBtn');
const progressDiv = document.getElementById('progress');
const resultDiv = document.getElementById('result');

uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    selectedFiles = [...selectedFiles, ...Array.from(e.target.files)];
    updateFileList();
    compactBtn.disabled = selectedFiles.length === 0;
});

function updateFileList() {
    fileList.innerHTML = selectedFiles.map((f, i) => `
        <div class="file-item">
            <span>📄 ${f.name} (${formatBytes(f.size)})</span>
            <button data-index="${i}" class="remove-btn">✖️</button>
        </div>
    `).join('');
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.onclick = () => {
            selectedFiles.splice(parseInt(btn.dataset.index), 1);
            updateFileList();
            compactBtn.disabled = selectedFiles.length === 0;
        };
    });
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

generateBtn.onclick = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let pass = '';
    for (let i = 0; i < 12; i++) pass += chars[Math.floor(Math.random() * chars.length)];
    passwordInput.value = pass;
};

compactBtn.onclick = async () => {
    if (selectedFiles.length === 0 || !passwordInput.value) return;

    const formData = new FormData();
    selectedFiles.forEach(f => formData.append('arquivos', f));
    formData.append('password', passwordInput.value);
    formData.append('outputName', outputNameInput.value);

    compactBtn.disabled = true;
    progressDiv.style.display = 'block';
    resultDiv.style.display = 'none';
    const progressFill = document.querySelector('.progress-fill');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/compactar', true);
    xhr.responseType = 'blob';

    xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
            const percent = (e.loaded / e.total) * 100;
            progressFill.style.width = percent + '%';
        }
    };

    xhr.onload = () => {
        if (xhr.status === 200) {
            const blob = xhr.response;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            let filename = 'protegido.zip';
            const cd = xhr.getResponseHeader('Content-Disposition');
            if (cd && cd.includes('filename=')) {
                filename = cd.split('filename=')[1].replace(/"/g, '');
            }
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            resultDiv.innerHTML = `<p>✅ ZIP criado com sucesso!<br>Senha: ${passwordInput.value}</p>`;
            resultDiv.style.display = 'block';
            // Limpar
            selectedFiles = [];
            updateFileList();
            passwordInput.value = '';
            outputNameInput.value = '';
            compactBtn.disabled = true;
        } else {
            const reader = new FileReader();
            reader.onload = () => {
                const err = JSON.parse(reader.result);
                resultDiv.innerHTML = `<p style="color:red">❌ Erro: ${err.error}</p>`;
                resultDiv.style.display = 'block';
            };
            reader.readAsText(xhr.response);
        }
        progressDiv.style.display = 'none';
        compactBtn.disabled = false;
    };

    xhr.onerror = () => {
        resultDiv.innerHTML = `<p style="color:red">❌ Erro de rede. Verifique se o servidor está rodando.</p>`;
        resultDiv.style.display = 'block';
        progressDiv.style.display = 'none';
        compactBtn.disabled = false;
    };

    xhr.send(formData);
};