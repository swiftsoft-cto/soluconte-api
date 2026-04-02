import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { WhatsAppThread } from './whatsapp-thread.entity';

export type WhatsAppLineDirection = 'inbound' | 'outbound' | 'system';

@Entity('whatsapp_thread_messages')
@Index(['threadId', 'createdAt'])
export class WhatsAppThreadMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'thread_id', type: 'uuid' })
  threadId: string;

  @ManyToOne(() => WhatsAppThread, (t) => t.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'thread_id' })
  thread: WhatsAppThread;

  @Column({ type: 'varchar', length: 16 })
  direction: WhatsAppLineDirection;

  @Column({ type: 'text' })
  body: string;

  /** ID serializado da mensagem no WhatsApp (se houver). */
  @Column({ name: 'wa_message_id', length: 128, nullable: true })
  waMessageId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
