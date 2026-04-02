import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PasswordEntry } from './password-entry.entity';
import { User } from '../../users/entities/user.entity';

export enum PasswordAccessAction {
  VIEW = 'VIEW',
  EDIT = 'EDIT',
  CREATE = 'CREATE',
  DELETE = 'DELETE',
}

@Entity('password_access_logs')
export class PasswordAccessLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'entry_id' })
  entryId: string;

  @ManyToOne(() => PasswordEntry, entry => entry.accessLogs)
  @JoinColumn({ name: 'entry_id' })
  entry: PasswordEntry;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: PasswordAccessAction,
  })
  action: PasswordAccessAction;

  @Column({ nullable: true, name: 'ip_address' })
  ipAddress: string;

  @Column({ nullable: true, name: 'user_agent' })
  userAgent: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}


































