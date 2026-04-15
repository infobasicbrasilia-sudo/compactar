/**
 * COMPACTADOR DE ARQUIVOS COM SENHA
 * Versão: 2.1 - CORRIGIDA
 * Descrição: Sistema completo para compactar arquivos com proteção por senha
 */

// ============================================
// CONFIGURAÇÕES GLOBAIS
// ============================================
const CONFIG = {
    TAMANHO_MAXIMO_ARQUIVO: 500 * 1024 * 1024,
    TEMPO_LIMPEZA_AUTOMATICA: 3600000,
    NIVEL_COMPRESSAO_PADRAO: 5,
    TAMANHO_SENHA_PADRAO: 12
};

// ============================================
// ESTADO DA APLICAÇÃO
// ============================================
const estado = {
    arquivoSelecionado: null,
    processando: false
};

// ============================================
// ELEMENTOS DO DOM
// ============================================
const elementos = {
    uploadArea: null,
    fileInput: null,
    btnCompactar: null,
    senhaInput: null,
    toggleSenhaBtn: null,
    gerarSenhaBtn: null,
    progressoDiv: null,
    resultadoDiv: null,
    progressFill: null,
    nomeSaida: null,
    nomeArquivo: null,
    senhaResultado: null,
    tamanho: null,
    metodo: null,
    downloadBtn: null,
    novoBtn: null,
    copiarSenha: null
};

// ============================================
// FUNÇÕES DE UTILIDADE
// ============================================

function formatarBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    if (bytes < 0) return 'Bytes inválidos';
    
    const k = 1024;
    const unidades = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const valor = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
    
    return `${valor} ${unidades[i]}`;
}

function gerarSenhaAleatoria(tamanho = CONFIG.TAMANHO_SENHA_PADRAO) {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let senha = '';
    for (let i = 0; i < tamanho; i++) {
        senha += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return senha;
}

function exibirNotificacao(mensagem, tipo = 'info') {
    // Remover toast existente
    const toastExistente = document.querySelector('.toast');
    if (toastExistente) toastExistente.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = mensagem;
    
    const cores = {
        success: '#4CAF50',
        error: '#f44336',
        warning: '#ff9800',
        info: '#333333'
    };
    
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${cores[tipo] || cores.info};
        color: white;
        padding: 12px 24px;
        border-radius: 50px;
        font-size: 14px;
        font-weight: 500;
        z-index: 1000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        animation: slideUp 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function validarTamanhoArquivo(arquivo) {
    if (arquivo.size > CONFIG.TAMANHO_MAXIMO_ARQUIVO) {
        exibirNotificacao(
            `❌ Arquivo muito grande! Máximo: ${formatarBytes(CONFIG.TAMANHO_MAXIMO_ARQUIVO)}`,
            'error'
        );
        return false;
    }
    return true;
}

function validarSenha(senha) {
    if (!senha || senha.trim() === '') {
        exibirNotificacao('❌ Digite uma senha para proteger o arquivo!', 'error');
        return false;
    }
    
    if (senha.length < 4) {
        exibirNotificacao('⚠️ A senha deve ter pelo menos 4 caracteres!', 'warning');
        return false;
    }
    
    return true;
}

function atualizarBotaoCompactar() {
    if (elementos.btnCompactar) {
        elementos.btnCompactar.disabled = !estado.arquivoSelecionado || estado.processando;
    }
}

function resetarFormulario() {
    estado.arquivoSelecionado = null;
    estado.processando = false;
    
    if (elementos.senhaInput) elementos.senhaInput.value = '';
    if (elementos.nomeSaida) elementos.nomeSaida.value = '';
    if (elementos.resultadoDiv) elementos.resultadoDiv.style.display = 'none';
    if (elementos.fileInput) elementos.fileInput.value = '';
    
    if (elementos.uploadArea) {
        elementos.uploadArea.classList.remove('drag-over');
        // Restaurar texto original
        const uploadContent = elementos.uploadArea.querySelector('.upload-content');
        if (uploadContent) {
            uploadContent.innerHTML = `
                <span class="upload-icon">📁</span>
                <p>Clique ou arraste um arquivo aqui</p>
                <small>Max. 500MB</small>
            `;
        }
    }
    
    atualizarBotaoCompactar();
}

// ============================================
// FUNÇÕES DE UPLOAD - CORRIGIDAS
// ============================================

function processarArquivo(arquivo) {
    if (!arquivo) return;
    
    if (!validarTamanhoArquivo(arquivo)) {
        return;
    }
    
    estado.arquivoSelecionado = arquivo;
    
    // Atualizar UI para mostrar o arquivo selecionado
    if (elementos.uploadArea) {
        const uploadContent = elementos.uploadArea.querySelector('.upload-content');
        if (uploadContent) {
            uploadContent.innerHTML = `
                <span class="upload-icon">✅</span>
                <p><strong>${arquivo.name}</strong></p>
                <small>${formatarBytes(arquivo.size)} - Clique para trocar</small>
            `;
        }
    }
    
    exibirNotificacao(`✅ ${arquivo.name} selecionado (${formatarBytes(arquivo.size)})`, 'success');
    atualizarBotaoCompactar();
}

function configurarUploadClique() {
    if (!elementos.uploadArea || !elementos.fileInput) return;
    
    // Clique na área de upload
    elementos.uploadArea.addEventListener('click', (e) => {
        // Evitar que o clique no botão de troca feche o diálogo
        if (e.target.closest('.btn-icon')) return;
        elementos.fileInput.click();
    });
    
    // Mudança no input file
    elementos.fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            processarArquivo(e.target.files[0]);
        }
    });
}

