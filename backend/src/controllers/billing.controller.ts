import { Request, Response } from 'express';
import { billingService } from '../services/billing.service';
import { stripeService } from '../services/stripe.service';
import { ok } from '../utils/apiResponse';
import type { checkoutSchema, listBillingSchema } from '../validators/billing.validator';
import type { z } from 'zod';

type CheckoutBody = z.infer<typeof checkoutSchema>;
type ListQuery = z.infer<typeof listBillingSchema>;

export const billingController = {
  async listPlans(_req: Request, res: Response) {
    const plans = await billingService.listPlans();
    return ok(res, { plans });
  },

  async getSubscription(req: Request, res: Response) {
    const subscription = await billingService.getSubscription(req.params.workspaceId);
    return ok(res, { subscription });
  },

  async checkout(req: Request, res: Response) {
    const body = req.body as CheckoutBody;
    const session = await billingService.createCheckoutSession(
      req.params.workspaceId,
      body.planSlug,
      req.user!.email,
      req.user!.email.split('@')[0],
    );
    return ok(res, session);
  },

  async portal(req: Request, res: Response) {
    const session = await billingService.createPortalSession(req.params.workspaceId);
    return ok(res, session);
  },

  async cancel(req: Request, res: Response) {
    const subscription = await billingService.cancelSubscription(
      req.params.workspaceId,
      req.user!.id,
    );
    return ok(res, { subscription }, 'Subscription will cancel at period end.');
  },

  async listInvoices(req: Request, res: Response) {
    const q = req.query as unknown as ListQuery;
    const result = await billingService.listInvoices(req.params.workspaceId, q.page, q.limit);
    return ok(res, result);
  },

  async listPayments(req: Request, res: Response) {
    const q = req.query as unknown as ListQuery;
    const result = await billingService.listPayments(req.params.workspaceId, q.page, q.limit);
    return ok(res, result);
  },

  async getUsage(req: Request, res: Response) {
    const usage = await billingService.getUsage(req.params.workspaceId);
    return ok(res, usage);
  },

  async webhook(req: Request, res: Response) {
    const signature = req.headers['stripe-signature'] as string;
    const event = stripeService.constructWebhookEvent(req.body as Buffer, signature);
    if (!event) {
      return res.status(400).json({ success: false, error: { message: 'Invalid signature' } });
    }
    await billingService.handleStripeWebhook({
      type: event.type,
      data: { object: event.data.object as unknown as Record<string, unknown> },
    });
    return res.json({ received: true });
  },
};
