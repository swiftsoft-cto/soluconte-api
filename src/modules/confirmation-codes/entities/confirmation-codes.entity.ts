import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from 'src/modules/users/entities/user.entity';

@Entity('confirmation_codes')
export class ConfirmationCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User; // Relaciona com o usuário que receberá o código

  @Column({ length: 50 })
  code: string; // O código em si (pode ser string curta, ex: 6 dígitos ou random hex)

  @Column({ length: 50 })
  type: string;
  // "EMAIL_CONFIRMATION", "PASSWORD_RESET", etc.

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;
  // Para indicar quando expira

  @Column({ type: 'timestamp', nullable: true })
  usedAt: Date;
  // Marca quando foi usado

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
