/**
 * src/services/emailService.ts
 * Production email service — Resend API (primary) with SMTP fallback.
 * Brand: BotanDev · Sender: noreply@botandev.com (configured via EMAIL_FROM)
 */
import nodemailer, { Transporter } from 'nodemailer';
import { Resend } from 'resend';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const BRAND = env.EMAIL_BRAND_NAME;

export interface EmailResult {
  success: boolean;
  provider?: 'resend' | 'smtp' | 'console';
  messageId?: string;
  error?: string;
}

let resendClient: Resend | null = null;
let smtpTransporter: Transporter | null = null;

function getResend(): Resend | null {
  if (!env.resendEnabled) return null;
  if (!resendClient) resendClient = new Resend(env.RESEND_API_KEY);
  return resendClient;
}

function getSmtp(): Transporter | null {
  if (!env.smtpEnabled) return null;
  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return smtpTransporter;
}

interface SendPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function deliver(payload: SendPayload): Promise<EmailResult> {
  const resend = getResend();
  if (resend) {
    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
    if (error) {
      logger.error({ error, to: payload.to }, 'Resend delivery failed');
      return { success: false, provider: 'resend', error: error.message };
    }
    logger.info({ to: payload.to, subject: payload.subject, id: data?.id }, 'Email sent via Resend');
    return { success: true, provider: 'resend', messageId: data?.id };
  }

  const smtp = getSmtp();
  if (smtp) {
    try {
      const info = await smtp.sendMail({
        from: env.EMAIL_FROM,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });
      logger.info({ to: payload.to, messageId: info.messageId }, 'Email sent via SMTP');
      return { success: true, provider: 'smtp', messageId: info.messageId };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'SMTP send failed';
      logger.error({ err, to: payload.to }, 'SMTP delivery failed');
      return { success: false, provider: 'smtp', error: message };
    }
  }

  logger.info(
    { to: payload.to, subject: payload.subject, text: payload.text },
    '📧 [DEV] Email logged (no provider configured)',
  );
  return { success: true, provider: 'console' };
}

