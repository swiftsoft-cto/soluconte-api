// src/modules/receita/receita.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ReceitaService {
  private readonly BASE_URL = 'https://www.receitaws.com.br/v1/cnpj';

  /**
   * Busca os dados da Receita Federal pelo CNPJ.
   * @param cnpj - Número do CNPJ com ou sem máscara
   * @returns Dados da ReceitaWS
   */
  async getCompanyData(cnpj: string): Promise<any> {
    // Remove todos os caracteres não numéricos
    const justNumbers = cnpj.replace(/\D/g, '');

    // Valida se o CNPJ tem 14 dígitos
    if (justNumbers.length !== 14) {
      throw new BadRequestException('CNPJ inválido');
    }

    try {
      // Chama a API da ReceitaWS via Axios
      const { data } = await axios.get(`${this.BASE_URL}/${justNumbers}`);

      // Se a resposta contiver erro, lança exceção
      if (data.status === 'ERROR') {
        throw new BadRequestException(data.message || 'Erro ao buscar CNPJ');
      }

      return data;
    } catch (error) {
      throw new BadRequestException(
        'Não foi possível obter dados do CNPJ',
        error,
      );
    }
  }
}
