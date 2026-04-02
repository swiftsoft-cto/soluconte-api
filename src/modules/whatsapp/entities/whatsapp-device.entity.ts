import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Agent } from 'src/modules/agents/entities/agent.entity';
import { WhatsAppThread } from './whatsapp-thread.entity';

/** Linha / aparelho lógico (multi-dispositivo). Sessão atual do whatsapp-web.js costuma atender o dispositivo `isDefault`. */
@Entity('whatsapp_devices')
export class WhatsAppDevice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  name: string;

  @Column({ name: 'phone_label', length: 64, nullable: true })
  phoneLabel: string | null;

  /** Rótulo livre ex.: operador responsável (UI). */
  @Column({ name: 'operator_label', length: 120, nullable: true })
  operatorLabel: string | null;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @ManyToOne(() => Agent, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent | null;

  /** Usuário que vinculou o agente ao dispositivo (herdado por threads novas). */
  @Column({ name: 'ai_acting_user_id', type: 'uuid', nullable: true })
  aiActingUserId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => WhatsAppThread, (t) => t.device)
  threads: WhatsAppThread[];
}
