import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AppShell } from '../components/AppShell';
import { useWorkspace } from '../context/WorkspaceContext';
import { billingApi, type Plan, type Subscription } from '../lib/billing';

export default function BillingPage() {
  const { activeWorkspace } = useWorkspace();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    billingApi.listPlans().then((r) => setPlans(r.data.data.plans));
  }, []);

  useEffect(() => {
    if (!activeWorkspace) return;
    Promise.all([
      billingApi.getSubscription(activeWorkspace.id),
      billingApi.getUsage(activeWorkspace.id),
    ]).then(([sub, usg]) => {
      setSubscription(sub.data.data.subscription);
      setUsage(usg.data.data);
    });
  }, [activeWorkspace?.id]);

  const handleUpgrade = async (slug: string) => {
    if (!activeWorkspace) return;
    try {
      const res = await billingApi.checkout(activeWorkspace.id, slug);
      if (res.data.data.url) window.location.href = res.data.data.url;
      else toast.error('Stripe not configured');
    } catch {
      toast.error('Checkout unavailable — configure Stripe keys');
    }
  };

  const handlePortal = async () => {
    if (!activeWorkspace) return;
    try {
      const res = await billingApi.portal(activeWorkspace.id);
      if (res.data.data.url) window.location.href = res.data.data.url;
    } catch {
      toast.error('Billing portal unavailable');
    }
  };

  if (!activeWorkspace) {
    return (
      <AppShell>
        <p className="text-muted">Select a workspace for billing.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="text-3xl font-extrabold text-white">Billing</h1>
      <p className="mt-2 text-muted">Plans, subscriptions & usage for {activeWorkspace.name}</p>

      {subscription && (
        <div className="mt-6 rounded-xl border border-ink-500/60 bg-ink-700/60 p-6">
          <h2 className="text-lg font-bold text-white">Current Plan: {subscription.plan.name}</h2>
          <p className="mt-1 text-sm text-muted">
            Status: {subscription.status} · Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
          </p>
          {subscription.cancelAtPeriodEnd && (
            <p className="mt-2 text-sm text-amber-400">Cancels at period end</p>
          )}
          <button onClick={handlePortal} className="mt-4 rounded-lg border border-ink-500 px-4 py-2 text-sm hover:bg-ink-600">
            Manage billing
          </button>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.id} className="rounded-xl border border-ink-500/60 bg-ink-700/60 p-6">
            <h3 className="text-xl font-bold text-white">{plan.name}</h3>
            <p className="mt-1 text-sm text-muted">{plan.description}</p>
            <p className="mt-4 text-3xl font-extrabold text-brand">
              ${(plan.priceCents / 100).toFixed(0)}
              <span className="text-sm font-normal text-muted">/mo</span>
            </p>
            <ul className="mt-4 space-y-1 text-sm text-muted">
              {Object.entries(plan.features).map(([k, v]) => (
                <li key={k}>{k}: {v === -1 ? 'Unlimited' : v}</li>
              ))}
            </ul>
            {plan.slug !== 'free' && subscription?.plan.slug !== plan.slug && (
              <button
                onClick={() => handleUpgrade(plan.slug)}
                className="mt-4 w-full rounded-lg bg-brand py-2 text-sm font-semibold text-white"
              >
                Upgrade
              </button>
            )}
          </div>
        ))}
      </div>

      {usage && (
        <div className="mt-8 rounded-xl border border-ink-500/60 bg-ink-700/60 p-6">
          <h2 className="text-lg font-bold text-white">Usage This Month</h2>
          <pre className="mt-3 text-xs text-muted">{JSON.stringify(usage, null, 2)}</pre>
        </div>
      )}
    </AppShell>
  );
}
