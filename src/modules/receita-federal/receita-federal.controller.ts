// src/modules/receita/receita.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { ReceitaService } from './receita-federal.service';

@Controller('api/receita')
export class ReceitaController {
  constructor(private readonly receitaService: ReceitaService) {}

  @Get(':cnpj')
  async fetchCnpj(@Param('cnpj') cnpj: string) {
    return this.receitaService.getCompanyData(cnpj);
  }
}
