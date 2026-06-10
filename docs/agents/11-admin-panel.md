# Agent 11 — Admin Panel Specialist

## 1. Requirements

- Platform admin dashboard for ADMIN/SUPER_ADMIN roles
- User management (extends existing `/users` API)
- Revenue dashboard consuming billing data
- System settings key-value store
- Monitoring and platform reports

## 2. Features

| Feature | Description |
|---------|-------------|
| User Management | List, activate/deactivate users |
| Revenue Dashboard | Payments, invoices, plan distribution |
| System Settings | Key-value config (SUPER_ADMIN only) |
| Monitoring | Queue health, failures, security summary |
| Reports | User/post/audit aggregates |

## 3. Database Design

- **system_settings** — Platform configuration
- Reuses `users`, `subscriptions`, `payments`, `audit_logs`

## 4. Prisma Models

`SystemSetting` (+ existing User, Payment, etc.)

## 5. API Design

| Method | Endpoint | Permission |
|--------|----------|------------|
| GET | `/admin/dashboard` | `admin:dashboard` |
| GET | `/admin/revenue` | `revenue:read` |
| GET | `/admin/monitoring` | `admin:monitoring` |
| GET | `/admin/reports` | `admin:reports` |
| GET/PUT | `/admin/settings/:key` | `admin:settings` |
| GET/PATCH | `/users` (existing) | `user:list` |

## 6. Backend Structure

```
backend/src/
├── services/admin.service.ts
├── controllers/admin.controller.ts
├── routes/admin.routes.ts
└── validators/admin.validator.ts
```

## 7. Frontend Structure

```
frontend/src/pages/admin/
├── AdminDashboardPage.tsx
├── AdminUsersPage.tsx
├── AdminRevenuePage.tsx
├── AdminSettingsPage.tsx
├── AdminMonitoringPage.tsx
└── AdminReportsPage.tsx
```

## 8. UI Components

- Admin sub-nav in `AppShell` (visible to ADMIN+)
- Protected routes with `minRole` guard

## 9. Security Rules

- All `/admin/*` routes require authentication + permission
- Settings write: SUPER_ADMIN only
- User deactivation: ADMIN+ with `user:deactivate`

## 10. Validation Rules

- Revenue rangeDays: 1–365
- Setting key: 1–100 chars
- Setting value: JSON-serializable

## 11. Testing Plan

- RBAC: USER cannot access `/admin/dashboard`
- Integration: dashboard stats with seeded data
- E2E: admin nav visible only for admin users

## 12. Production Ready Code

Routes at `/api/v1/admin/*`, frontend at `/admin/*`.
