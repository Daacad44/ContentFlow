# Agent 10 — Billing Specialist

## 1. Requirements

- Stripe integration for subscriptions and payments
- Three-tier plan model (Free, Pro, Business)
- Per-workspace subscription with usage limits
- Invoice and payment history
- Usage tracking with limit warnings at 90%

## 2. Features

| Feature | Description |
|---------|-------------|
| Stripe Integration | Checkout, portal, webhooks |
| Plans | Free/Pro/Business with feature limits |
| Subscriptions | One per workspace, auto-created on Free |
| Invoices | Stripe-synced invoice records |
| Payments | Payment history with status |
| Usage Tracking | Monthly counters per metric |

## 3. Database Design

- **plans** — Product catalog
- **subscriptions** — Workspace ↔ plan mapping
- **invoices**, **payments** — Billing history
- **usage_records** — Monthly usage counters

## 4. Prisma Models

`Plan`, `Subscription`, `Invoice`, `Payment`, `UsageRecord`

## 5. API Design

| Method | Endpoint | Permission |
|--------|----------|------------|
| GET | `/billing/plans` | Public |
| POST | `/billing/webhook` | Stripe signature |
| GET | `/workspaces/:id/billing/subscription` | `billing:read` |
| GET | `/workspaces/:id/billing/usage` | `billing:read` |
| POST | `/workspaces/:id/billing/checkout` | `billing:manage` |
| POST | `/workspaces/:id/billing/portal` | `billing:manage` |
| POST | `/workspaces/:id/billing/cancel` | `billing:manage` |

## 6. Backend Structure

```
backend/src/
├── services/billing.service.ts
├── services/stripe.service.ts
├── controllers/billing.controller.ts
├── routes/billing.routes.ts
└── validators/billing.validator.ts
```

## 7. Frontend Structure

```
frontend/src/
├── lib/billing.ts
└── pages/BillingPage.tsx
```

## 8. UI Components

- `BillingPage` — Plan cards, current subscription, usage display

## 9. Security Rules

- Webhook verified via Stripe signature + raw body
- Billing manage restricted to workspace OWNER
- Billing read for ADMIN+

## 10. Validation Rules

- Checkout planSlug: `pro | business`
- Pagination: page/limit bounds

## 11. Testing Plan

- Unit: default plans seeding
- Integration: subscription auto-create, usage increment
- Manual: Stripe test mode checkout flow

## 12. Production Ready Code

Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY` in `.env`.
