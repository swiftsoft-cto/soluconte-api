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
import { User } from 'src/modules/users/entities/user.entity';
import { Company } from 'src/modules/companies/entities/companies.entity';
import { Conversation } from './conversation.entity';
import { AgentFile } from './agent-file.entity';

@Entity('agents')
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 256 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  /** System instructions (like ChatGPT GPT instructions) */
  @Column({ type: 'text', nullable: true })
  instructions: string;

  @Column({ length: 512, nullable: true })
  imageUrl: string;

  /** Conversation starters (suggested prompts) */
  @Column({ type: 'json', nullable: true })
  conversationStarters: string[];

  /** Recommended model for this agent (e.g. gpt-4o-mini) */
  @Column({ length: 128, nullable: true })
  recommendedModel: string;

  /**
   * Escopo do agente: general | client | internal
   * - general: conhecimento livre, você treina como quiser
   * - client: vinculado a um cliente; só dados desse cliente (empresa, documentos)
   * - internal: entende todo o sistema e pode realizar CRUD (clientes, usuários, tarefas)
   */
  @Column({ length: 32, default: 'general' })
  scope: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /** Quando scope = 'client', empresa (cliente) vinculada a este agente */
  @ManyToOne(() => Company, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'linked_client_id' })
  linkedClient: Company;

  /** Owner user */
  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** Optional: scope to company (tenant) */
  @ManyToOne(() => Company, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Conversation, (c) => c.agent)
  conversations: Conversation[];

  @OneToMany(() => AgentFile, (f) => f.agent)
  files: AgentFile[];
}