/** BotanDev card layout — responsive, dark theme, orange accent. */
function otpEmailLayout(options: {
  title: string;
  greeting: string;
  body: string;
  otp: string;
  expiryMinutes: number;
  securityNote: string;
}): string {
  const { title, greeting, body, otp, expiryMinutes, securityNote } = options;
  const digits = otp.split('').map(
    (d) =>
      `<td style="width:44px;height:52px;background:#111827;border:1px solid rgba(255,138,0,0.35);border-radius:10px;text-align:center;font-size:28px;font-weight:800;color:#FF8A00;font-family:Consolas,Monaco,monospace">${d}</td>`,
  ).join('<td style="width:8px"></td>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#020817;font-family:Inter,Segoe UI,Arial,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#020817;padding:40px 16px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#0F172A;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden">
          <tr>
            <td style="padding:28px 32px;border-bottom:1px solid rgba(255,255,255,0.08)">
              <span style="font-size:22px;font-weight:800;color:#FF8A00">◆ ${BRAND}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:#94A3B8;font-size:15px;line-height:1.65">
              <h1 style="margin:0 0 12px;font-size:22px;color:#FFFFFF">${title}</h1>
              <p style="margin:0 0 16px">${greeting}</p>
              <p style="margin:0 0 24px">${body}</p>
              <table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto 24px">
                <tr>${digits}</tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;color:#64748B">
                ⏱ This code expires in <strong style="color:#FF8A00">${expiryMinutes} minutes</strong>.
              </p>
              <p style="margin:0;font-size:13px;color:#64748B">${securityNote}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.08);font-size:12px;color:#475569">
              © ${new Date().getFullYear()} ${BRAND}. All rights reserved.<br/>
              Need help? Contact <a href="mailto:support@botandev.com" style="color:#FF8A00">support@botandev.com</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export const emailService = {
  async sendVerificationOtp(
    to: string,
    name: string,
    otp: string,
  ): Promise<EmailResult> {
    const expiry = env.OTP_EXPIRY_MINUTES;
    const html = otpEmailLayout({
      title: 'Email Verification Code',
      greeting: `Hi ${name},`,
      body: 'Use the verification code below to confirm your email address and activate your account.',
      otp,
      expiryMinutes: expiry,
      securityNote:
        '🔒 Never share this code. BotanDev will never ask for your OTP by phone or chat. If you did not create an account, ignore this email.',
    });
    return deliver({
      to,
      subject: 'BotanDev Email Verification Code',
      text: `Hi ${name}, your BotanDev verification code is ${otp}. It expires in ${expiry} minutes. Do not share this code.`,
      html,
    });
  },

  async sendPasswordResetOtp(
    to: string,
    name: string,
    otp: string,
  ): Promise<EmailResult> {
    const expiry = env.OTP_EXPIRY_MINUTES;
    const html = otpEmailLayout({
      title: 'Password Reset Code',
      greeting: `Hi ${name},`,
      body: 'We received a request to reset your password. Enter the code below to continue.',
      otp,
      expiryMinutes: expiry,
      securityNote:
        '🔒 If you did not request a password reset, your account is still secure — ignore this email and contact support@botandev.com if concerned.',
    });
    return deliver({
      to,
      subject: 'BotanDev Password Reset Code',
      text: `Hi ${name}, your BotanDev password reset code is ${otp}. It expires in ${expiry} minutes.`,
      html,
    });
  },

  async sendWelcomeEmail(to: string, name: string): Promise<EmailResult> {
    const html = `<!DOCTYPE html><html><body style="background:#020817;color:#fff;font-family:Inter,sans-serif;padding:40px">
      <div style="max-width:480px;margin:0 auto;background:#0F172A;border-radius:16px;padding:32px;border:1px solid rgba(255,255,255,0.08)">
        <h1 style="color:#FF8A00;margin:0 0 16px">Welcome to ${BRAND} 🚀</h1>
        <p style="color:#94A3B8">Hi ${name}, your email is verified. Your account is now active.</p>
        <a href="${env.CLIENT_URL}" style="display:inline-block;margin-top:20px;background:#FF8A00;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600">Open Dashboard</a>
      </div></body></html>`;
    return deliver({
      to,
      subject: `Welcome to ${BRAND}`,
      text: `Welcome aboard, ${name}! Your account is ready.`,
      html,
    });
  },

  async sendPasswordChangedEmail(to: string, name: string): Promise<EmailResult> {
    return deliver({
      to,
      subject: `Your ${BRAND} password was changed`,
      text: `Hi ${name}, your password was just changed.`,
      html: `<p>Hi ${name}, this confirms your ${BRAND} password was changed. If this wasn't you, contact support@botandev.com immediately.</p>`,
    });
  },

  async sendNotificationEmail(
    to: string,
    name: string,
    title: string,
    body: string,
    actionUrl?: string,
  ): Promise<EmailResult> {
    const link = actionUrl ? `<a href="${actionUrl}" style="color:#FF8A00">View details</a>` : '';
    const html = `<!DOCTYPE html><html><body style="background:#020817;color:#fff;font-family:Inter,sans-serif;padding:40px">
      <div style="max-width:480px;margin:0 auto;background:#0F172A;border-radius:16px;padding:32px;border:1px solid rgba(255,255,255,0.08)">
        <h2 style="color:#FF8A00;margin:0 0 12px">${title}</h2>
        <p style="color:#94A3B8">Hi ${name},</p>
        <p style="color:#94A3B8">${body}</p>
        ${link}
      </div></body></html>`;
    return deliver({
      to,
      subject: `${BRAND}: ${title}`,
      text: `Hi ${name}, ${title}: ${body}${actionUrl ? ` — ${actionUrl}` : ''}`,
      html,
    });
  },

  /** Workspace invitation (legacy link-based). */
  async sendWorkspaceInvitationEmail(
    to: string,
    inviterName: string,
    workspaceName: string,
    token: string,
  ): Promise<EmailResult> {
    const link = `${env.CLIENT_URL}/invitations/accept?token=${encodeURIComponent(token)}`;
    return deliver({
      to,
      subject: `You're invited to join ${workspaceName} on ${BRAND}`,
      text: `${inviterName} invited you to ${workspaceName}. Accept: ${link}`,
      html: `<p><strong>${inviterName}</strong> invited you to <strong>${workspaceName}</strong>.</p><p><a href="${link}">Accept Invitation</a></p>`,
    });
  },
};
