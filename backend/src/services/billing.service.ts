/**
 * Agent 10 — Billing service
 * Plans, subscriptions, invoices, payments, usage tracking.
 */
import {
  AuditSeverity,
  InvoiceStatus,
  NotificationCategory,
  PaymentStatus,
  PlanInterval,
  SubscriptionStatus,
  UsageMetric,
} from '@prisma/client';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';
import { stripeService } from './stripe.service';
import { auditService, AUDIT } from './audit.service';
import { notificationService } from './notification.service';

const DEFAULT_PLANS = [
  {
    name: 'Free',
    slug: 'free',
    description: 'Get started with basic scheduling',
    interval: PlanInterval.MONTH,
    priceCents: 0,
    features: { posts: 10, aiGenerations: 5, teamMembers: 2, creativeAssets: 5 },
    sortOrder: 0,
  },
  {
    name: 'Pro',
    slug: 'pro',
    description: 'For growing teams and brands',
    interval: PlanInterval.MONTH,
    priceCents: 2900,
    features: { posts: 100, aiGenerations: 50, teamMembers: 10, creativeAssets: 50 },
    sortOrder: 1,
  },
  {
    name: 'Business',
    slug: 'business',
    description: 'Unlimited power for agencies',
    interval: PlanInterval.MONTH,
    priceCents: 9900,
    features: { posts: -1, aiGenerations: -1, teamMembers: -1, creativeAssets: -1 },
    sortOrder: 2,
  },
];

