import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { PasswordVault } from './password-vault.entity';
import { User } from '../../users/entities/user.entity';
import { PasswordAccessLog } from './password-access-log.entity';

@Entity('password_entries')
export class PasswordEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  username: string;

  @Column({ name: 'encrypted_password' })
  encryptedPassword: string;

  @Column({ nullable: true })
  url: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ default: false, name: 'is_restricted' })
  isRestricted: boolean;

  @Column({ name: 'vault_id' })
  vaultId: string;

  @ManyToOne(() => PasswordVault, vault => vault.entries)
  @JoinColumn({ name: 'vault_id' })
  vault: PasswordVault;

  @Column({ name: 'created_by_id' })
  createdById: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @OneToMany(() => PasswordAccessLog, log => log.entry)
  accessLogs: PasswordAccessLog[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}


