function configurarDragDrop() {
    if (!elementos.uploadArea) return;
    
    elementos.uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        elementos.uploadArea.classList.add('drag-over');
    });
    
    elementos.uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        elementos.uploadArea.classList.remove('drag-over');
    });
    
    elementos.uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        elementos.uploadArea.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            processarArquivo(files[0]);
        }
    });
}

// ============================================
// FUNÇÕES DE SENHA
// ============================================

function configurarVisibilidadeSenha() {
    if (!elementos.toggleSenhaBtn || !elementos.senhaInput) return;
    
    elementos.toggleSenhaBtn.addEventListener('click', () => {
        const type = elementos.senhaInput.type === 'password' ? 'text' : 'password';
        elementos.senhaInput.type = type;
        elementos.toggleSenhaBtn.textContent = type === 'password' ? '👁️' : '🙈';
    });
}

function configurarGeracaoSenha() {
    if (!elementos.gerarSenhaBtn || !elementos.senhaInput) return;
    
    elementos.gerarSenhaBtn.addEventListener('click', () => {
        const senha = gerarSenhaAleatoria(CONFIG.TAMANHO_SENHA_PADRAO);
        elementos.senhaInput.value = senha;
        exibirNotificacao('🔑 Senha forte gerada automaticamente!', 'success');
    });
}

// ============================================
// FUNÇÕES DE COMPACTAÇÃO
// ============================================

