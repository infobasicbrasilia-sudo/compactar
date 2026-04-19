from flask import Flask, request, send_file, jsonify, render_template
from flask_cors import CORS
import pyminizip
import zipfile
import os
import tempfile
import shutil
from datetime import datetime


app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/compactar', methods=['POST'])
def compactar():
    temp_dir = None
    temp_zip = None
    try:
        # Verificar arquivos
        if 'arquivos' not in request.files:
            return jsonify({'error': 'Nenhum arquivo enviado'}), 400
        
        files = request.files.getlist('arquivos')
        senha = request.form.get('password')
        nome_saida = request.form.get('outputName', '')
        
        if not files or files[0].filename == '':
            return jsonify({'error': 'Nenhum arquivo válido'}), 400
        if not senha:
            return jsonify({'error': 'Senha não fornecida'}), 400
        
        # Criar pasta temporária e salvar arquivos
        temp_dir = tempfile.mkdtemp()
        for file in files:
            if file.filename:
                file.save(os.path.join(temp_dir, file.filename))
        
        # Criar ZIP temporário sem senha (compactação padrão)
        temp_zip = tempfile.NamedTemporaryFile(suffix='.zip', delete=False)
        temp_zip.close()
        with zipfile.ZipFile(temp_zip.name, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, _, filenames in os.walk(temp_dir):
                for filename in filenames:
                    file_path = os.path.join(root, filename)
                    arcname = os.path.relpath(file_path, temp_dir)
                    zipf.write(file_path, arcname)
        
        # Nome final do ZIP com senha
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        zip_name = f"{nome_saida if nome_saida else 'protegido'}_{timestamp}.zip"
        zip_path = os.path.join(UPLOAD_FOLDER, zip_name)
        
        # Aplicar senha ao ZIP temporário usando pyminizip
        pyminizip.compress(temp_zip.name, "", zip_path, senha, 5)
        
        # Limpar arquivos temporários
        shutil.rmtree(temp_dir, ignore_errors=True)
        os.unlink(temp_zip.name)
        
        return send_file(zip_path, as_attachment=True, download_name=zip_name)
    
    except Exception as e:
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)
        if temp_zip and os.path.exists(temp_zip.name):
            os.unlink(temp_zip.name)
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("🚀 Servidor rodando em http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)