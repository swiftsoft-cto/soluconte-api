import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RulesGuard } from 'src/common/guards/rules.guard';
import { Rule } from 'src/common/decorators/rule.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { User as UserEntity } from '../../users/entities/user.entity';
import { PasswordVaultService } from '../services/password-vault.service';
import { PasswordEntryService } from '../services/password-entry.service';
import { CreatePasswordVaultDto } from '../dtos/create-password-vault.dto';
import { CreatePasswordEntryDto } from '../dtos/create-password-entry.dto';
import { UpdatePasswordEntryDto } from '../dtos/update-password-entry.dto';
import { UpdatePasswordVaultDto } from '../dtos/update-password-vault.dto';
import { PasswordVaultResponseDto, PasswordEntryResponseDto, PasswordAccessLogResponseDto } from '../dtos/password-vault-response.dto';

@Controller('api/password-vault')
@UseGuards(JwtAuthGuard, RulesGuard)
export class PasswordVaultController {
  constructor(
    private vaultService: PasswordVaultService,
    private entryService: PasswordEntryService,
  ) {}

  // ============================== PASTAS DE SENHAS ==============================

  @Get('vaults')
  @Rule('password-vault.view')
  async getUserVaults(@User() currentUser: UserEntity): Promise<PasswordVaultResponseDto[]> {
    return this.vaultService.findUserVaults(currentUser);
  }

  @Post('vaults')
  @Rule('password-vault.create')
  async createVault(
    @Body() createVaultDto: CreatePasswordVaultDto,
    @User() currentUser: UserEntity,
  ): Promise<PasswordVaultResponseDto> {
    return this.vaultService.createVault(createVaultDto, currentUser);
  }

  @Get('vaults/:id')
  @Rule('password-vault.view')
  async getVault(
    @Param('id') id: string,
    @User() currentUser: UserEntity,
  ): Promise<PasswordVaultResponseDto> {
    return this.vaultService.findOne(id, currentUser);
  }

  @Delete('vaults/:id')
  @Rule('password-vault.delete')
  async deleteVault(
    @Param('id') id: string,
    @User() currentUser: UserEntity,
  ): Promise<void> {
    return this.vaultService.deleteVault(id, currentUser);
  }

  @Put('vaults/:id')
  @Rule('password-vault.update')
  async updateVault(
    @Param('id') id: string,
    @Body() body: UpdatePasswordVaultDto,
    @User() currentUser: UserEntity,
  ): Promise<PasswordVaultResponseDto> {
    return this.vaultService.updateVault(id, body, currentUser);
  }

  // ============================== CREDENCIAIS ==============================

  @Get('entries/vault/:vaultId')
  @Rule('password-vault.view')
  async getVaultEntries(
    @Param('vaultId') vaultId: string,
    @User() currentUser: UserEntity,
  ): Promise<PasswordEntryResponseDto[]> {
    return this.entryService.findVaultEntries(vaultId, currentUser);
  }

  @Post('entries')
  @Rule('password-vault.create')
  async createEntry(
    @Body() createEntryDto: CreatePasswordEntryDto,
    @User() currentUser: UserEntity,
  ): Promise<PasswordEntryResponseDto> {
    return this.entryService.createEntry(createEntryDto, currentUser);
  }

  @Put('entries/:id')
  @Rule('password-vault.update')
  async updateEntry(
    @Param('id') id: string,
    @Body() updateEntryDto: UpdatePasswordEntryDto,
    @User() currentUser: UserEntity,
  ): Promise<PasswordEntryResponseDto> {
    return this.entryService.updateEntry(id, updateEntryDto, currentUser);
  }

  @Delete('entries/:id')
  @Rule('password-vault.delete')
  async deleteEntry(
    @Param('id') id: string,
    @User() currentUser: UserEntity,
  ): Promise<void> {
    return this.entryService.deleteEntry(id, currentUser);
  }

  @Post('entries/:id/view-password')
  @Rule('password-vault.view')
  async viewPassword(
    @Param('id') id: string,
    @User() currentUser: UserEntity,
    @Req() req: any,
  ): Promise<{ password: string }> {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    return this.entryService.viewPassword(id, currentUser, ipAddress, userAgent);
  }

  // ============================== AUDITORIA ==============================

  @Get('audit/:entryId')
  @Rule('password-vault.audit')
  async getAccessLogs(
    @Param('entryId') entryId: string,
    @User() currentUser: UserEntity,
  ): Promise<PasswordAccessLogResponseDto[]> {
    return this.entryService.getAccessLogs(entryId, currentUser);
  }
}
