import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Repository } from 'typeorm';
import { ConfirmationCodeService } from '../confirmation-codes/confirmation-code.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly emailService: EmailService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly confirmationCodeService: ConfirmationCodeService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneWithRelationsByEmail(email);

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Se o e‑mail ainda não estiver confirmado, gera e envia um novo código
    if (!user.isEmailConfirmed) {
      // dispara o código e o e‑mail em background, sem await
      this.confirmationCodeService
        .createCode(user, 'EMAIL_CONFIRMATION', 10)
        .then((confirmation) =>
          this.emailService
            .sendConfirmationEmail(user, confirmation.code)
            .catch((err) => {
              // logue o erro, mas não interrompa o fluxo
              console.error('Erro ao enviar e‑mail de confirmação:', err);
            }),
        )
        .catch((err) => {
          console.error('Erro ao gerar código de confirmação:', err);
        });

      // imediatamente retorna a exceção para o cliente
      throw new UnauthorizedException({
        message: 'Email not confirmed. Please check your inbox.',
        validEmail: false,
      });
    }

    const { userRoles, ...userDetails } = user;
    const { selectedCompany } = user;

    // 1) Mapeia todas as empresas
    const allCompanies = new Map<string, { id: string; name: string }>();
    userRoles.forEach((ur) => {
      ur.role.roleDepartments.forEach((rd) => {
        const comp = rd.department.company;
        if (!allCompanies.has(comp.id)) {
          allCompanies.set(comp.id, { id: comp.id, name: comp.name });
        }
      });
    });

    // 1.1) Escolhe a empresa-alvo para as roles:
    const targetCompanyId = allCompanies.has('1') ? '1' : selectedCompany?.id;

    // 2) Filtra as roles para a empresa-alvo
    let selectedCompanyRoles = [];
    if (targetCompanyId) {
      selectedCompanyRoles = userRoles
        .map((ur) => ur.role)
        .filter((role) =>
          role.roleDepartments.some(
            (rd) => rd.department.company.id === targetCompanyId,
          ),
        )
        .map((role) => {
          const departments = role.roleDepartments
            .filter((rd) => rd.department.company.id === targetCompanyId)
            .map((rd) => ({
              id: rd.department.id,
              name: rd.department.name,
              company: {
                id: rd.department.company.id,
                name: rd.department.company.name,
              },
            }));
          return {
            id: role.id,
            name: role.name,
            departments,
          };
        });
    }

    // 3) Monta o payload de selectedCompany, mantendo todos os outros campos
    const selectedCompanyPayload = selectedCompany
      ? {
          id: selectedCompany.id,
          name: selectedCompany.name,
          description: selectedCompany.description,
          imageUrl: selectedCompany.imageUrl,
          createdAt: selectedCompany.createdAt,
          updatedAt: selectedCompany.updatedAt,
          deletedAt: selectedCompany.deletedAt,
          roles: selectedCompanyRoles,
        }
      : null;

    // 4) Array de empresas
    const companiesArray = Array.from(allCompanies.values());

    // 5) Retorna o payload final
    return {
      ...userDetails,
      selectedCompany: selectedCompanyPayload,
      companies: companiesArray,
    };
  }

  async login(user: any) {
    // Atualizar data de último login
    if (user.id) {
      await this.userRepository.update(user.id, {
        lastLoginAt: new Date(),
        lastActivityAt: new Date(),
      });
    }

    const payload = { username: user.email, sub: user.id };
    return this.jwtService.sign(payload);
  }

  async confirmEmail(email: string, code: string) {
    const user = await this.usersService.findOneWithRelationsByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.isEmailConfirmed) {
      throw new BadRequestException('Email is already confirmed');
    }

    // Valida o código na tabela "confirmation_codes"
    await this.confirmationCodeService.validateCode(
      user,
      'EMAIL_CONFIRMATION',
      code,
    );

    // Marca o e-mail como confirmado (se quiser ter essa flag no User)
    user.isEmailConfirmed = true;
    delete user.password;
    await this.userRepository.save(user);

    return { message: 'Email confirmed successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findOneWithRelationsByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const confirmationCode = await this.confirmationCodeService.createCode(
      user,
      'PASSWORD_RESET',
      10, // expira em 10 minutos
    );
    await this.emailService.sendPasswordResetEmail(user, confirmationCode.code);
    return { message: 'Password reset code sent to your email' };
  }

  async checkCodeIsValid(email: string, code: string) {
    const user = await this.usersService.findOneWithRelationsByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.confirmationCodeService.checkCodeIsValid(user, code);

    // Se chegou aqui, é porque está válido
    return { valid: true, message: 'Code is valid' };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const user = await this.usersService.findOneWithRelationsByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.confirmationCodeService.validateCode(
      user,
      'PASSWORD_RESET',
      code,
    );

    user.password = newPassword;
    await this.userRepository.save(user);

    return { message: 'Password changed successfully' };
  }

  /**
   * Retorna o payload do usuário logado, já com as relações carregadas.
   * Pode ser usado no endpoint /me
   */
  async getProfilePayload(userId: string) {
    const user = await this.usersService.findOneWithRelations(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.buildUserPayload(Object.assign(new User(), user));
  }

  /**
   * Recebe um usuário (com relations carregadas) e devolve o objeto formatado:
   * {
   *   id, name, email, ...
   *   selectedCompany: { ...roles: [...]},
   *   companies: [...]
   * }
   */
  buildUserPayload(user: User) {
    const { userRoles, rules, ...userDetails } = user;

    // 2) Pega a empresa selecionada original
    const { selectedCompany } = user;

    // 3) Monta um map para coletar todas as empresas do usuário
    const allCompanies = new Map<string, { id: string; name: string }>();
    userRoles.forEach((ur) => {
      ur.role.roleDepartments.forEach((rd) => {
        const comp = rd.department.company;
        if (!allCompanies.has(comp.id)) {
          allCompanies.set(comp.id, { id: comp.id, name: comp.name });
        }
      });
    });

    // 3.1) Decide de qual empresa vamos “roubar” as roles:
    //      se existir a company id="1" em allCompanies, usamos ela; senão, usamos a selectedCompany.id
    const targetCompanyId = allCompanies.has('1') ? '1' : selectedCompany?.id;

    // 4) Filtra as roles para a company alvo (targetCompanyId)
    let selectedCompanyRoles: Array<{
      id: string;
      name: string;
      departments: Array<{
        id: string;
        name: string;
        company: { id: string; name: string };
      }>;
    }> = [];

    if (targetCompanyId) {
      selectedCompanyRoles = userRoles
        .map((ur) => ur.role)
        .filter((role) =>
          // roleDepartments onde company.id === targetCompanyId
          role.roleDepartments.some(
            (rd) => rd.department.company.id === targetCompanyId,
          ),
        )
        .map((role) => {
          const departments = role.roleDepartments
            .filter((rd) => rd.department.company.id === targetCompanyId)
            .map((rd) => ({
              id: rd.department.id,
              name: rd.department.name,
              company: {
                id: rd.department.company.id,
                name: rd.department.company.name,
              },
            }));
          return {
            id: role.id,
            name: role.name,
            departments,
          };
        });
    }

    // 5) Monta o payload de selectedCompany (mantendo todos os campos originais,
    //    mas sobrescrevendo somente o array de roles)
    const selectedCompanyPayload = selectedCompany
      ? {
          id: selectedCompany.id,
          name: selectedCompany.name,
          imageUrl: selectedCompany.imageUrl,
          description: selectedCompany.description,
          createdAt: selectedCompany.createdAt,
          updatedAt: selectedCompany.updatedAt,
          deletedAt: selectedCompany.deletedAt,
          roles: selectedCompanyRoles,
        }
      : null;

    // 6) Transforma o Map em array simples
    const companiesArray = Array.from(allCompanies.values());

    // 7) Retorna o payload completo
    return {
      ...userDetails,
      selectedCompany: selectedCompanyPayload,
      companies: companiesArray,
      rules,
    };
  }

  /**
   * Gera e envia um novo código de confirmação de e‑mail.
   * Lança BadRequest se o e‑mail já estiver confirmado.
   */
  async resendConfirmation(email: string): Promise<string> {
    // 1) Busca o usuário
    const user = await this.usersService.findOneWithRelationsByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 2) Se já confirmou, não faz nada
    if (user.isEmailConfirmed) {
      throw new BadRequestException('Email already confirmed');
    }

    // 3) Gera um novo código (expira em 10 minutos, por ex.)
    const confirmation = await this.confirmationCodeService.createCode(
      user,
      'EMAIL_CONFIRMATION',
      10,
    );

    // 4) Dispara o e‑mail em background
    this.emailService
      .sendConfirmationEmail(user, confirmation.code)
      .catch((err) => {
        console.error('Erro ao reenviar e‑mail de confirmação:', err);
      });

    // 5) Retorna mensagem traduzida
    return 'Código reenviado!';
  }
}
