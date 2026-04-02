// src/modules/storage/storage.service.ts

import { Injectable, BadRequestException } from '@nestjs/common';
import FormData from 'form-data';
import axios from 'axios';

@Injectable()
export class StorageService {
  private readonly storageApiUrl = process.env.STORAGE_API_URL.replace(
    /\/+$/,
    '',
  );
  private readonly apiKey = process.env.STORAGE_API_KEY;

  /**
   * Faz upload de um único arquivo (em memória) e retorna a URL.
   */
  async uploadFile(
    file: Express.Multer.File,
    folderName: string,
  ): Promise<string> {
    if (!file || !file.buffer) {
      throw new BadRequestException('Nenhum arquivo foi enviado.');
    }

    const formData = new FormData();
    // buffer + nome original garantem que FormData monte corretamente o multipart
    formData.append('file', file.buffer, file.originalname);
    formData.append('folderName', folderName);

    try {
      const response = await axios.post(
        `${this.storageApiUrl}/storage/upload?apiKey=${this.apiKey}`,
        formData,
        { headers: formData.getHeaders() },
      );

      if (response.data?.imageUrl) {
        return response.data.imageUrl;
      }
      throw new BadRequestException('Erro ao obter a URL da imagem.');
    } catch (err) {
      console.error('StorageService.uploadFile error', err);
      throw new BadRequestException('Erro ao enviar a imagem para o storage.');
    }
  }

  /**
   * Faz upload de vários arquivos em paralelo.
   */
  async uploadFiles(
    files: Express.Multer.File[],
    folderName: string,
  ): Promise<string[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('Nenhum arquivo foi enviado.');
    }
    const uploads = files.map((file) => this.uploadFile(file, folderName));
    return Promise.all(uploads);
  }

  /**
   * Deleta um arquivo no storage pelo identifier (filename) e retorna a resposta.
   */
  async deleteFile(
    identifier: string,
  ): Promise<{ message: string; id: string }> {
    if (!identifier) {
      throw new BadRequestException(
        'É necessário informar o identifier do arquivo.',
      );
    }

    // 🔧 CORREÇÃO: Se o identifier for um caminho completo, extrair apenas o filename
    let filename = identifier;
    if (identifier.includes('/')) {
      // É um caminho completo como "internal-tasks/1756321384489-arquivo.PNG"
      filename = identifier.split('/').pop();
      if (!filename) {
        throw new BadRequestException(
          'Não foi possível extrair o nome do arquivo do caminho.',
        );
      }
    }

    const url = `${this.storageApiUrl}/storage/delete/${encodeURIComponent(filename)}`;

    try {
      const response = await axios.delete(url, {
        params: { apiKey: this.apiKey },
        headers: { Accept: 'application/json' },
      });
      // espera receber { message: string, id: string }
      return response.data;
    } catch (err) {
      console.error(
        'StorageService.deleteFile error',
        err?.response?.data || err.message,
      );
      throw new BadRequestException('Erro ao deletar o arquivo no storage.');
    }
  }

  /**
   * Faz download de um arquivo do storage e retorna o buffer.
   */
  async downloadFile(fileUrl: string): Promise<Buffer> {
    if (!fileUrl) {
      throw new BadRequestException('URL do arquivo é obrigatória.');
    }

    try {
      let filePath: string;

      // 🔧 CORREÇÃO: Normalizar a URL para garantir que tenha o formato correto
      let normalizedUrl = fileUrl;
      if (normalizedUrl.startsWith('localhost:')) {
        normalizedUrl = `http://${normalizedUrl}`;
      }

      // Verificar diferentes formatos de URL
      if (normalizedUrl.includes('/uploads/')) {
        // Formato: http://localhost:24985/uploads/internal-tasks/arquivo.pdf
        const urlParts = normalizedUrl.split('/uploads/');
        if (urlParts.length !== 2) {
          throw new BadRequestException('URL do arquivo inválida.');
        }
        filePath = urlParts[1]; // internal-tasks/arquivo.pdf
      } else if (normalizedUrl.startsWith('/uploads/')) {
        // Formato: /uploads/internal-tasks/arquivo.pdf
        filePath = normalizedUrl.substring(9); // Remove '/uploads/'
      } else if (normalizedUrl.includes('uploads/')) {
        // Formato: uploads/internal-tasks/arquivo.pdf (URL relativa)
        filePath = normalizedUrl;
      } else {
        throw new BadRequestException(
          `Formato de URL não suportado: ${fileUrl}`,
        );
      }

      // Extrair apenas o filename do caminho (última parte após a última barra)
      const filename = filePath.split('/').pop();
      if (!filename) {
        throw new BadRequestException(
          'Não foi possível extrair o nome do arquivo da URL.',
        );
      }

      // Usar a rota correta da Storage API com apenas o filename
      const downloadUrl = `${this.storageApiUrl}/storage/download/${encodeURIComponent(filename)}`;

      const response = await axios.get(downloadUrl, {
        params: { apiKey: this.apiKey },
        responseType: 'arraybuffer',
      });

      return Buffer.from(response.data);
    } catch (err) {
      console.error('StorageService.downloadFile error', err);
      if (err.response?.status === 404) {
        throw new BadRequestException(
          `Arquivo não encontrado no storage: ${fileUrl}`,
        );
      }
      throw new BadRequestException('Erro ao fazer download do arquivo.');
    }
  }
}
