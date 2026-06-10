/** src/pages/BillingPage.tsx — Module 10 Billing */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AppShell } from '../components/AppShell';
import { useWorkspace } from '../context/WorkspaceContext';
import { billingApi, type Plan, type Subscription } from '../lib/billing';
import { PageHeader, StatusBadge, DataTable } from '../components/ui/ContentFlowUI';

interface Invoice {
  id: string;
  number?: string;
  createdAt: string;
  amountCents: number;
  status: string;
}

export default function BillingPage() {
  const { activeWorkspace } = useWorkspace();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    billingApi.listPlans().then((r) => setPlans(r.data.data.plans));
  }, []);

  useEffect(() => {
    if (!activeWorkspace) return;
    Promise.all([
      billingApi.getSubscription(activeWorkspace.id),
      billingApi.listInvoices(activeWorkspace.id),
    ]).then(([sub, inv]) => {
      setSubscription(sub.data.data.subscription);
      const items = (inv.data as { data?: { invoices?: Invoice[] } })?.data?.invoices ?? [];
      setInvoices(items);
    }).catch(() => {});
  }, [activeWorkspace?.id]);

  const handlePortal = async () => {
    if (!activeWorkspace) return;
    try {
      const res = await billingApi.portal(activeWorkspace.id);
      if (res.data.data.url) window.location.href = res.data.data.url;
    } catch {
      toast.error('Billing portal unavailable');
    }
  };

  const currentPlan = subscription?.plan ?? plans.find((p) => p.slug === 'pro') ?? plans[0];
  const price = currentPlan ? (currentPlan.priceCents / 100).toFixed(0) : '29';

  const invoiceRows = invoices.map((inv) => [
    inv.number ?? inv.id.slice(0, 8),
    new Date(inv.createdAt).toLocaleDateString(),
    `$${(inv.amountCents / 100).toFixed(2)}`,
    <StatusBadge key={inv.id} variant="paid">Paid</StatusBadge>,
  ]);

  if (!activeWorkspace) {
    return (
      <AppShell>
        <p className="text-cf-muted">Select a workspace for billing.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="Billing & Subscription" />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="cf-card">
          <h2 className="text-lg font-semibold text-cf-text">Current Plan</h2>
          <p className="mt-2 text-3xl font-bold text-cf-text">
            {currentPlan?.name ?? 'Pro Plan'}
            <span className="text-base font-normal text-cf-muted"> ${price}/month</span>
          </p>
          {subscription && (
            <p className="mt-1 text-sm text-cf-muted">
              Status: {subscription.status} · Renews{' '}
              {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </p>
          )}
          <ul className="mt-4 space-y-2 text-sm text-cf-muted">
            {['Unlimited posts', 'AI content generation', 'Analytics dashboard', 'Team collaboration'].map(
              (f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> {f}
                </li>
              ),
            )}
          </ul>
          <button onClick={handlePortal} className="cf-btn-primary mt-6">
            Manage Subscription
          </button>
        </div>

        <div className="cf-card">
          <h2 className="mb-4 text-lg font-semibold text-cf-text">Invoices</h2>
          <DataTable
            headers={['Invoice ID', 'Date', 'Amount', 'Status']}
            rows={invoiceRows}
            emptyMessage="No invoices yet."
          />
        </div>
      </div>
    </AppShell>
  );
}
