/**
 * Agent 11 — Admin Panel service
 * User management, revenue dashboard, system settings, monitoring, reports.
 */
import { Prisma, SubscriptionStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { activityLogService } from './activityLog.service';

export const adminService = {
  async getDashboardStats() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      totalWorkspaces,
      activeSubscriptions,
      paidSubscriptions,
      totalPosts,
      recentSignups,
      revenueCents,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.workspace.count({ where: { isActive: true } }),
      prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      prisma.subscription.count({
        where: {
          status: SubscriptionStatus.ACTIVE,
          plan: { slug: { not: 'free' } },
        },
      }),
      prisma.post.count(),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.payment.aggregate({
        where: { status: 'SUCCEEDED', createdAt: { gte: thirtyDaysAgo } },
        _sum: { amountCents: true },
      }),
    ]);

    return {
      users: { total: totalUsers, active: activeUsers, recentSignups },
      workspaces: { total: totalWorkspaces },
      subscriptions: { active: activeSubscriptions, paid: paidSubscriptions },
      content: { totalPosts },
      revenue: {
        last30DaysCents: revenueCents._sum.amountCents ?? 0,
        mrrEstimateCents: paidSubscriptions * 2900,
      },
    };
  },

  async getRevenueDashboard(rangeDays = 30) {
    const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);

    const [payments, invoices, subscriptionsByPlan] = await Promise.all([
      prisma.payment.findMany({
        where: { status: 'SUCCEEDED', createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { workspace: { select: { id: true, name: true } } },
      }),
      prisma.invoice.groupBy({
        by: ['status'],
        where: { createdAt: { gte: since } },
        _count: true,
        _sum: { amountCents: true },
      }),
      prisma.subscription.groupBy({
        by: ['planId'],
        where: { status: SubscriptionStatus.ACTIVE },
        _count: true,
      }),
    ]);

    const plans = await prisma.plan.findMany();
    const planMap = Object.fromEntries(plans.map((p) => [p.id, p]));

    return {
      payments,
      invoicesByStatus: invoices.map((i) => ({
        status: i.status,
        count: i._count,
        totalCents: i._sum.amountCents ?? 0,
      })),
      subscriptionsByPlan: subscriptionsByPlan.map((s) => ({
        plan: planMap[s.planId]?.name ?? 'Unknown',
        count: s._count,
      })),
      rangeDays,
    };
  },

  async getMonitoring() {
    const [queueJobs, failedPosts, failedPublishes, securitySummary, systemHealth] =
      await Promise.all([
        prisma.publishJob.groupBy({
          by: ['status'],
          _count: true,
        }),
        prisma.post.count({ where: { status: 'FAILED' } }),
        prisma.publishJob.count({ where: { status: 'FAILED' } }),
        activityLogService.getSecuritySummary(),
        Promise.resolve({
          database: 'connected',
          uptime: process.uptime(),
          memoryMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        }),
      ]);

    return {
      publishQueue: queueJobs.map((j) => ({ status: j.status, count: j._count })),
      failedPosts,
      failedPublishes,
      security: securitySummary,
      system: systemHealth,
    };
  },

  async getReports() {
    const [userGrowth, postActivity, auditSummary] = await Promise.all([
      prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),
      prisma.post.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.auditLog.groupBy({
        by: ['category'],
        _count: true,
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

    return {
      userGrowth: userGrowth.map((u) => ({ role: u.role, count: u._count })),
      postActivity: postActivity.map((p) => ({ status: p.status, count: p._count })),
      auditSummary: auditSummary.map((a) => ({ category: a.category, count: a._count })),
      generatedAt: new Date().toISOString(),
    };
  },

  async listSystemSettings() {
    return prisma.systemSetting.findMany({ orderBy: { key: 'asc' } });
  },

  async getSystemSetting(key: string) {
    return prisma.systemSetting.findUnique({ where: { key } });
  },

  async upsertSystemSetting(key: string, value: Prisma.InputJsonValue, updatedBy: string) {
    return prisma.systemSetting.upsert({
      where: { key },
      create: { key, value, updatedBy },
      update: { value, updatedBy },
    });
  },
};
