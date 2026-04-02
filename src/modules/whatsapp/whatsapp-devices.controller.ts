import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RulesGuard } from '../../common/guards/rules.guard';
import { Rule } from '../../common/decorators/rule.decorator';
import { WhatsAppDevicesService } from './whatsapp-devices.service';
import { CreateWhatsAppDeviceDto } from './dto/create-whatsapp-device.dto';
import { PatchWhatsAppDeviceDto } from './dto/patch-whatsapp-device.dto';
import { User } from '../../common/decorators/user.decorator';
import { WhatsAppService } from './whatsapp.service';

@ApiTags('WhatsApp')
@Controller('api/whatsapp')
@UseGuards(JwtAuthGuard, RulesGuard)
@ApiBearerAuth()
export class WhatsAppDevicesController {
  constructor(
    private readonly devicesService: WhatsAppDevicesService,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  @Get('devices')
  @Rule('team')
  @ApiOperation({ summary: 'Listar dispositivos (linhas) WhatsApp cadastrados' })
  async list() {
    const rows = await this.devicesService.list();
    return rows.map((d) => ({
      id: d.id,
      name: d.name,
      phoneLabel: d.phoneLabel,
      operatorLabel: d.operatorLabel,
      isDefault: d.isDefault,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      agent: d.agent ? { id: d.agent.id, name: d.agent.name } : null,
      session: this.whatsAppService.getDeviceSessionStatus(d.id),
    }));
  }

  @Get('devices/:deviceId/session/status')
  @Rule('team')
  @ApiOperation({ summary: 'Status da sessão WhatsApp deste dispositivo' })
  deviceSessionStatus(@Param('deviceId', ParseUUIDPipe) deviceId: string) {
    return this.whatsAppService.getDeviceSessionStatus(deviceId);
  }

  @Get('devices/:deviceId/session/qr-code')
  @Rule('team')
  @ApiOperation({ summary: 'QR Code para conectar este dispositivo' })
  async deviceSessionQr(
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
    @Query('force') force?: string,
  ) {
    return this.whatsAppService.getDeviceQrCode(deviceId, force === 'true');
  }

  @Post('devices/:deviceId/session/start')
  @Rule('team')
  @ApiOperation({ summary: 'Iniciar cliente WhatsApp para este dispositivo' })
  async deviceSessionStart(@Param('deviceId', ParseUUIDPipe) deviceId: string) {
    await this.whatsAppService.startDeviceSession(deviceId);
    return { ok: true };
  }

  @Post('devices/:deviceId/session/disconnect')
  @Rule('team')
  @ApiOperation({ summary: 'Desconectar e limpar sessão só deste dispositivo' })
  async deviceSessionDisconnect(
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
  ) {
    await this.whatsAppService.disconnectDevice(deviceId);
    return { ok: true };
  }

  @Post('devices')
  @Rule('team')
  @ApiOperation({ summary: 'Cadastrar dispositivo (linha lógica)' })
  create(@Body() dto: CreateWhatsAppDeviceDto) {
    return this.devicesService.create(dto);
  }

  @Patch('devices/:deviceId')
  @Rule('team')
  @ApiOperation({ summary: 'Atualizar dispositivo (nome, telefone, operador, agente IA)' })
  patch(
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
    @Body() dto: PatchWhatsAppDeviceDto,
    @User() user: { id: string },
  ) {
    return this.devicesService.patch(deviceId, dto, user.id);
  }

  @Delete('devices/:deviceId')
  @Rule('team')
  @ApiOperation({ summary: 'Remover dispositivo (não permite o padrão)' })
  remove(@Param('deviceId', ParseUUIDPipe) deviceId: string) {
    return this.devicesService.remove(deviceId);
  }
}
