/**
 * src/services/audit.service.ts
 * Records security-relevant events. Writes are best-effort: a failure to audit
 * must never break the primary flow, so errors are swallowed and logged.
 */
import { AuditCategory, AuditSeverity, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';

export const AUDIT = {
  REGISTER: 'REGISTER',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGIN_LOCKED: 'LOGIN_LOCKED',
  LOGOUT: 'LOGOUT',
  TOKEN_REFRESH: 'TOKEN_REFRESH',
  TOKEN_REUSE_DETECTED: 'TOKEN_REUSE_DETECTED',
  EMAIL_VERIFIED: 'EMAIL_VERIFIED',
  OTP_RESENT: 'OTP_RESENT',
  OTP_VERIFY_FAILED: 'OTP_VERIFY_FAILED',
  PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED: 'PASSWORD_RESET_COMPLETED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  PROFILE_UPDATED: 'PROFILE_UPDATED',
  OAUTH_LOGIN: 'OAUTH_LOGIN',
  ACCOUNT_DEACTIVATED: 'ACCOUNT_DEACTIVATED',
  WORKSPACE_CREATED: 'WORKSPACE_CREATED',
  WORKSPACE_UPDATED: 'WORKSPACE_UPDATED',
  WORKSPACE_DELETED: 'WORKSPACE_DELETED',
  MEMBER_ROLE_UPDATED: 'MEMBER_ROLE_UPDATED',
  MEMBER_REMOVED: 'MEMBER_REMOVED',
  MEMBER_LEFT: 'MEMBER_LEFT',
  OWNERSHIP_TRANSFERRED: 'OWNERSHIP_TRANSFERRED',
  INVITATION_SENT: 'INVITATION_SENT',
  INVITATION_RESENT: 'INVITATION_RESENT',
  INVITATION_REVOKED: 'INVITATION_REVOKED',
  INVITATION_ACCEPTED: 'INVITATION_ACCEPTED',
  INVITATION_DECLINED: 'INVITATION_DECLINED',
  SOCIAL_ACCOUNT_CONNECTED: 'SOCIAL_ACCOUNT_CONNECTED',
  SOCIAL_ACCOUNT_DISCONNECTED: 'SOCIAL_ACCOUNT_DISCONNECTED',
  SOCIAL_ACCOUNT_SYNCED: 'SOCIAL_ACCOUNT_SYNCED',
  SOCIAL_CONNECT_STARTED: 'SOCIAL_CONNECT_STARTED',
  SOCIAL_TOKEN_EXPIRED: 'SOCIAL_TOKEN_EXPIRED',
  POST_CREATED: 'POST_CREATED',
  POST_UPDATED: 'POST_UPDATED',
  POST_DELETED: 'POST_DELETED',
  POST_PUBLISHED: 'POST_PUBLISHED',
  PUBLISH_JOB_QUEUED: 'PUBLISH_JOB_QUEUED',
  PUBLISH_JOB_COMPLETED: 'PUBLISH_JOB_COMPLETED',
  PUBLISH_JOB_FAILED: 'PUBLISH_JOB_FAILED',
  PUBLISH_JOB_RETRIED: 'PUBLISH_JOB_RETRIED',
  AI_CONTENT_GENERATED: 'AI_CONTENT_GENERATED',
  CREATIVE_ASSET_CREATED: 'CREATIVE_ASSET_CREATED',
  BRAND_KIT_UPDATED: 'BRAND_KIT_UPDATED',
  // Agent 08 — Analytics
  ANALYTICS_REPORT_GENERATED: 'ANALYTICS_REPORT_GENERATED',
  // Agent 09 — Notifications
  NOTIFICATION_SENT: 'NOTIFICATION_SENT',
  ALERT_TRIGGERED: 'ALERT_TRIGGERED',
  // Agent 10 — Billing
  SUBSCRIPTION_CREATED: 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_UPDATED: 'SUBSCRIPTION_UPDATED',
  SUBSCRIPTION_CANCELLED: 'SUBSCRIPTION_CANCELLED',
  PAYMENT_SUCCEEDED: 'PAYMENT_SUCCEEDED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  // Agent 11 — Admin
  SYSTEM_SETTING_UPDATED: 'SYSTEM_SETTING_UPDATED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
} as const;

export type AuditAction = (typeof AUDIT)[keyof typeof AUDIT];

interface AuditArgs {
  action: AuditAction;
  userId?: string | null;
  workspaceId?: string | null;
  category?: AuditCategory;
  severity?: AuditSeverity;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Prisma.InputJsonValue;
}

export const auditService = {
  async record({
    action,
    userId,
    workspaceId,
    category = AuditCategory.USER_ACTIVITY,
    severity = AuditSeverity.INFO,
    resourceType,
    resourceId,
    ipAddress,
    userAgent,
    metadata,
  }: AuditArgs) {
    try {
      await prisma.auditLog.create({
        data: {
          action,
          userId: userId ?? null,
          workspaceId: workspaceId ?? null,
          category,
          severity,
          resourceType,
          resourceId,
          ipAddress,
          userAgent,
          metadata,
        },
      });
    } catch (err) {
      logger.warn({ err, action }, 'Failed to write audit log');
    }
  },
};
