import { Injectable } from '@nestjs/common';

@Injectable()
export class I18nService {
  private defaultLanguage = 'en';

  translate(messageObject: Record<string, string>, lang: string): string {
    return messageObject[lang] || messageObject[this.defaultLanguage];
  }

  getLanguageFromHeader(headers: Record<string, any>): string {
    return (
      headers['accept-language']?.split(',')[0]?.trim() || this.defaultLanguage
    );
  }
}
