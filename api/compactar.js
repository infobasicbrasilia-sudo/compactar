import { ZipWriter, BlobReader, BlobWriter, TextReader } from '@zip.js/zip.js';

export const config = {
  api: {
    bodyParser: false, // Desativa o parser padrão para lidar com o upload de arquivos
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Recebe os arquivos e a senha
    const { files, password, outputName } = await parseMultipart(req);

    // 2. Cria o arquivo ZIP protegido
    const zipWriter = new ZipWriter(new BlobWriter("application/zip"), {
      password: password,       // Senha para proteger o conteúdo
      encryptionStrength: 3,    // Nível 3 = AES-256
    });

    for (const file of files) {
      await zipWriter.add(file.name, new BlobReader(file.buffer));
    }

    await zipWriter.add("INSTRUCOES.txt", new TextReader(`Senha do arquivo: ${password}`));

    const zipBlob = await zipWriter.close();

    // 3. Envia o arquivo para download
    const filename = `${outputName || 'protegido'}_${Date.now()}.zip`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/zip');
    res.status(200).send(Buffer.from(await zipBlob.arrayBuffer()));

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// Função auxiliar para interpretar os dados do formulário multipart
async function parseMultipart(req) {
  // ... implementação ...
  return { files: [], password: '', outputName: '' };
}