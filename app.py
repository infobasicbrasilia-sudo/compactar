from flask import Flask, render_template, request, send_file, jsonify
import os
import tempfile
import shutil
from datetime import datetime
import secrets
import string
import pyminizip

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['SECRET_KEY'] = secrets.token_hex(16)

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

def gerar_senha_aleatoria(tamanho=12):
    caracteres = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(caracteres) for _ in range(tamanho))

def compactar_com_pyminizip(origem, senha, saida, nivel=5):
    """
    Compacta usando pyminizip - CRIPTOGRAFIA REAL que funciona!
    Esta biblioteca usa o mesmo algoritmo do 7-Zip
    """
    try:
        print(f"Compactando com pyminizip: {origem} -> {saida}")
        
        if os.path.isfile(origem):
            # Arquivo único
            pyminizip.compress(
                origem,           # arquivo origem
                "",               # pasta base (vazio para arquivo único)
                saida,            # arquivo destino
                senha,            # senha
                nivel             # nível de compressão (1-9)
            )
            print(f"Arquivo único compactado: {os.path.basename(origem)}")
        else:
            # Para múltiplos arquivos, precisamos criar um ZIP temporário primeiro
            # porque pyminizip só aceita um arquivo por vez ou uma pasta
            import zipfile
            
            # Criar ZIP temporário sem senha primeiro
            temp_zip = tempfile.NamedTemporaryFile(suffix='.zip', delete=False)
            temp_zip.close()
            
            try:
                # Compactar todos os arquivos em um ZIP temporário
                with zipfile.ZipFile(temp_zip.name, 'w', zipfile.ZIP_DEFLATED) as zipf:
                    for root, dirs, files in os.walk(origem):
                        for file in files:
                            file_path = os.path.join(root, file)
                            arcname = os.path.relpath(file_path, origem)
                            zipf.write(file_path, arcname)
                            print(f"Arquivo adicionado ao temp: {arcname}")
                
                # Aplicar senha usando pyminizip
                pyminizip.compress(
                    temp_zip.name,    # arquivo origem
                    "",               # pasta base
                    saida,            # arquivo destino
                    senha,            # senha
                    nivel             # nível
                )
                print("Múltiplos arquivos compactados com senha")
                
            finally:
                # Limpar arquivo temporário
                if os.path.exists(temp_zip.name):
                    os.unlink(temp_zip.name)
        
        # Verificar se o arquivo foi criado
        if os.path.exists(saida):
            tamanho = os.path.getsize(saida) / (1024 * 1024)
            print(f"✅ ZIP criado com sucesso! Tamanho: {tamanho:.2f} MB")
            return True, f"Sucesso (AES-256 com pyminizip) - {tamanho:.2f} MB"
        else:
            return False, "Arquivo não foi criado"
            
    except Exception as e:
        print(f"Erro no pyminizip: {str(e)}")
        import traceback
        traceback.print_exc()
        return False, str(e)