export const billingService = {
  async ensureDefaultPlans() {
    for (const plan of DEFAULT_PLANS) {
      await prisma.plan.upsert({
        where: { slug: plan.slug },
        create: plan,
        update: {},
      });
    }
  },

  async listPlans() {
    await this.ensureDefaultPlans();
    return prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  },

  async getSubscription(workspaceId: string) {
    let sub = await prisma.subscription.findUnique({
      where: { workspaceId },
      include: { plan: true },
    });

    if (!sub) {
      await this.ensureDefaultPlans();
      const freePlan = await prisma.plan.findUnique({ where: { slug: 'free' } });
      if (!freePlan) throw ApiError.internal('Free plan not configured.');

      const now = new Date();
      const end = new Date(now);
      end.setMonth(end.getMonth() + 1);

      sub = await prisma.subscription.create({
        data: {
          workspaceId,
          planId: freePlan.id,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: now,
          currentPeriodEnd: end,
        },
        include: { plan: true },
      });
    }

    return sub;
  },

  async createCheckoutSession(workspaceId: string, planSlug: string, userEmail: string, userName: string) {
    if (!env.stripeEnabled) {
      throw ApiError.badRequest('Stripe is not configured. Set STRIPE_SECRET_KEY.');
    }

    const plan = await prisma.plan.findUnique({ where: { slug: planSlug } });
    if (!plan?.stripePriceId) {
      throw ApiError.badRequest('Plan is not available for checkout.');
    }

    let sub = await this.getSubscription(workspaceId);
    let customerId = sub.stripeCustomerId;

    if (!customerId) {
      const customer = await stripeService.createCustomer(userEmail, userName, { workspaceId });
      if (!customer) throw ApiError.internal('Failed to create Stripe customer.');
      customerId = customer.id;
      await prisma.subscription.update({
        where: { workspaceId },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await stripeService.createCheckoutSession({
      customerId,
      priceId: plan.stripePriceId,
      successUrl: `${env.CLIENT_URL}/billing?success=1`,
      cancelUrl: `${env.CLIENT_URL}/billing?cancelled=1`,
      metadata: { workspaceId, planId: plan.id },
    });

    return { sessionId: session?.id, url: session?.url };
  },

  async createPortalSession(workspaceId: string) {
    const sub = await this.getSubscription(workspaceId);
    if (!sub.stripeCustomerId) {
      throw ApiError.badRequest('No billing account found.');
    }
    const session = await stripeService.createBillingPortalSession(
      sub.stripeCustomerId,
      `${env.CLIENT_URL}/billing`,
    );
    return { url: session?.url };
  },

  async cancelSubscription(workspaceId: string, userId: string) {
    const sub = await this.getSubscription(workspaceId);
    if (sub.stripeSubscriptionId) {
      await stripeService.cancelSubscription(sub.stripeSubscriptionId);
    }
    const updated = await prisma.subscription.update({
      where: { workspaceId },
      data: { cancelAtPeriodEnd: true },
      include: { plan: true },
    });
    await auditService.record({
      action: AUDIT.SUBSCRIPTION_CANCELLED,
      userId,
      workspaceId,
      metadata: { subscriptionId: sub.id },
    });
    return updated;
  },

  async listInvoices(workspaceId: string, page = 1, limit = 20) {
    const take = Math.min(limit, 50);
    const [items, total] = await Promise.all([
      prisma.invoice.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * take,
        take,
      }),
      prisma.invoice.count({ where: { workspaceId } }),
    ]);
    return { items, total, page, limit: take };
  },

  async listPayments(workspaceId: string, page = 1, limit = 20) {
    const take = Math.min(limit, 50);
    const [items, total] = await Promise.all([
      prisma.payment.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * take,
        take,
      }),
      prisma.payment.count({ where: { workspaceId } }),
    ]);
    return { items, total, page, limit: take };
  },

  async trackUsage(workspaceId: string, metric: UsageMetric, quantity = 1) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const record = await prisma.usageRecord.upsert({
      where: {
        workspaceId_metric_periodStart: { workspaceId, metric, periodStart },
      },
      create: { workspaceId, metric, quantity, periodStart, periodEnd },
      update: { quantity: { increment: quantity } },
    });

    await this.checkUsageLimits(workspaceId, metric, record.quantity);
    return record;
  },

  async getUsage(workspaceId: string) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const records = await prisma.usageRecord.findMany({
      where: { workspaceId, periodStart },
    });

    const sub = await this.getSubscription(workspaceId);
    const features = sub.plan.features as Record<string, number>;

    return {
      periodStart,
      plan: sub.plan,
      usage: records,
      limits: features,
    };
  },

  async checkUsageLimits(workspaceId: string, metric: UsageMetric, currentQuantity: number) {
    const sub = await this.getSubscription(workspaceId);
    const features = sub.plan.features as Record<string, number>;
    const limitKey = {
      [UsageMetric.POSTS]: 'posts',
      [UsageMetric.AI_GENERATIONS]: 'aiGenerations',
      [UsageMetric.CREATIVE_ASSETS]: 'creativeAssets',
      [UsageMetric.TEAM_MEMBERS]: 'teamMembers',
      [UsageMetric.PUBLISH_JOBS]: 'posts',
    }[metric];

    const limit = features[limitKey];
    if (limit > 0 && currentQuantity >= limit * 0.9) {
      const owners = await prisma.workspaceMember.findMany({
        where: { workspaceId, role: 'OWNER' },
      });
      for (const owner of owners) {
        await notificationService.create({
          userId: owner.userId,
          workspaceId,
          category: NotificationCategory.BILLING,
          title: 'Usage limit warning',
          body: `You've used ${currentQuantity} of ${limit} ${limitKey} this month.`,
          sendEmail: true,
        });
      }
    }
  },

  async handleStripeWebhook(event: { type: string; data: { object: Record<string, unknown> } }) {
    const obj = event.data.object;

    switch (event.type) {
      case 'invoice.paid': {
        const workspaceId = (obj.metadata as Record<string, string>)?.workspaceId;
        if (!workspaceId) break;
        await prisma.invoice.upsert({
          where: { stripeInvoiceId: obj.id as string },
          create: {
            workspaceId,
            stripeInvoiceId: obj.id as string,
            number: obj.number as string,
            status: InvoiceStatus.PAID,
            amountCents: obj.amount_paid as number,
            currency: (obj.currency as string) ?? 'usd',
            paidAt: new Date(),
            invoiceUrl: obj.hosted_invoice_url as string,
            pdfUrl: obj.invoice_pdf as string,
          },
          update: { status: InvoiceStatus.PAID, paidAt: new Date() },
        });
        await auditService.record({
          action: AUDIT.PAYMENT_SUCCEEDED,
          workspaceId,
          metadata: { invoiceId: String(obj.id) },
        });
        break;
      }
      case 'invoice.payment_failed': {
        const workspaceId = (obj.metadata as Record<string, string>)?.workspaceId;
        if (!workspaceId) break;
        await prisma.payment.create({
          data: {
            workspaceId,
            stripePaymentId: obj.payment_intent as string,
            amountCents: obj.amount_due as number,
            status: PaymentStatus.FAILED,
          },
        });
        await auditService.record({
          action: AUDIT.PAYMENT_FAILED,
          workspaceId,
          severity: AuditSeverity.ERROR,
        });
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const metadata = obj.metadata as Record<string, string>;
        const workspaceId = metadata?.workspaceId;
        if (!workspaceId) break;
        const status = (obj.status as string).toUpperCase() as SubscriptionStatus;
        await prisma.subscription.update({
          where: { workspaceId },
          data: {
            stripeSubscriptionId: obj.id as string,
            status,
            currentPeriodStart: new Date((obj.current_period_start as number) * 1000),
            currentPeriodEnd: new Date((obj.current_period_end as number) * 1000),
            cancelAtPeriodEnd: obj.cancel_at_period_end as boolean,
          },
        });
        await auditService.record({
          action: AUDIT.SUBSCRIPTION_UPDATED,
          workspaceId,
          metadata: { status },
        });
        break;
      }
    }
  },
};
