// confirmation-code.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { User } from 'src/modules/users/entities/user.entity';
import { ConfirmationCode } from './entities/confirmation-codes.entity';

@Injectable()
export class ConfirmationCodeService {
  constructor(
    @InjectRepository(ConfirmationCode)
    private readonly codeRepository: Repository<ConfirmationCode>,
  ) {}

  async createCode(
    user: User,
    type: string,
    expiresInMinutes = 60,
  ): Promise<ConfirmationCode> {
    // 1. Invalida todos os códigos anteriores ainda ativos (não expirados e não usados).
    await this.invalidateExistingCodes(user, type);

    // 2. Gera um código numérico de 6 dígitos (entre 100000 e 999999).
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Define o tempo de expiração.
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60_000);

    // 4. Cria e salva o novo código.
    const confirmationCode = this.codeRepository.create({
      user,
      code,
      type,
      expiresAt,
    });
    return this.codeRepository.save(confirmationCode);
  }

  private async invalidateExistingCodes(
    user: User,
    type: string,
  ): Promise<void> {
    const now = new Date();

    // Busca códigos não expirados e não usados
    const activeCodes = await this.codeRepository.find({
      where: {
        user: { id: user.id },
        type,
        usedAt: null, // ainda não usados
        expiresAt: MoreThan(now), // expira no futuro
      },
    });

    if (activeCodes.length > 0) {
      for (const code of activeCodes) {
        code.usedAt = new Date(); // marca como usado para invalidar
        // code.invalidatedAt = new Date(); se quiser um campo específico
      }
      await this.codeRepository.save(activeCodes);
    }
  }

  async validateCode(
    user: User,
    type: string,
    code: string,
  ): Promise<ConfirmationCode> {
    const existingCode = await this.codeRepository.findOne({
      where: {
        user: { id: user.id },
        type,
        code,
      },
    });

    if (!existingCode) {
      throw new BadRequestException('Invalid code');
    }

    // Verifica se está expirado
    if (existingCode.expiresAt && existingCode.expiresAt < new Date()) {
      throw new BadRequestException('Code is expired');
    }

    // Verifica se já foi usado
    if (existingCode.usedAt) {
      throw new BadRequestException('Code already used');
    }

    // Marca como usado se for de uso único
    existingCode.usedAt = new Date();
    await this.codeRepository.save(existingCode);

    return existingCode;
  }

  // Caso queira reaproveitar o mesmo código, não setar usedAt

  async checkCodeIsValid(user: User, code: string): Promise<boolean> {
    const existingCode = await this.codeRepository.findOne({
      where: {
        user: { id: user.id },
        code,
      },
      order: {
        createdAt: 'DESC', // Ordena pelos mais recentes
      },
    });
    console.log(
      '🚀 ~ ConfirmationCodeService ~ checkCodeIsValid ~ existingCode:',
      existingCode,
    );

    if (!existingCode) {
      throw new BadRequestException('Invalid code');
    }

    // Verifica expiração
    if (existingCode.expiresAt && existingCode.expiresAt < new Date()) {
      throw new BadRequestException('Code is expired');
    }

    // Verifica se já foi usado
    if (existingCode.usedAt) {
      throw new BadRequestException('Code already used');
    }

    // Se chegou até aqui, o código está válido
    return true;
  }
}
