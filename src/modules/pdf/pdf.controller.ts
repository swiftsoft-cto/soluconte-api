import {
  Controller,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import pdfParseFn from 'pdf-parse';

import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('api/pdf')
export class PdfController {
  @Post('/extract-text')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'files', maxCount: 10 }]))
  async extractText(
    @UploadedFiles() files: { files?: Express.Multer.File[] },
  ): Promise<any> {
    const results = [];
    if (files.files && files.files.length > 0) {
      for (const file of files.files) {
        const decodedName = Buffer.from(file.originalname, 'latin1').toString(
          'utf8',
        );
        try {
          const data = await pdfParseFn(file.buffer);
          results.push({ name: decodedName, content: data.text });
        } catch (err) {
          results.push({
            name: decodedName,
            content: `Erro ao extrair texto: ${err.message}`,
          });
        }
      }
    }
    return results;
  }
}
