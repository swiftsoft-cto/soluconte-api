import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { attachWebSocketRouter } from './websocket/router';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { DataSource } from 'typeorm';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Aumentar limite do body parser para 10MB (padrão é 100kb)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Configurar arquivos estáticos
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // Ativar CORS
  app.enableCors({
    origin: '*', // Permite todas as origens. Alterar conforme necessário para maior segurança.
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
  });

  // Configuração do Swagger
  const config = new DocumentBuilder()
    .setTitle('Documentação da API')
    .setDescription('Documentação da API gerada automaticamente')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'JWT',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'Documentação da API',
  });

  // Validação global com opções adicionais
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  // Iniciar o servidor
  const server = await app.listen(process.env.PORT ?? 3000);

  // Obter o DataSource padrão do Nest
  const dataSource = app.get(DataSource);

  // Configurar WebSocket passando o DataSource
  attachWebSocketRouter(server, dataSource);

  // Loga as rotas registradas no nest
  // console.log(app.getHttpAdapter().getInstance()._router.stack);
}
bootstrap();
