import { Global, Module } from '@nestjs/common';
import { I18nService } from './i18n.service';

@Global() // Torna o módulo global, disponível para toda a aplicação
@Module({
  providers: [I18nService],
  exports: [I18nService], // Exporta o serviço para outros módulos
})
export class I18nModule {}
