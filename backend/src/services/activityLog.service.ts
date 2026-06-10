/**
 * Agent 12 — Activity Logs service
 * Query audit logs, login history, security events, and system history.
 */
import { AuditCategory, AuditSeverity, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

interface ListAuditLogsOpts {
  userId?: string;
  workspaceId?: string;
  category?: AuditCategory;
  severity?: AuditSeverity;
  action?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

interface ListLoginHistoryOpts {
  userId?: string;
  success?: boolean;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

export const activityLogService = {
  async listAuditLogs(opts: ListAuditLogsOpts) {
    const page = opts.page ?? 1;
    const limit = Math.min(opts.limit ?? 50, 100);
    const where: Prisma.AuditLogWhereInput = {};

    if (opts.userId) where.userId = opts.userId;
    if (opts.workspaceId) where.workspaceId = opts.workspaceId;
    if (opts.category) where.category = opts.category;
    if (opts.severity) where.severity = opts.severity;
    if (opts.action) where.action = opts.action;
    if (opts.from || opts.to) {
      where.createdAt = {};
      if (opts.from) where.createdAt.gte = opts.from;
      if (opts.to) where.createdAt.lte = opts.to;
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, email: true, fullName: true } },
          workspace: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  },

  async getAuditLog(id: string) {
    return prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, fullName: true } },
        workspace: { select: { id: true, name: true, slug: true } },
      },
    });
  },

  async listLoginHistory(opts: ListLoginHistoryOpts) {
    const page = opts.page ?? 1;
    const limit = Math.min(opts.limit ?? 50, 100);
    const where: Prisma.LoginHistoryWhereInput = {};

    if (opts.userId) where.userId = opts.userId;
    if (opts.success !== undefined) where.success = opts.success;
    if (opts.from || opts.to) {
      where.createdAt = {};
      if (opts.from) where.createdAt.gte = opts.from;
      if (opts.to) where.createdAt.lte = opts.to;
    }

    const [items, total] = await Promise.all([
      prisma.loginHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { id: true, email: true, fullName: true } } },
      }),
      prisma.loginHistory.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  },

  async recordLoginAttempt(data: {
    userId: string;
    success: boolean;
    ipAddress?: string;
    userAgent?: string;
    failureReason?: string;
  }) {
    return prisma.loginHistory.create({ data });
  },

  async getSecuritySummary(workspaceId?: string) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const where: Prisma.AuditLogWhereInput = {
      category: AuditCategory.SECURITY,
      createdAt: { gte: since },
    };
    if (workspaceId) where.workspaceId = workspaceId;

    const [failedLogins, criticalEvents, totalSecurityEvents] = await Promise.all([
      prisma.loginHistory.count({
        where: { success: false, createdAt: { gte: since } },
      }),
      prisma.auditLog.count({
        where: { ...where, severity: AuditSeverity.CRITICAL },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { failedLogins, criticalEvents, totalSecurityEvents, periodHours: 24 };
  },

  async getSystemHistory(opts: { from?: Date; to?: Date; page?: number; limit?: number }) {
    return this.listAuditLogs({
      category: AuditCategory.SYSTEM,
      from: opts.from,
      to: opts.to,
      page: opts.page,
      limit: opts.limit,
    });
  },
};
