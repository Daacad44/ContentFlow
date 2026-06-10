# Agent 09 — Notification Specialist

## 1. Requirements

- In-app notification inbox with unread counts
- Email notifications via existing Resend/SMTP pipeline
- Configurable alert rules per workspace
- Per-category notification preferences (email + in-app)
- Respects user preference before delivery

## 2. Features

| Feature | Description |
|---------|-------------|
| Email Notifications | Transactional emails for alerts, billing, security |
| In-App Notifications | Persistent inbox with read/unread state |
| Alert System | Metric-based rules (failed posts, publish failures) |
| Notification Preferences | Per-category channel toggles (global + workspace) |

## 3. Database Design

- **notifications** — In-app notification records
- **notification_preferences** — User channel preferences per category
- **alert_rules** — Workspace alert configurations

## 4. Prisma Models

`Notification`, `NotificationPreference`, `AlertRule`

## 5. API Design

| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/notifications` | User |
| PATCH | `/notifications/:id/read` | User |
| POST | `/notifications/read-all` | User |
| GET/PATCH | `/notifications/preferences` | User |
| GET/POST/PATCH/DELETE | `/workspaces/:id/notifications/alerts` | Workspace ADMIN+ |
| POST | `/workspaces/:id/notifications/alerts/evaluate` | Workspace ADMIN+ |

## 6. Backend Structure

```
backend/src/
├── services/notification.service.ts
├── controllers/notification.controller.ts
├── routes/notification.routes.ts
└── validators/notification.validator.ts
```

## 7. Frontend Structure

```
frontend/src/
├── lib/notifications.ts
├── components/NotificationBell.tsx
└── pages/NotificationsPage.tsx
```

## 8. UI Components

- `NotificationBell` — Header dropdown with unread badge
- `NotificationsPage` — Inbox, preferences, alerts tabs
- `AlertsPanel` — CRUD for alert rules

## 9. Security Rules

- Users can only read/update their own notifications
- Alert management requires `alert:manage` (ADMIN+)
- Email sends respect `emailEnabled` preference

## 10. Validation Rules

- Alert metric: `failed_posts | publish_failures | pending_posts`
- Condition: `gt | gte | lt | lte | eq`
- Preference categories: `NotificationCategory` enum

## 11. Testing Plan

- Unit: `checkCondition` logic
- Integration: create notification, mark read, preference filtering
- E2E: bell badge updates, preferences persist

## 12. Production Ready Code

Implemented in notification service, routes, `NotificationBell`, `NotificationsPage`.
