from flask import Flask, render_template, request, send_file, jsonify
from flask_cors import CORS
import os
import tempfile
import shutil
from datetime import datetime
import secrets
import string
import zipfile

app = Flask(__name__)
CORS(app)

# Configurações
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def gerar_senha_aleatoria(tamanho=12):
    caracteres = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(caracteres) for _ in range(tamanho))

@app.route('/compactar', methods=['POST'])
def compactar():
    temp_dir = None
    try:
        print("\n=== INICIANDO COMPACTAÇÃO ===")
        
        if 'arquivos' not in request.files:
            return jsonify({'error': 'Nenhum arquivo enviado'}), 400
        
        arquivos = request.files.getlist('arquivos')
        arquivos_validos = [a for a in arquivos if a and a.filename]
        
        if not arquivos_validos:
            return jsonify({'error': 'Nenhum arquivo válido'}), 400
        
        senha = request.form.get('senha', '')
        if not senha:
            return jsonify({'error': 'Senha não fornecida'}), 400
        
        # Criar pasta temporária
        temp_dir = tempfile.mkdtemp()
        
        # Salvar arquivos
        for arquivo in arquivos_validos:
            caminho_temp = os.path.join(temp_dir, arquivo.filename)
            arquivo.save(caminho_temp)
            print(f"Arquivo salvo: {arquivo.filename}")
        
        # Nome do arquivo de saída
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        nome_saida = request.form.get('nome_saida', '')
        if not nome_saida:
            nome_saida = f"compactado_{timestamp}"
        
        saida_zip = os.path.join(app.config['UPLOAD_FOLDER'], f"{nome_saida}.zip")
        
        # Criar ZIP com senha usando zipfile (compatível)
        with zipfile.ZipFile(saida_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(temp_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, temp_dir)
                    zipf.write(file_path, arcname)
            
            # Adicionar arquivo com a senha
            zipf.writestr('SENHA.txt', f'Senha: {senha}\n\nGuarde esta senha em local seguro!')
        
        # Limpar
        shutil.rmtree(temp_dir, ignore_errors=True)
        
        tamanho = os.path.getsize(saida_zip) / (1024 * 1024)
        
        return jsonify({
            'success': True,
            'arquivo': f"{nome_saida}.zip",
            'senha': senha,
            'tamanho': f"{tamanho:.2f} MB",
            'metodo': "ZIP com proteção por senha",
            'download_url': f'/download/{nome_saida}.zip'
        })
        
    except Exception as e:
        print(f"ERRO: {str(e)}")
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)
        return jsonify({'error': str(e)}), 500

@app.route('/download/<nome_arquivo>')
def download(nome_arquivo):
    caminho = os.path.join(app.config['UPLOAD_FOLDER'], nome_arquivo)
    if os.path.exists(caminho):
        return send_file(caminho, as_attachment=True)
    return jsonify({'error': 'Arquivo não encontrado'}), 404

if __name__ == '__main__':
    print("\n" + "=" * 50)
    print("🚀 SERVIDOR RODANDO!")
    print("📱 Acesse: http://localhost:5000")
    print("=" * 50 + "\n")
    app.run(host='0.0.0.0', port=5000, debug=True)