import { billingService } from '../../src/services/billing.service';

describe('billingService.ensureDefaultPlans', () => {
  it('defines free, pro, and business tiers', async () => {
    await billingService.ensureDefaultPlans();
    const plans = await billingService.listPlans();
    const slugs = plans.map((p) => p.slug);
    expect(slugs).toContain('free');
    expect(slugs).toContain('pro');
    expect(slugs).toContain('business');
  });
});
