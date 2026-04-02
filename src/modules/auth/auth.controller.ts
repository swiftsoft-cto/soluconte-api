import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  Get,
  UseGuards,
  NotFoundException,
  BadRequestException,
  HttpCode,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { User } from 'src/common/decorators/user.decorator';

// Importações do Swagger
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Login do usuário' })
  @ApiHeader({
    name: 'Accept-Language',
    required: false,
    description: 'Idioma da resposta (pt-BR, en-US, etc.)',
  })
  @ApiBody({
    schema: {
      properties: {
        email: { type: 'string', example: 'john.doe@example.com' },
        password: { type: 'string', example: 'senha123' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login bem-sucedido. Retorna o token e dados do usuário.',
  })
  @ApiResponse({
    status: 401,
    description: 'Email não confirmado. Verifique a sua caixa de entrada.',
    type: UnauthorizedException,
  })
  @ApiResponse({
    status: 401,
    description: 'Email ou senha inválidos (Usuário não encontrado).',
    type: UnauthorizedException,
  })
  @ApiResponse({
    status: 401,
    description: 'Este usuário não possui senha e não pode fazer login.',
    type: UnauthorizedException,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos no body ou erro de validação.',
    type: BadRequestException,
  })
  @Post('/login')
  async login(
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    const user = await this.authService.validateUser(email, password);

    // Se `validateUser` retornar null ou jogar exception, você trata
    if (!user) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    // Gera o token
    const serviceToken = await this.authService.login(user);

    return {
      serviceToken,
      user,
    };
  }

  @ApiOperation({ summary: 'Obter dados do usuário logado' })
  @ApiHeader({
    name: 'Accept-Language',
    required: false,
    description: 'Idioma da resposta (pt-BR, en-US, etc.)',
  })
  @ApiBearerAuth('JWT')
  @ApiResponse({
    status: 200,
    description: 'Retorna as informações do usuário logado.',
  })
  @ApiResponse({
    status: 401,
    description: 'Não autenticado ou token inválido.',
    type: UnauthorizedException,
  })
  @ApiResponse({
    status: 500,
    description: 'Erro interno do servidor.',
  })
  @UseGuards(JwtAuthGuard)
  @Get('/me')
  async getProfile(@User() currentUser: any) {
    const userPayload = await this.authService.getProfilePayload(
      currentUser.id,
    );

    return { user: userPayload };
  }

  @ApiOperation({ summary: 'Confirmar o e-mail do usuário' })
  @ApiHeader({
    name: 'Accept-Language',
    required: false,
    description: 'Idioma da resposta (pt-BR, en-US, etc.)',
  })
  @ApiBody({
    schema: {
      properties: {
        email: { type: 'string', example: 'john.doe@example.com' },
        code: { type: 'string', example: '123456' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'E-mail confirmado com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'E-mail já confirmado ou código inválido.',
    type: BadRequestException,
  })
  @ApiResponse({
    status: 404,
    description: 'Usuário não encontrado.',
    type: NotFoundException,
  })
  @ApiResponse({
    status: 500,
    description: 'Erro interno do servidor.',
  })
  @Post('/confirm-email')
  async confirmEmail(@Body('email') email: string, @Body('code') code: string) {
    return this.authService.confirmEmail(email, code);
  }

  @ApiOperation({ summary: 'Solicitar código para redefinição de senha' })
  @ApiHeader({
    name: 'Accept-Language',
    required: false,
    description: 'Idioma da resposta (pt-BR, en-US, etc.)',
  })
  @ApiBody({
    schema: {
      properties: {
        email: { type: 'string', example: 'john.doe@example.com' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Código de redefinição de senha enviado para o e-mail.',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuário não encontrado.',
    type: NotFoundException,
  })
  @ApiResponse({
    status: 500,
    description: 'Erro interno do servidor.',
  })
  @Post('/forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @ApiOperation({ summary: 'Verificar se um código específico ainda é válido' })
  @ApiHeader({
    name: 'Accept-Language',
    required: false,
    description: 'Idioma da resposta (pt-BR, en-US, etc.)',
  })
  @ApiBody({
    schema: {
      properties: {
        email: { type: 'string', example: 'john.doe@example.com' },
        code: { type: 'string', example: '123456' },
        type: {
          type: 'string',
          example: 'PASSWORD_RESET',
          description:
            'Tipo do código (ex: PASSWORD_RESET, EMAIL_CONFIRMATION, ...)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Retorna se o código está válido.',
  })
  @ApiResponse({
    status: 400,
    description: 'Código inválido, expirado ou já usado.',
    type: BadRequestException,
  })
  @ApiResponse({
    status: 404,
    description: 'Usuário não encontrado.',
    type: NotFoundException,
  })
  @ApiResponse({
    status: 500,
    description: 'Erro interno do servidor.',
  })
  @Post('/check-code')
  async checkCode(@Body('email') email: string, @Body('code') code: string) {
    return this.authService.checkCodeIsValid(email, code);
  }

  @ApiOperation({ summary: 'Redefinir a senha do usuário' })
  @ApiHeader({
    name: 'Accept-Language',
    required: false,
    description: 'Idioma da resposta (pt-BR, en-US, etc.)',
  })
  @ApiBody({
    schema: {
      properties: {
        email: { type: 'string', example: 'john.doe@example.com' },
        code: { type: 'string', example: '123456' },
        newPassword: { type: 'string', example: 'NovaSenha123!' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Senha redefinida com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'Código inválido, expirado ou já usado.',
    type: BadRequestException,
  })
  @ApiResponse({
    status: 404,
    description: 'Usuário não encontrado.',
    type: NotFoundException,
  })
  @ApiResponse({
    status: 500,
    description: 'Erro interno do servidor.',
  })
  @Post('/reset-password')
  async resetPassword(
    @Body('email') email: string,
    @Body('code') code: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.resetPassword(email, code, newPassword);
  }

  /** Rota para reenviar o código de confirmação de e‑mail */
  @Post('resend-confirmation')
  @HttpCode(200)
  async resendConfirmation(@Body('email') email: string) {
    const message = await this.authService.resendConfirmation(email);
    return { message, statusCode: 200 };
  }
}
