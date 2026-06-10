# Agent 08 — Analytics Specialist

## 1. Requirements

- Workspace-scoped analytics for social content performance
- Engagement, reach, growth, and performance report types
- Dashboard metrics aggregating posts, publishing, AI, and team data
- Historical snapshots and exportable reports
- RBAC: VIEWER+ can read; ADMIN+ can generate reports

## 2. Features

| Feature | Description |
|---------|-------------|
| Engagement Analytics | Published posts, platform breakdown, estimated engagement |
| Reach Analytics | Impressions and reach per connected account |
| Growth Analytics | Member/account growth, post timeline, growth rate |
| Performance Reports | Combined report with publishing success/failure rates |
| Dashboard Metrics | Real-time workspace KPIs (30-day window) |
| Report Generation | Async report records with JSON data export |

## 3. Database Design

- **analytics_snapshots** — Periodic metric aggregates per workspace/account
- **analytics_reports** — Generated report jobs with status lifecycle

## 4. Prisma Models

`AnalyticsSnapshot`, `AnalyticsReport` — see `backend/prisma/schema.prisma`

## 5. API Design

| Method | Endpoint | Permission |
|--------|----------|------------|
| GET | `/workspaces/:id/analytics/dashboard` | `analytics:read` |
| GET | `/workspaces/:id/analytics/engagement` | `analytics:read` |
| GET | `/workspaces/:id/analytics/reach` | `analytics:read` |
| GET | `/workspaces/:id/analytics/growth` | `analytics:read` |
| GET | `/workspaces/:id/analytics/performance` | `analytics:read` |
| GET | `/workspaces/:id/analytics/reports` | `analytics:read` |
| POST | `/workspaces/:id/analytics/reports` | `analytics:report` |
| GET | `/workspaces/:id/analytics/reports/:reportId` | `analytics:read` |

## 6. Backend Structure

```
backend/src/
├── services/analytics.service.ts
├── controllers/analytics.controller.ts
├── routes/analytics.routes.ts
└── validators/analytics.validator.ts
```

## 7. Frontend Structure

```
frontend/src/
├── lib/analytics.ts
└── pages/AnalyticsPage.tsx
```

## 8. UI Components

- `AnalyticsPage` — Dashboard metrics grid + engagement/reach/growth panels
- `MetricCard` — Reusable stat display

## 9. Security Rules

- All routes require authentication + workspace membership
- `analytics:read` for VIEWER; `analytics:report` for ADMIN+
- No cross-workspace data leakage (workspaceId enforced in service layer)

## 10. Validation Rules

- Date range: ISO 8601 `from`/`to` query params
- Report: title 1–200 chars, type enum, valid datetime period

## 11. Testing Plan

- Unit: metric aggregation logic, period bounds
- Integration: dashboard endpoint with seeded posts
- E2E: Analytics page loads with active workspace

## 12. Production Ready Code

Implemented in:
- `backend/src/services/analytics.service.ts`
- `backend/src/controllers/analytics.controller.ts`
- `backend/src/routes/analytics.routes.ts`
- `frontend/src/pages/AnalyticsPage.tsx`
