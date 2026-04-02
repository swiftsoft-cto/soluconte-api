import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor() {
    // Usar chave do ambiente ou gerar uma padrão para desenvolvimento
    const keyString = process.env.ENCRYPTION_KEY || 'sua-chave-secreta-de-32-bytes-aqui-12345678901234567890123456789012';
    this.key = crypto.scryptSync(keyString, 'salt', 32);
  }

  encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(this.algorithm, this.key);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    } catch (error) {
      throw new Error('Erro ao criptografar senha: ' + error.message);
    }
  }

  decrypt(encryptedText: string): string {
    try {
      const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
      
      if (!ivHex || !authTagHex || !encrypted) {
        throw new Error('Formato de texto criptografado inválido');
      }
      
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      const decipher = crypto.createDecipher(this.algorithm, this.key);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error('Erro ao descriptografar senha: ' + error.message);
    }
  }
}


































