// src/modules/receita/receita.module.ts
import { Module } from '@nestjs/common';
import { ReceitaController } from './receita-federal.controller';
import { ReceitaService } from './receita-federal.service';

@Module({
  controllers: [ReceitaController],
  providers: [ReceitaService],
  exports: [ReceitaService],
})
export class ReceitaModule {}
