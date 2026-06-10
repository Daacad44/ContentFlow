# Agent 12 — Activity Logs Specialist

## 1. Requirements

- Extend existing audit log writes with categories and severity
- Read APIs for audit, security, login, and system history
- Login history tracking on auth success/failure
- Workspace-scoped and platform-wide views

## 2. Features

| Feature | Description |
|---------|-------------|
| Audit Logs | Full action trail with category/severity |
| User Activity Logs | USER_ACTIVITY category events |
| Security Logs | SECURITY category + login history |
| Login History | Dedicated model with IP/UA/failure reason |
| System History | SYSTEM category events |

## 3. Database Design

- **audit_logs** (extended) — +workspaceId, category, severity, resourceType/Id
- **login_history** — Dedicated login attempt records

## 4. Prisma Models

Extended `AuditLog`, new `LoginHistory`

Enums: `AuditCategory`, `AuditSeverity`

## 5. API Design

| Method | Endpoint | Permission |
|--------|----------|------------|
| GET | `/activity-logs/audit` | `audit:read` (platform) |
| GET | `/activity-logs/login-history` | Authenticated user |
| GET | `/activity-logs/security` | `audit:read` |
| GET | `/activity-logs/system` | `audit:read` |
| GET | `/workspaces/:id/activity-logs/audit` | `activity:read` |
| GET | `/workspaces/:id/activity-logs/login-history` | `activity:read` |
| GET | `/workspaces/:id/activity-logs/security` | `activity:read` |

## 6. Backend Structure

```
backend/src/
├── services/activityLog.service.ts
├── services/audit.service.ts (extended)
├── controllers/activityLog.controller.ts
├── routes/activityLog.routes.ts
└── validators/activityLog.validator.ts
```

## 7. Frontend Structure

```
frontend/src/
├── lib/activityLogs.ts
└── pages/ActivityLogsPage.tsx
```

## 8. UI Components

- `ActivityLogsPage` — Tabbed audit/login/security views
- `LogTable` — Reusable log display

## 9. Security Rules

- Platform audit logs: ADMIN+ with `audit:read`
- Workspace logs: member with `activity:read`
- Login history: users see own; admins see all
- Auth events tagged SECURITY category

## 10. Validation Rules

- Pagination: page 1+, limit max 100
- Filters: valid UUIDs, enum categories/severities
- Date range: ISO 8601

## 11. Testing Plan

- Integration: login creates LoginHistory record
- Unit: security summary aggregation
- E2E: activity logs page tab switching

## 12. Production Ready Code

Login history hooked in `auth.service.ts`. Read APIs in `activityLog.service.ts`.
