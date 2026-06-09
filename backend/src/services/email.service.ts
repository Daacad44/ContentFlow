/**
 * src/services/email.service.ts
 * Transactional email via SMTP (nodemailer). When SMTP is not configured the
 * service logs the email to the console instead — handy for local development
 * so the flows still work end-to-end without a mail provider.
 */
import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.smtpEnabled) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return transporter;
}

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function send({ to, subject, html, text }: SendArgs): Promise<void> {
  const tx = getTransporter();
  if (!tx) {
    logger.info({ to, subject, text }, '📧 [DEV] Email (SMTP disabled) — logged only');
    return;
  }
  await tx.sendMail({ from: env.EMAIL_FROM, to, subject, html, text });
  logger.info({ to, subject }, 'Email sent');
}

function layout(title: string, bodyHtml: string): string {
  return `
  <div style="background:#0b1220;padding:32px 0;font-family:Inter,Arial,sans-serif">
    <div style="max-width:480px;margin:0 auto;background:#111a2e;border-radius:16px;overflow:hidden;border:1px solid #1e2a44">
      <div style="padding:24px 32px;border-bottom:1px solid #1e2a44">
        <span style="color:#ff7a1a;font-size:20px;font-weight:800">◆ ${env.APP_NAME}</span>
      </div>
      <div style="padding:32px;color:#c7d2e6;font-size:15px;line-height:1.6">
        <h1 style="color:#ffffff;font-size:20px;margin:0 0 16px">${title}</h1>
        ${bodyHtml}
      </div>
      <div style="padding:20px 32px;border-top:1px solid #1e2a44;color:#5b6b88;font-size:12px">
        You received this email because an action was requested on your ${env.APP_NAME} account.
      </div>
    </div>
  </div>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#ff7a1a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;margin:8px 0">${label}</a>`;
}

export const emailService = {
  async sendVerificationEmail(to: string, name: string, token: string) {
    const link = `${env.CLIENT_URL}/verify-email?token=${encodeURIComponent(token)}`;
    await send({
      to,
      subject: `Verify your ${env.APP_NAME} email`,
      text: `Hi ${name}, verify your email: ${link}`,
      html: layout(
        'Verify your email 📩',
        `<p>Hi ${name}, welcome to ${env.APP_NAME}! Confirm your email address to activate your account.</p>
         <p>${button(link, 'Verify Email')}</p>
         <p style="color:#5b6b88;font-size:13px">This link expires in 24 hours. If you didn't sign up, you can ignore this email.</p>`,
      ),
    });
  },

  async sendPasswordResetEmail(to: string, name: string, token: string) {
    const link = `${env.CLIENT_URL}/reset-password?token=${encodeURIComponent(token)}`;
    await send({
      to,
      subject: `Reset your ${env.APP_NAME} password`,
      text: `Hi ${name}, reset your password: ${link}`,
      html: layout(
        'Reset your password 🔑',
        `<p>Hi ${name}, we received a request to reset your password.</p>
         <p>${button(link, 'Reset Password')}</p>
         <p style="color:#5b6b88;font-size:13px">This link expires in 1 hour. If you didn't request this, your password is still safe.</p>`,
      ),
    });
  },

  async sendPasswordChangedEmail(to: string, name: string) {
    await send({
      to,
      subject: `Your ${env.APP_NAME} password was changed`,
      text: `Hi ${name}, your password was just changed.`,
      html: layout(
        'Password changed ✅',
        `<p>Hi ${name}, this is a confirmation that your password was just changed.</p>
         <p style="color:#5b6b88;font-size:13px">If this wasn't you, reset your password immediately and contact support.</p>`,
      ),
    });
  },

  async sendWelcomeEmail(to: string, name: string) {
    await send({
      to,
      subject: `Welcome to ${env.APP_NAME} 🚀`,
      text: `Welcome aboard, ${name}!`,
      html: layout(
        'Welcome aboard 🚀',
        `<p>Hi ${name}, your email is verified and your account is ready. Create, schedule and grow with ${env.APP_NAME}.</p>
         <p>${button(env.CLIENT_URL, 'Open Dashboard')}</p>`,
      ),
    });
  },

  async sendWorkspaceInvitationEmail(
    to: string,
    inviterName: string,
    workspaceName: string,
    token: string,
  ) {
    const link = `${env.CLIENT_URL}/invitations/accept?token=${encodeURIComponent(token)}`;
    await send({
      to,
      subject: `You're invited to join ${workspaceName} on ${env.APP_NAME}`,
      text: `${inviterName} invited you to join ${workspaceName}. Accept: ${link}`,
      html: layout(
        `Join ${workspaceName} 👥`,
        `<p><strong>${inviterName}</strong> invited you to collaborate on <strong>${workspaceName}</strong>.</p>
         <p>${button(link, 'Accept Invitation')}</p>
         <p style="color:#5b6b88;font-size:13px">This invitation expires in 7 days. If you weren't expecting this, you can ignore it.</p>`,
      ),
    });
  },
};
