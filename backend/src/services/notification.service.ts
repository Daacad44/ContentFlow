/**
 * Agent 09 — Notifications service
 * In-app notifications, email delivery, alerts, and preferences.
 */
import {
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
  Prisma,
} from '@prisma/client';
import { prisma } from '../config/prisma';
import { emailService } from './emailService';
import { auditService, AUDIT } from './audit.service';

interface CreateNotificationInput {
  userId: string;
  workspaceId?: string;
  category: NotificationCategory;
  title: string;
  body: string;
  priority?: NotificationPriority;
  actionUrl?: string;
  metadata?: Prisma.InputJsonValue;
  sendEmail?: boolean;
}

export const notificationService = {
  async create(input: CreateNotificationInput) {
    const prefs = await this.getPreference(input.userId, input.category, input.workspaceId);
    const channels: NotificationChannel[] = [];

    if (prefs.inAppEnabled) channels.push(NotificationChannel.IN_APP);

    const notifications = [];

    if (prefs.inAppEnabled) {
      const notification = await prisma.notification.create({
        data: {
          userId: input.userId,
          workspaceId: input.workspaceId,
          category: input.category,
          title: input.title,
          body: input.body,
          priority: input.priority ?? NotificationPriority.NORMAL,
          channel: NotificationChannel.IN_APP,
          actionUrl: input.actionUrl,
          metadata: input.metadata,
        },
      });
      notifications.push(notification);
    }

    if (input.sendEmail && prefs.emailEnabled) {
      const user = await prisma.user.findUnique({ where: { id: input.userId } });
      if (user) {
        await emailService.sendNotificationEmail(user.email, user.fullName, input.title, input.body, input.actionUrl);
      }
    }

    await auditService.record({
      action: AUDIT.NOTIFICATION_SENT,
      userId: input.userId,
      workspaceId: input.workspaceId,
      metadata: { category: input.category, title: input.title },
    });

    return notifications;
  },

  async listForUser(userId: string, opts: { unreadOnly?: boolean; page?: number; limit?: number }) {
    const page = opts.page ?? 1;
    const limit = Math.min(opts.limit ?? 30, 100);
    const where: Prisma.NotificationWhereInput = { userId };
    if (opts.unreadOnly) where.readAt = null;

    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { workspace: { select: { id: true, name: true } } },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    return { items, total, unreadCount, page, limit };
  },

  async markRead(userId: string, notificationId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
  },

  async markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  },

  async getPreferences(userId: string, workspaceId?: string) {
    const prefs = await prisma.notificationPreference.findMany({
      where: { userId, workspaceId: workspaceId ?? null },
    });

    const categories = Object.values(NotificationCategory);
    return categories.map((category) => {
      const existing = prefs.find((p) => p.category === category);
      return {
        category,
        emailEnabled: existing?.emailEnabled ?? true,
        inAppEnabled: existing?.inAppEnabled ?? true,
      };
    });
  },

  async getPreference(userId: string, category: NotificationCategory, workspaceId?: string) {
    const pref = await prisma.notificationPreference.findFirst({
      where: { userId, category, workspaceId: workspaceId ?? null },
    });
    return {
      emailEnabled: pref?.emailEnabled ?? true,
      inAppEnabled: pref?.inAppEnabled ?? true,
    };
  },

  async updatePreferences(
    userId: string,
    workspaceId: string | null,
    preferences: Array<{ category: NotificationCategory; emailEnabled: boolean; inAppEnabled: boolean }>,
  ) {
    const results = [];
    for (const pref of preferences) {
      const existing = await prisma.notificationPreference.findFirst({
        where: { userId, workspaceId, category: pref.category },
      });
      const result = existing
        ? await prisma.notificationPreference.update({
            where: { id: existing.id },
            data: {
              emailEnabled: pref.emailEnabled,
              inAppEnabled: pref.inAppEnabled,
            },
          })
        : await prisma.notificationPreference.create({
            data: {
              userId,
              workspaceId,
              category: pref.category,
              emailEnabled: pref.emailEnabled,
              inAppEnabled: pref.inAppEnabled,
            },
          });
      results.push(result);
    }
    return results;
  },

  async listAlertRules(workspaceId: string) {
    return prisma.alertRule.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });
  },

  async createAlertRule(
    workspaceId: string,
    userId: string,
    data: { name: string; metric: string; condition: string; threshold: number },
  ) {
    return prisma.alertRule.create({
      data: { workspaceId, userId, ...data },
    });
  },

  async updateAlertRule(workspaceId: string, ruleId: string, data: Partial<{ name: string; threshold: number; isActive: boolean }>) {
    return prisma.alertRule.update({
      where: { id: ruleId, workspaceId },
      data,
    });
  },

  async deleteAlertRule(workspaceId: string, ruleId: string) {
    return prisma.alertRule.delete({ where: { id: ruleId, workspaceId } });
  },

  async evaluateAlerts(workspaceId: string) {
    const rules = await prisma.alertRule.findMany({
      where: { workspaceId, isActive: true },
    });

    const triggered = [];
    for (const rule of rules) {
      const value = await this.getMetricValue(workspaceId, rule.metric);
      const fired = this.checkCondition(value, rule.condition, rule.threshold);
      if (fired) {
        const members = await prisma.workspaceMember.findMany({
          where: { workspaceId, role: { in: ['OWNER', 'ADMIN'] } },
        });
        for (const member of members) {
          await this.create({
            userId: member.userId,
            workspaceId,
            category: NotificationCategory.ALERT,
            title: `Alert: ${rule.name}`,
            body: `${rule.metric} is ${value} (threshold: ${rule.condition} ${rule.threshold})`,
            priority: NotificationPriority.HIGH,
            sendEmail: true,
          });
        }
        await prisma.alertRule.update({
          where: { id: rule.id },
          data: { lastTriggeredAt: new Date() },
        });
        await auditService.record({
          action: AUDIT.ALERT_TRIGGERED,
          workspaceId,
          metadata: { ruleId: rule.id, metric: rule.metric, value },
        });
        triggered.push({ rule, value });
      }
    }
    return triggered;
  },

  async getMetricValue(workspaceId: string, metric: string): Promise<number> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    switch (metric) {
      case 'failed_posts':
        return prisma.post.count({ where: { workspaceId, status: 'FAILED', updatedAt: { gte: since } } });
      case 'publish_failures':
        return prisma.publishJob.count({ where: { workspaceId, status: 'FAILED', updatedAt: { gte: since } } });
      case 'pending_posts':
        return prisma.post.count({ where: { workspaceId, status: 'SCHEDULED' } });
      default:
        return 0;
    }
  },

  checkCondition(value: number, condition: string, threshold: number): boolean {
    switch (condition) {
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      default: return false;
    }
  },
};
