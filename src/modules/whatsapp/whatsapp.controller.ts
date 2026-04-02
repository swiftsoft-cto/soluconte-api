import { Controller, Get, Post, UseGuards, Query } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RulesGuard } from '../../common/guards/rules.guard';
import { Rule } from '../../common/decorators/rule.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('WhatsApp')
@Controller('api/whatsapp')
@UseGuards(JwtAuthGuard, RulesGuard)
@ApiBearerAuth()
export class WhatsAppController {
  constructor(private readonly whatsAppService: WhatsAppService) {}

  @Get('status')
  @Rule('team') // Apenas usuários internos podem acessar
  @ApiOperation({ summary: 'Obter status da conexão WhatsApp' })
  async getStatus() {
    return this.whatsAppService.getStatus();
  }

  @Get('groups')
  @Rule('team') // Apenas usuários internos podem acessar
  @ApiOperation({ summary: 'Listar todos os grupos do WhatsApp' })
  async getGroups() {
    try {
      const groups = await this.whatsAppService.getGroups();
      // Retorna array diretamente para compatibilidade com frontend
      // O serviço já garante que sempre retorna um array (mesmo que vazio)
      return Array.isArray(groups) ? groups : [];
    } catch (error: any) {
      // Em caso de qualquer erro, retorna array vazio ao invés de quebrar
      // O serviço já trata os erros, mas por segurança retornamos array vazio aqui também
      return [];
    }
  }

  @Get('qr-code')
  @Rule('team') // Apenas usuários internos podem acessar
  @ApiOperation({ summary: 'Obter QR Code atual do WhatsApp (se disponível)' })
  async getQrCode(@Query('force') force?: string) {
    const status = this.whatsAppService.getStatus();
    
    // Se já tem QR code, retorna imediatamente
    if (status.qrCode) {
      return { qrCode: status.qrCode };
    }
    
    // Se não tem QR code mas não está conectado, inicia reinicialização
    if (!status.isReady) {
      const forceNewSession = force === 'true';
      
      // CORREÇÃO: Se force=true, sempre reinicializa (mesmo que já esteja inicializando)
      if (forceNewSession) {
        // Inicia a reinicialização em background (não bloqueia a resposta)
        this.whatsAppService.reinitializeClient(forceNewSession).catch((error) => {
          // Erro silencioso
        });
      }
      
      // CORREÇÃO: Aguarda mais tempo (até 30 segundos) para o QR code aparecer
      // O evento 'qr' pode demorar alguns segundos após initialize(), especialmente no Windows
      for (let i = 0; i < 60; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const newStatus = this.whatsAppService.getStatus();
        if (newStatus.qrCode) {
          return { qrCode: newStatus.qrCode };
        }
      }
      
      // Retorna informando que está gerando (ou que precisa forçar)
      return { 
        qrCode: null, 
        message: forceNewSession 
          ? 'QR Code está sendo gerado. Aguarde alguns segundos e clique em "Atualizar QR Code" novamente.' 
          : 'QR Code não disponível. Clique em "Forçar Novo QR Code" para gerar um novo.'
      };
    }
    
    return { qrCode: null, message: 'WhatsApp já está conectado. Não é necessário QR code.' };
  }

  @Post('disconnect')
  @Rule('team') // Apenas usuários internos podem acessar
  @ApiOperation({ summary: 'Desconectar o WhatsApp (limpa sessão e força novo login)' })
  async disconnect() {
    try {
      await this.whatsAppService.disconnect();
      return { 
        success: true, 
        message: 'WhatsApp desconectado com sucesso. Você precisará conectar novamente.' 
      };
    } catch (error: any) {
      throw error;
    }
  }
}

