import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Agent } from './agent.entity';

@Entity('agent_files')
export class AgentFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 512 })
  fileName: string;

  @Column({ length: 1024 })
  fileUrl: string;

  /** Extracted text for RAG / context injection */
  @Column({ type: 'longtext', nullable: true })
  contentText: string;

  /** Optional: embedding vector stored as JSON array (for similarity search later) */
  @Column({ type: 'json', nullable: true })
  embedding: number[];

  /**
   * Estado do embedding do arquivo (RAG):
   *  - ready: embedding gerado e persistido
   *  - failed: chamada à OpenAI falhou (candidato a retry)
   *  - unavailable: OpenAI não estava configurada no upload
   *  - skipped: arquivo sem texto extraído (contentText vazio)
   */
  @Column({
    name: 'embedding_status',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  embeddingStatus: 'ready' | 'failed' | 'unavailable' | 'skipped' | null;

  @ManyToOne(() => Agent, (agent) => agent.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