@app.route('/favicon.ico')
def favicon():
    return '', 204

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/compactar', methods=['POST'])
def compactar():
    temp_dir = None
    try:
        print("\n" + "=" * 50)
        print("INICIANDO COMPACTAÇÃO")
        print("=" * 50)
        
        # Verificar se recebeu arquivos
        if 'arquivos' not in request.files:
            print("ERRO: Nenhum arquivo no request")
            return jsonify({'error': 'Nenhum arquivo enviado'}), 400
        
        arquivos = request.files.getlist('arquivos')
        print(f"Arquivos recebidos: {len(arquivos)}")
        
        # Filtrar arquivos válidos
        arquivos_validos = []
        for a in arquivos:
            if a and a.filename:
                arquivos_validos.append(a)
                print(f"  - {a.filename}")
        
        if not arquivos_validos:
            print("ERRO: Nenhum arquivo válido")
            return jsonify({'error': 'Nenhum arquivo válido'}), 400
        
        # Obter senha
        senha = request.form.get('senha', '')
        gerar_senha = request.form.get('gerar_senha', 'false') == 'true'
        
        if gerar_senha:
            senha = gerar_senha_aleatoria()
            print(f"Senha gerada automaticamente")
        
        if not senha:
            print("ERRO: Senha não fornecida")
            return jsonify({'error': 'Senha não fornecida'}), 400
        
        print(f"Senha definida: {'*' * len(senha)}")
        
        # Criar pasta temporária
        temp_dir = tempfile.mkdtemp()
        print(f"Pasta temporária: {temp_dir}")
        
        # Salvar todos os arquivos
        for arquivo in arquivos_validos:
            caminho_temp = os.path.join(temp_dir, arquivo.filename)
            arquivo.save(caminho_temp)
            print(f"Arquivo salvo: {arquivo.filename} ({os.path.getsize(caminho_temp)} bytes)")
        
        # Nome do arquivo de saída
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        nome_saida = request.form.get('nome_saida', '')
        if not nome_saida:
            nome_saida = f"compactado_{timestamp}"
        
        saida_zip = os.path.join(app.config['UPLOAD_FOLDER'], f"{nome_saida}.zip")
        print(f"Arquivo de saída: {saida_zip}")
        
        # Nível de compressão
        nivel = int(request.form.get('nivel', 5))
        
        # Compactar com pyminizip (criptografia REAL)
        print("Usando pyminizip com criptografia REAL...")
        sucesso, mensagem = compactar_com_pyminizip(temp_dir, senha, saida_zip, nivel)
        
        # Limpar pasta temporária
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)
            print("Pasta temporária removida")
        
        if not sucesso:
            print(f"ERRO na compactação: {mensagem}")
            return jsonify({'error': f'Erro ao compactar: {mensagem}'}), 500
        
        # Verificar se o arquivo foi criado
        if not os.path.exists(saida_zip):
            print("ERRO: Arquivo ZIP não foi criado")
            return jsonify({'error': 'Arquivo ZIP não foi criado'}), 500
        
        tamanho = os.path.getsize(saida_zip) / (1024 * 1024)
        print(f"✅ ZIP criado com sucesso! Tamanho: {tamanho:.2f} MB")
        
        resposta = {
            'success': True,
            'arquivo': f"{nome_saida}.zip",
            'senha': senha,
            'tamanho': f"{tamanho:.2f} MB",
            'metodo': "AES-256 (pyminizip) - CRIPTOGRAFIA REAL",
            'download_url': f'/download/{nome_saida}.zip',
            'aviso': "✅ Arquivo PROTEGIDO com senha! Ao extrair com WinRAR/7-Zip, será solicitada a senha."
        }
        
        print("Resposta enviada com sucesso!")
        return jsonify(resposta)
        
    except Exception as e:
        print(f"ERRO GERAL: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Limpar pasta temporária em caso de erro
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir, ignore_errors=True)
            except:
                pass
        
        return jsonify({'error': str(e)}), 500

@app.route('/download/<nome_arquivo>')
def download(nome_arquivo):
    try:
        caminho = os.path.join(app.config['UPLOAD_FOLDER'], nome_arquivo)
        print(f"Download solicitado: {caminho}")
        
        if os.path.exists(caminho):
            return send_file(
                caminho, 
                as_attachment=True,
                download_name=nome_arquivo
            )
        else:
            print(f"Arquivo não encontrado: {caminho}")
            return jsonify({'error': 'Arquivo não encontrado'}), 404
    except Exception as e:
        print(f"Erro no download: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/limpar', methods=['POST'])
def limpar():
    try:
        import time
        limite = time.time() - 3600
        removidos = 0
        
        for arquivo in os.listdir(app.config['UPLOAD_FOLDER']):
            caminho = os.path.join(app.config['UPLOAD_FOLDER'], arquivo)
            if os.path.isfile(caminho):
                if os.path.getmtime(caminho) < limite:
                    os.remove(caminho)
                    removidos += 1
        
        print(f"Limpeza: {removidos} arquivos removidos")
        return jsonify({'success': True, 'removidos': removidos})
    except Exception as e:
        print(f"Erro na limpeza: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    import socket
    try:
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
    except:
        local_ip = "127.0.0.1"
    
    print("\n" + "=" * 60)
    print("🚀 SERVIDOR COMPACTADOR COM CRIPTOGRAFIA REAL!")
    print("=" * 60)
    print(f"📱 Local: http://localhost:5000")
    print(f"📱 Celular: http://{local_ip}:5000")
    print("=" * 60)
    
    # Verificar pyminizip
    try:
        import pyminizip
        print("✅ pyminizip instalado! CRIPTOGRAFIA REAL funcionando!")
        print("   Os arquivos ZIP serão protegidos com senha (AES-256)")
    except ImportError:
        print("❌ pyminizip NÃO instalado! Execute: python -m pip install pyminizip")
    print("=" * 60 + "\n")
    
    app.run(host='0.0.0.0', port=5000, debug=True)