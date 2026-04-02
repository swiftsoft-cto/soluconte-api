import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { User } from '../users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import templateConfirmEmail from './templates/confirmEmail.template';
import templatePasswordReset from './templates/passwordResets';
import templateLeadNotification from './templates/leadNotification.template';
import templateLeadConfirmation from './templates/leadConfirmation.template';
import templateTaskReportManager from './templates/taskReportManager.template';
import templateTaskReportEmployee from './templates/taskReportEmployee.template';
import templateDocumentNotification from './templates/documentNotification.template';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async sendConfirmationEmail(user: any, code: string) {
    const to = user.email;

    user.emailConfirmationCode = code;
    user.isEmailConfirmed = false;
    delete user.password;
    await this.userRepository.save(user);

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const subject = 'Confirmação de E-mail';
    const text = `Seu código de confirmação: ${code}`;
    const html = templateConfirmEmail(user.name, code);

    const mailOptions = {
      from: `"${process.env.COMPANY_NAME}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      return info;
    } catch (error) {
      this.logger.error('Erro ao enviar email:', error);
      throw error;
    }
  }

  async sendPasswordResetEmail(user: User, code: string) {
    const to = user.email;

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const subject = 'Recuperação de Senha';
    const text = `Seu código de recuperação de senha: ${code}`;
    const html = templatePasswordReset(user.name, code);

    const mailOptions = {
      from: `"${process.env.COMPANY_NAME}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      return info;
    } catch (error) {
      this.logger.error('Erro ao enviar email:', error);
      throw error;
    }
  }

  async sendLeadNotification(leadData: {
    cnpj: string;
    name: string;
    email: string;
    phone: string;
    interestService: string;
    message: string;
  }) {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const subject = 'Novo Lead Recebido';
    const html = templateLeadNotification(leadData);

    const mailOptions = {
      from: `"${process.env.COMPANY_NAME}" <${process.env.EMAIL_USER}>`,
      to: `${process.env.EMAILS_LEAD}`,
      subject,
      html,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      return info;
    } catch (error) {
      this.logger.error('Erro ao enviar email:', error);
      throw error;
    }
  }

  async sendLeadConfirmation(leadData: {
    name: string;
    email: string;
    interestService: string;
  }) {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const subject = 'Recebemos seu Contato';
    const html = templateLeadConfirmation({
      name: leadData.name,
      interestService: leadData.interestService,
    });

    const mailOptions = {
      from: `"${process.env.COMPANY_NAME}" <${process.env.EMAIL_USER}>`,
      to: leadData.email,
      subject,
      html,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      return info;
    } catch (error) {
      this.logger.error('Erro ao enviar email:', error);
      throw error;
    }
  }

  async sendTaskReportToManager(reportData: {
    managerName: string;
    managerEmail: string;
    reportDate: string;
    tasks: Array<{
      dueDate: string;
      title: string;
      priority: string;
      responsible: string;
      isOverdue: boolean;
    }>;
    totalTasks: number;
  }) {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const subject = `[${process.env.COMPANY_NAME}] Relatório Geral de Tarefas - ${reportData.reportDate}`;
    const html = templateTaskReportManager(reportData);

    const mailOptions = {
      from: `"${process.env.COMPANY_NAME}" <${process.env.EMAIL_USER}>`,
      to: reportData.managerEmail,
      subject,
      html,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      this.logger.log(
        `Relatório geral enviado para ${reportData.managerName} (${reportData.managerEmail})`,
      );
      return info;
    } catch (error) {
      this.logger.error(
        `Erro ao enviar relatório para ${reportData.managerEmail}:`,
        error,
      );
      throw error;
    }
  }

  async sendTaskReportToEmployee(reportData: {
    employeeName: string;
    employeeEmail: string;
    reportDate: string;
    tasks: Array<{
      dueDate: string;
      title: string;
      priority: string;
      role: string;
      isOverdue: boolean;
    }>;
    totalTasks: number;
  }) {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const subject = `[${process.env.COMPANY_NAME}] Suas Tarefas Pendentes - ${reportData.reportDate}`;
    const html = templateTaskReportEmployee(reportData);

    const mailOptions = {
      from: `"${process.env.COMPANY_NAME}" <${process.env.EMAIL_USER}>`,
      to: reportData.employeeEmail,
      subject,
      html,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      this.logger.log(
        `Relatório individual enviado para ${reportData.employeeName} (${reportData.employeeEmail})`,
      );
      return info;
    } catch (error) {
      this.logger.error(
        `Erro ao enviar relatório para ${reportData.employeeEmail}:`,
        error,
      );
      throw error;
    }
  }

  async sendDocumentNotification(data: {
    companyName: string;
    email: string;
    fileName: string;
    year: number;
    month: string;
    loginUrl: string;
  }) {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const subject = `[${process.env.COMPANY_NAME || 'Naciopetro'}] Novo Documento Disponível - ${data.companyName}`;
    const html = templateDocumentNotification(data);

    const mailOptions = {
      from: `"${process.env.COMPANY_NAME || 'Naciopetro'}" <${process.env.EMAIL_USER}>`,
      to: data.email,
      subject,
      html,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      this.logger.log(
        `Notificação de documento enviada para ${data.email} (${data.companyName})`,
      );
      return info;
    } catch (error) {
      this.logger.error(
        `Erro ao enviar notificação de documento para ${data.email}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Envio genérico de e-mail (uso pelo agente interno: boas-vindas, acesso à plataforma, etc.).
   * @param to - Endereço de e-mail do destinatário
   * @param subject - Assunto
   * @param body - Corpo da mensagem (texto ou HTML conforme isHtml)
   * @param isHtml - Se true, body é interpretado como HTML; senão, texto plano
   */
  async sendEmail(to: string, subject: string, body: string, isHtml = true): Promise<{ messageId?: string }> {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"${process.env.COMPANY_NAME || 'Sistema'}" <${process.env.EMAIL_USER}>`,
      to: to.trim(),
      subject: subject.trim(),
      ...(isHtml ? { html: body } : { text: body }),
    };

    const info = await transporter.sendMail(mailOptions);
    this.logger.log(`E-mail enviado para ${to} (assunto: ${subject.substring(0, 50)}...)`);
    return { messageId: info.messageId };
  }
}
