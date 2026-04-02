import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Company } from 'src/modules/companies/entities/companies.entity';
import { UserRole } from 'src/modules/user-role/entities/user-role.entity';
import { Exclude } from 'class-transformer';
import { Rule } from '../../rules/entities.rules.entity';

export enum Gender {
  M = 'M',
  F = 'F',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 256 })
  name: string;

  @Column({ length: 256 })
  lastName: string;

  @Column({ length: 256, nullable: true })
  email: string;

  @Column({ type: 'boolean', nullable: true })
  isRootUser: boolean;

  @Column({ length: 512, nullable: true })
  imageUrl?: string;

  @Column({ length: 256, nullable: true })
  password: string;

  @Column({ length: 15, nullable: true })
  document?: string;

  @Column({ length: 5, nullable: true })
  countryCode?: string;

  @Column({ length: 15, nullable: true })
  phone?: string;

  @Column({ type: 'datetime', nullable: true })
  birthdate?: Date;

  @Column({ type: 'enum', enum: Gender, nullable: true })
  gender?: Gender | null;

  @Column({ length: 11, nullable: true })
  postalCode?: string;

  @Column({ length: 256, nullable: true })
  address?: string;

  @Column({ length: 256, nullable: true })
  addressNumber?: string;

  @Column({ length: 256, nullable: true })
  addressComplement?: string;

  @Column({ length: 256, nullable: true })
  neighborhood?: string;

  @Column({ length: 256, nullable: true })
  city?: string;

  @Column({ length: 256, nullable: true })
  state?: string;

  @Column({ length: 256, nullable: true })
  country?: string;

  @Column({ type: 'text', nullable: true })
  observations?: string;

  // Empresa "selecionada" (opcional)
  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'selected_company_id' })
  selectedCompany: Company;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;

  // Relacionamento com UserRole
  @OneToMany(() => UserRole, (userRole) => userRole.user)
  userRoles: UserRole[];

  @Column({ default: false })
  isEmailConfirmed: boolean;

  // Propriedade para armazenar as rules (não persistida no banco de dados)
  @Exclude()
  rules?: Rule[];

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ length: 6, nullable: true })
  emailConfirmationCode?: string;

  @Column({ type: 'datetime', nullable: true, name: 'last_login_at' })
  lastLoginAt?: Date;

  @Column({ type: 'datetime', nullable: true, name: 'last_activity_at' })
  lastActivityAt?: Date;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    // Se não existe password, não faz nada
    if (!this.password) return;

    // Se já começa com '$2' (bcrypt), assumimos que seja hash -> não re-hasha
    if (this.password.startsWith('$2')) {
      return;
    }

    // Se chegou aqui, significa que a senha está em texto puro; vamos hashear
    const salt = await bcrypt.genSalt();
    this.password = await bcrypt.hash(this.password, salt);
  }
}
