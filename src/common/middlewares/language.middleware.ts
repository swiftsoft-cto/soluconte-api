import { Injectable, NestMiddleware } from '@nestjs/common';

@Injectable()
export class LanguageMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    req.language = req.headers['accept-language'] || 'en';
    next();
  }
}
