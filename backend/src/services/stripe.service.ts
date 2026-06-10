/**
 * Agent 10 — Stripe integration wrapper
 */
import Stripe from 'stripe';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!env.stripeEnabled) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' });
  }
  return stripeClient;
}

export const stripeService = {
  async createCustomer(email: string, name: string, metadata?: Record<string, string>) {
    const stripe = getStripe();
    if (!stripe) return null;
    return stripe.customers.create({ email, name, metadata });
  },

  async createCheckoutSession(params: {
    customerId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }) {
    const stripe = getStripe();
    if (!stripe) return null;
    return stripe.checkout.sessions.create({
      customer: params.customerId,
      mode: 'subscription',
      line_items: [{ price: params.priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
    });
  },

  async createBillingPortalSession(customerId: string, returnUrl: string) {
    const stripe = getStripe();
    if (!stripe) return null;
    return stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
  },

  async cancelSubscription(stripeSubscriptionId: string, atPeriodEnd = true) {
    const stripe = getStripe();
    if (!stripe) return null;
    if (atPeriodEnd) {
      return stripe.subscriptions.update(stripeSubscriptionId, { cancel_at_period_end: true });
    }
    return stripe.subscriptions.cancel(stripeSubscriptionId);
  },

  constructWebhookEvent(payload: Buffer, signature: string) {
    const stripe = getStripe();
    if (!stripe || !env.STRIPE_WEBHOOK_SECRET) return null;
    try {
      return stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      logger.warn({ err }, 'Stripe webhook signature verification failed');
      return null;
    }
  },
};
