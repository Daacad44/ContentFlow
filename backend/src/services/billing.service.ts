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
import { logger } from '../utils/logger';

/** Plan `features` key that holds the limit for each usage metric. */
export const USAGE_LIMIT_KEYS: Record<UsageMetric, string> = {
  [UsageMetric.POSTS]: 'posts',
  [UsageMetric.AI_GENERATIONS]: 'aiGenerations',
  [UsageMetric.CREATIVE_ASSETS]: 'creativeAssets',
  [UsageMetric.TEAM_MEMBERS]: 'teamMembers',
  [UsageMetric.PUBLISH_JOBS]: 'posts',
};

const USAGE_LABELS: Record<UsageMetric, string> = {
  [UsageMetric.POSTS]: 'posts',
  [UsageMetric.AI_GENERATIONS]: 'AI generations',
  [UsageMetric.CREATIVE_ASSETS]: 'creative assets',
  [UsageMetric.TEAM_MEMBERS]: 'team members',
  [UsageMetric.PUBLISH_JOBS]: 'publish jobs',
};

/** Subscriptions in these states keep their plan's limits; anything else falls back to Free. */
const ENTITLED_STATUSES: SubscriptionStatus[] = [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING];

/**
 * Reads a numeric limit from plan features. A negative value means unlimited;
 * a missing or invalid value is treated as unlimited so a misconfigured plan never locks users out.
 */
export function readLimit(features: unknown, metric: UsageMetric): number | null {
  const value = (features as Record<string, unknown> | null)?.[USAGE_LIMIT_KEYS[metric]];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return value;
}

/** True when adding `increment` to `used` would go past `limit` (null = unlimited). */
export function exceedsLimit(limit: number | null, used: number, increment = 1): boolean {
  return limit !== null && used + increment > limit;
}

/** Usage thresholds (fraction of the limit) at which workspace owners are notified. */
const WARNING_THRESHOLDS = [0.9, 1];

/** Returns the highest threshold crossed when usage moved from `previous` to `current`, if any. */
export function crossedThreshold(limit: number | null, previous: number, current: number): number | null {
  if (limit === null || limit === 0) return null;
  let crossed: number | null = null;
  for (const t of WARNING_THRESHOLDS) {
    const mark = Math.ceil(limit * t);
    if (previous < mark && current >= mark) crossed = t;
  }
  return crossed;
}

function currentPeriod() {
  const now = new Date();
  return {
    periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
    periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
  };
}

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
    const priceIds: Record<string, string> = {
      pro: env.STRIPE_PRICE_PRO,
      business: env.STRIPE_PRICE_BUSINESS,
    };
    for (const plan of DEFAULT_PLANS) {
      const stripePriceId = priceIds[plan.slug] || undefined;
      await prisma.plan.upsert({
        where: { slug: plan.slug },
        create: { ...plan, stripePriceId },
        update: stripePriceId ? { stripePriceId } : {},
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

  /** Plan features that apply right now: the plan's own, or Free if the subscription lapsed. */
  async getEffectiveFeatures(workspaceId: string) {
    const sub = await this.getSubscription(workspaceId);
    if (ENTITLED_STATUSES.includes(sub.status)) return sub.plan.features;
    const freePlan = await prisma.plan.findUnique({ where: { slug: 'free' } });
    return freePlan?.features ?? sub.plan.features;
  },

  /** Current usage of a metric. Team members are counted live; the rest per calendar month. */
  async getCurrentUsage(workspaceId: string, metric: UsageMetric): Promise<number> {
    if (metric === UsageMetric.TEAM_MEMBERS) {
      const [members, pendingInvites] = await Promise.all([
        prisma.workspaceMember.count({ where: { workspaceId } }),
        prisma.workspaceInvitation.count({
          where: { workspaceId, status: 'PENDING', expiresAt: { gt: new Date() } },
        }),
      ]);
      return members + pendingInvites;
    }
    const { periodStart } = currentPeriod();
    const record = await prisma.usageRecord.findUnique({
      where: { workspaceId_metric_periodStart: { workspaceId, metric, periodStart } },
    });
    return record?.quantity ?? 0;
  },

  /**
   * Throws 402 PLAN_LIMIT_REACHED when the action would exceed the workspace's plan.
   * Call before doing the work; call `trackUsage` after it succeeds.
   * No-op unless ENFORCE_PLAN_LIMITS=true.
   */
  async assertWithinLimit(workspaceId: string, metric: UsageMetric, increment = 1) {
    if (!env.ENFORCE_PLAN_LIMITS) return;

    const features = await this.getEffectiveFeatures(workspaceId);
    const limit = readLimit(features, metric);
    if (limit === null) return;

    const used = await this.getCurrentUsage(workspaceId, metric);
    if (exceedsLimit(limit, used, increment)) {
      const period = metric === UsageMetric.TEAM_MEMBERS ? '' : ' this month';
      throw new ApiError(
        402,
        `Your plan allows ${limit} ${USAGE_LABELS[metric]}${period}. Upgrade your plan to continue.`,
        'PLAN_LIMIT_REACHED',
        { metric, limit, used },
      );
    }
  },

  /**
   * Records usage for the current month and notifies owners when 90% / 100% is first reached.
   * Never throws: a tracking failure must not undo an action the user already completed.
   */
  async trackUsage(workspaceId: string, metric: UsageMetric, quantity = 1) {
    try {
      const { periodStart, periodEnd } = currentPeriod();
      const record = await prisma.usageRecord.upsert({
        where: {
          workspaceId_metric_periodStart: { workspaceId, metric, periodStart },
        },
        create: { workspaceId, metric, quantity, periodStart, periodEnd },
        update: { quantity: { increment: quantity } },
      });

      await this.checkUsageLimits(workspaceId, metric, record.quantity, record.quantity - quantity);
      return record;
    } catch (err) {
      logger.error({ err, workspaceId, metric }, 'Failed to track usage');
      return null;
    }
  },

  async getUsage(workspaceId: string) {
    const { periodStart } = currentPeriod();

    const records = await prisma.usageRecord.findMany({
      where: { workspaceId, periodStart },
    });

    const sub = await this.getSubscription(workspaceId);
    const features = await this.getEffectiveFeatures(workspaceId);

    return {
      periodStart,
      plan: sub.plan,
      usage: records,
      limits: features as Record<string, number>,
    };
  },

  async checkUsageLimits(
    workspaceId: string,
    metric: UsageMetric,
    currentQuantity: number,
    previousQuantity = currentQuantity - 1,
  ) {
    const features = await this.getEffectiveFeatures(workspaceId);
    const limit = readLimit(features, metric);
    const threshold = crossedThreshold(limit, previousQuantity, currentQuantity);
    if (threshold === null || limit === null) return;

    const owners = await prisma.workspaceMember.findMany({
      where: { workspaceId, role: 'OWNER' },
    });
    const label = USAGE_LABELS[metric];
    for (const owner of owners) {
      await notificationService.create({
        userId: owner.userId,
        workspaceId,
        category: NotificationCategory.BILLING,
        title: threshold >= 1 ? 'Plan limit reached' : 'Usage limit warning',
        body:
          threshold >= 1
            ? `You've used all ${limit} ${label} included in your plan this month. Upgrade to keep going.`
            : `You've used ${currentQuantity} of ${limit} ${label} this month.`,
        sendEmail: true,
      });
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
