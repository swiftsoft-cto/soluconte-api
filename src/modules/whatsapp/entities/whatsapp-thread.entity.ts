import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Agent } from 'src/modules/agents/entities/agent.entity';
import { WhatsAppDevice } from './whatsapp-device.entity';
import { WhatsAppThreadMessage } from './whatsapp-thread-message.entity';

/** Conversa 1:1 (thread) com um contato no WhatsApp (identificada pelo JID da web). */
@Entity('whatsapp_threads')
@Index(['deviceId', 'waChatId'], { unique: true })
export class WhatsAppThread {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'device_id', type: 'uuid' })
  deviceId: string;

  @ManyToOne(() => WhatsAppDevice, (d) => d.threads, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'device_id' })
  device: WhatsAppDevice;

  /** Ex.: 5511999999999@c.us */
  @Column({ name: 'wa_chat_id', length: 128 })
  waChatId: string;

  @Column({ name: 'contact_name', length: 256, nullable: true })
  contactName: string | null;

  @Column({ name: 'contact_phone', length: 64, nullable: true })
  contactPhone: string | null;

  @Column({ name: 'last_message_at', type: 'datetime', nullable: true })
  lastMessageAt: Date | null;

  @Column({ name: 'unread_count', type: 'int', default: 0 })
  unreadCount: number;

  @Column({ name: 'ai_enabled', type: 'boolean', default: false })
  aiEnabled: boolean;

  @Column({ name: 'agent_id', type: 'uuid', nullable: true })
  agentId: string | null;

  /** Usuário que ativou a IA nesta thread (permissões / contexto nas tools). */
  @Column({ name: 'ai_acting_user_id', type: 'uuid', nullable: true })
  aiActingUserId: string | null;

  @ManyToOne(() => Agent, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => WhatsAppThreadMessage, (m) => m.thread, { cascade: true })
  messages: WhatsAppThreadMessage[];
}
