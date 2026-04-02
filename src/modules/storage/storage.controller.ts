// src/modules/storage/storage.controller.ts

import {
  Controller,
  Get,
  Param,
  Res,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { StorageService } from './storage.service';
import { Response } from 'express';
import axios from 'axios';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RulesGuard } from 'src/common/guards/rules.guard';

@UseGuards(JwtAuthGuard, RulesGuard)
@Controller('api/storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /**
   * GET /storage/static/:path(*)
   * Proxy para acessar diretamente o arquivo estático na storage API,
   * incluindo a apiKey na query string.
   *
   * Exemplo de URL interna que ele chamará:
   *   http://localhost:24985/uploads/companies/arquivo.png?apiKey=SWIFTSOFTEXAMPLEKEY
   */
  @Get('/static/:path(*)')
  async getStaticFile(@Param('path') path: string, @Res() res: Response) {
    if (!path) {
      throw new BadRequestException('Identifier inválido.');
    }

    // Monta a URL completa do arquivo estático na storage API
    const url = `${this.storageService['storageApiUrl']}/${path}`;

    try {
      const response = await axios.get(url, {
        params: { apiKey: this.storageService['apiKey'] },
        responseType: 'stream',
      });

      // Repassa headers mínimos (content-type, content-length) para o cliente
      res.set({
        'Content-Type':
          response.headers['content-type'] || 'application/octet-stream',
        'Content-Length': response.headers['content-length'],
      });

      // Faz o pipe do stream de dados direto para a resposta HTTP
      response.data.pipe(res);
    } catch (error) {
      console.error('Erro ao acessar arquivo estático:', error);
      throw new BadRequestException(
        'Não foi possível acessar o arquivo estático.',
      );
    }
  }
}
