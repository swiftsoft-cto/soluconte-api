import { Module } from '@nestjs/common';
import { PdfController } from './pdf.controller';

@Module({
  providers: [PdfController],
  controllers: [PdfController],
  exports: [PdfController],
})
export class PdfModule {}