function exibirResultado(dados) {
    if (elementos.nomeArquivo) elementos.nomeArquivo.textContent = dados.arquivo;
    if (elementos.senhaResultado) elementos.senhaResultado.textContent = dados.senha;
    if (elementos.tamanho) elementos.tamanho.textContent = dados.tamanho;
    if (elementos.metodo) elementos.metodo.textContent = dados.metodo;
    
    if (elementos.resultadoDiv) {
        elementos.resultadoDiv.style.display = 'block';
        elementos.resultadoDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    if (elementos.downloadBtn) {
        elementos.downloadBtn.onclick = () => {
            window.location.href = dados.download_url;
            exibirNotificacao('📥 Download iniciado!', 'success');
        };
    }
    
    if (elementos.novoBtn) {
        elementos.novoBtn.onclick = () => {
            resetarFormulario();
            exibirNotificacao('🔄 Pronto para compactar outro arquivo!', 'info');
        };
    }
    
    if (elementos.copiarSenha) {
        elementos.copiarSenha.onclick = async () => {
            try {
                await navigator.clipboard.writeText(dados.senha);
                exibirNotificacao('📋 Senha copiada para área de transferência!', 'success');
            } catch (erro) {
                exibirNotificacao('❌ Erro ao copiar senha', 'error');
            }
        };
    }
    
    estado.processando = false;
    atualizarBotaoCompactar();
}

async function realizarCompactacao() {
    if (!estado.arquivoSelecionado) {
        exibirNotificacao('❌ Selecione um arquivo primeiro!', 'error');
        return;
    }
    
    const senha = elementos.senhaInput?.value || '';
    if (!validarSenha(senha)) {
        return;
    }
    
    if (estado.processando) {
        exibirNotificacao('⏳ Aguarde, processando arquivo...', 'warning');
        return;
    }
    
    estado.processando = true;
    atualizarBotaoCompactar();
    
    const formData = new FormData();
    formData.append('arquivo', estado.arquivoSelecionado);
    formData.append('senha', senha);
    formData.append('gerar_senha', 'false');
    formData.append('nivel', CONFIG.NIVEL_COMPRESSAO_PADRAO);
    formData.append('nome_saida', elementos.nomeSaida?.value || '');
    
    if (elementos.progressoDiv) elementos.progressoDiv.style.display = 'block';
    if (elementos.resultadoDiv) elementos.resultadoDiv.style.display = 'none';
    
    let progresso = 0;
    const intervaloProgresso = setInterval(() => {
        progresso += 5;
        if (progresso >= 90) clearInterval(intervaloProgresso);
        if (elementos.progressFill) {
            elementos.progressFill.style.width = `${progresso}%`;
        }
    }, 100);
    
    try {
        console.log(`📤 Enviando arquivo: ${estado.arquivoSelecionado.name}`);
        
        const resposta = await fetch('/compactar', {
            method: 'POST',
            body: formData
        });
        
        const dados = await resposta.json();
        
        clearInterval(intervaloProgresso);
        if (elementos.progressFill) elementos.progressFill.style.width = '100%';
        
        if (resposta.ok && dados.success) {
            setTimeout(() => {
                if (elementos.progressoDiv) elementos.progressoDiv.style.display = 'none';
                exibirResultado(dados);
            }, 500);
        } else {
            throw new Error(dados.error || 'Erro desconhecido');
        }
        
    } catch (erro) {
        console.error('❌ Erro:', erro);
        clearInterval(intervaloProgresso);
        
        if (elementos.progressoDiv) elementos.progressoDiv.style.display = 'none';
        
        let mensagemErro = erro.message;
        if (erro.message.includes('Failed to fetch')) {
            mensagemErro = 'Não foi possível conectar ao servidor. Verifique se o servidor está rodando.';
        }
        
        exibirNotificacao(`❌ Erro: ${mensagemErro}`, 'error');
        estado.processando = false;
        atualizarBotaoCompactar();
    }
}

// ============================================
// LIMPEZA AUTOMÁTICA
// ============================================

async function limparArquivosAntigos() {
    try {
        await fetch('/limpar', { method: 'POST' });
        console.log('🧹 Limpeza automática executada');
    } catch (erro) {
        console.error('Erro na limpeza:', erro);
    }
}

function iniciarLimpezaPeriodica() {
    setInterval(limparArquivosAntigos, CONFIG.TEMPO_LIMPEZA_AUTOMATICA);
    setTimeout(limparArquivosAntigos, 300000);
}

// ============================================
// TESTE DE CONEXÃO
// ============================================

async function testarConexaoServidor() {
    try {
        const resposta = await fetch('/');
        if (resposta.ok) {
            console.log('✅ Conexão com o servidor estabelecida');
            return true;
        }
    } catch (erro) {
        console.warn('⚠️ Servidor não está respondendo');
        return false;
    }
}

// ============================================
// INICIALIZAÇÃO - CORRIGIDA
// ============================================

function inicializarElementos() {
    // Inicializar todos os elementos do DOM
    elementos.uploadArea = document.getElementById('upload-area');
    elementos.fileInput = document.getElementById('file-input');
    elementos.btnCompactar = document.getElementById('compactar-btn');
    elementos.senhaInput = document.getElementById('senha');
    elementos.toggleSenhaBtn = document.getElementById('toggle-senha');
    elementos.gerarSenhaBtn = document.getElementById('gerar-senha');
    elementos.progressoDiv = document.getElementById('progresso');
    elementos.resultadoDiv = document.getElementById('resultado');
    elementos.progressFill = document.getElementById('progress-fill');
    elementos.nomeSaida = document.getElementById('nome-saida');
    elementos.nomeArquivo = document.getElementById('nome-arquivo');
    elementos.senhaResultado = document.getElementById('senha-resultado');
    elementos.tamanho = document.getElementById('tamanho');
    elementos.metodo = document.getElementById('metodo');
    elementos.downloadBtn = document.getElementById('download-btn');
    elementos.novoBtn = document.getElementById('novo-btn');
    elementos.copiarSenha = document.getElementById('copiar-senha');
    
    // Verificar elementos essenciais
    if (!elementos.uploadArea) console.error('❌ upload-area não encontrado');
    if (!elementos.fileInput) console.error('❌ file-input não encontrado');
    if (!elementos.btnCompactar) console.error('❌ compactar-btn não encontrado');
}

function inicializarAplicacao() {
    console.log('🚀 Inicializando Compactador...');
    
    // Inicializar elementos
    inicializarElementos();
    
    // Verificar se elementos essenciais existem
    if (!elementos.uploadArea || !elementos.fileInput) {
        console.error('❌ Elementos essenciais não encontrados!');
        return;
    }
    
    // Configurar funcionalidades
    configurarUploadClique();
    configurarDragDrop();
    configurarVisibilidadeSenha();
    configurarGeracaoSenha();
    
    // Configurar botão compactar
    if (elementos.btnCompactar) {
        // Remover listeners antigos
        const novoBotao = elementos.btnCompactar.cloneNode(true);
        elementos.btnCompactar.parentNode?.replaceChild(novoBotao, elementos.btnCompactar);
        elementos.btnCompactar = novoBotao;
        elementos.btnCompactar.addEventListener('click', realizarCompactacao);
    }
    
    // Testar conexão
    testarConexaoServidor();
    
    // Iniciar limpeza
    iniciarLimpezaPeriodica();
    
    // Estado inicial
    atualizarBotaoCompactar();
    
    console.log('✅ Aplicação inicializada!');
    console.log('📱 Clique na área de upload para selecionar um arquivo');
}

// ============================================
// INÍCIO
// ============================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarAplicacao);
} else {
    inicializarAplicacao();
}

// Exportar para debug
if (typeof window !== 'undefined') {
    window.debugCompactador = {
        resetar: resetarFormulario,
        estado: () => ({ ...estado }),
        config: CONFIG
    };
}