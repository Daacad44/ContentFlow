# ContentFlow — Authentication & Authorization Module

Enterprise-grade authentication and authorization for the **Social Scheduler AI** SaaS
(ContentFlow). Built by **Agent 01 — Authentication Specialist**.

> Stack: **Node.js · Express · TypeScript · PostgreSQL · Prisma · JWT · Google OAuth**
> Frontend: **React · Vite · TypeScript · TailwindCSS · React Hook Form · Zod**

---

## Table of contents

1. [Features](#1-features)
2. [Architecture](#2-architecture)
3. [File structure](#3-file-structure)
4. [Database tables & Prisma schema](#4-database-tables--prisma-schema)
5. [API endpoints](#5-api-endpoints)
6. [Validation rules](#6-validation-rules)
7. [Security rules](#7-security-rules)
8. [RBAC model](#8-rbac-model)
9. [Token & session model](#9-token--session-model)
10. [Frontend pages](#10-frontend-pages)
11. [Setup & running](#11-setup--running)
12. [Testing strategy](#12-testing-strategy)

---

## 1. Features

| # | Feature | Status |
|---|---------|--------|
| 1 | User Registration | ✅ |
| 2 | User Login | ✅ |
| 3 | User Logout (single + all devices) | ✅ |
| 4 | Forgot Password | ✅ |
| 5 | Reset Password | ✅ |
| 6 | Email Verification (+ resend) | ✅ |
| 7 | Google OAuth Login | ✅ |
| 8 | Session Management (refresh-token sessions, device binding) | ✅ |
| 9 | JWT Authentication (short-lived access tokens) | ✅ |
| 10 | Refresh Tokens (rotating, hashed, reuse-detection) | ✅ |
| 11 | RBAC (USER / ADMIN / SUPER_ADMIN + granular permissions) | ✅ |
| 12 | Profile Management | ✅ |
| 13 | Change Password | ✅ |
| 14 | Account Security (lockout, audit log, logout-everywhere) | ✅ |

---

## 2. Architecture

A clean, layered backend keeps HTTP concerns separate from business logic:

```
Request ─▶ Route ─▶ Middleware (rate-limit, validate, authenticate, RBAC)
                 ─▶ Controller (HTTP <-> service translation, cookies)
                 ─▶ Service    (pure business logic, no Express)
                 ─▶ Prisma     (PostgreSQL)
```

- **Controllers** never contain business rules — they translate HTTP to/from services.
- **Services** are framework-agnostic and unit-testable.
- **Tokens, password hashing, cookies** live in dedicated utilities.
- **A global error handler** maps typed `ApiError`s to clean JSON and hides internals.

---

## 3. File structure

```
saas/
├── README.md
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── jest.config.js
│   ├── .env.example
│   ├── prisma/
│   │   ├── schema.prisma          # DB tables (User, RefreshToken, VerificationToken, AuditLog)
│   │   └── seed.ts                # Seeds a SUPER_ADMIN
│   ├── src/
│   │   ├── server.ts              # Entry point + graceful shutdown
│   │   ├── app.ts                 # Express app (helmet, cors, hpp, passport, routes)
│   │   ├── config/
│   │   │   ├── env.ts             # Validated environment (fail-fast)
│   │   │   ├── prisma.ts          # Prisma singleton
│   │   │   ├── passport.ts        # Google OAuth strategy (stateless)
│   │   │   └── permissions.ts     # RBAC role → permission matrix
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   └── user.controller.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts    # register/login/refresh/reset/oauth...
│   │   │   ├── user.service.ts    # profile + admin user ops
│   │   │   ├── token.service.ts   # refresh + verification tokens (hashed, rotating)
│   │   │   ├── email.service.ts   # SMTP transactional emails
│   │   │   └── audit.service.ts   # security event log
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts # Bearer auth + tokenVersion check
│   │   │   ├── rbac.middleware.ts # requireRole / requireMinRole / requirePermission
│   │   │   ├── validate.middleware.ts
│   │   │   ├── rateLimit.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── routes/
│   │   │   ├── index.ts
│   │   │   ├── auth.routes.ts
│   │   │   └── user.routes.ts
│   │   ├── validators/
│   │   │   ├── auth.validator.ts  # Zod schemas (password policy etc.)
│   │   │   └── user.validator.ts
│   │   ├── utils/
│   │   │   ├── apiError.ts
│   │   │   ├── apiResponse.ts
│   │   │   ├── asyncHandler.ts
│   │   │   ├── cookies.ts
│   │   │   ├── logger.ts
│   │   │   ├── password.ts        # Argon2id hashing
│   │   │   ├── tokens.ts          # JWT + opaque token helpers
│   │   │   └── requestContext.ts
│   │   └── types/express.d.ts
│   └── tests/
│       ├── setup.ts
│       ├── unit/{password,rbac}.test.ts
│       └── integration/auth.flow.test.ts
└── frontend/
    ├── package.json
    ├── vite.config.ts · tailwind.config.js · postcss.config.js
    ├── index.html
    └── src/
        ├── main.tsx · App.tsx · index.css
        ├── lib/{api.ts, validation.ts}
        ├── context/AuthContext.tsx
        ├── components/{AuthLayout,Field,PasswordStrength,GoogleButton,ProtectedRoute,Logo}.tsx
        └── pages/{Login,Register,ForgotPassword,ResetPassword,VerifyEmail,CompleteProfile,OAuthCallback,Dashboard}Page.tsx
```

---

## 4. Database tables & Prisma schema

Full schema: [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma).

| Table | Purpose |
|-------|---------|
| `users` | Accounts: credentials, profile, role, provider, verification, lockout, `tokenVersion`. |
| `refresh_tokens` | One row per session/device. Stores **SHA-256 hash** of the token, rotation pointer, expiry, revoke time, IP/user-agent. |
| `verification_tokens` | Single-use **hashed** tokens for `EMAIL_VERIFICATION` and `PASSWORD_RESET`. |
| `audit_logs` | Security events (login success/failure, token reuse, password changes, etc.). |

Key columns on `users`:

- `passwordHash` — nullable (OAuth-only accounts have no password).
- `role` — `USER | ADMIN | SUPER_ADMIN`.
- `provider` — `LOCAL | GOOGLE`; `googleId` links a Google identity.
- `failedLoginAttempts` / `lockedUntil` — brute-force lockout.
- `tokenVersion` — incremented to instantly invalidate all access tokens.

---

## 5. API endpoints

Base path: `/api/v1`

### Auth (`/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | – | Create account, send verification email |
| POST | `/login` | – | Email + password → access token (+ refresh cookie) |
| POST | `/refresh` | cookie | Rotate refresh token, issue new access token |
| POST | `/logout` | – | Revoke current refresh token |
| POST | `/logout-all` | Bearer | Revoke all sessions (bumps `tokenVersion`) |
| POST | `/verify-email` | – | Verify email with token |
| POST | `/resend-verification` | – | Resend verification email |
| POST | `/forgot-password` | – | Send reset link (always 200, no enumeration) |
| POST | `/reset-password` | – | Set new password via token; revokes all sessions |
| POST | `/change-password` | Bearer | Change password (requires current) |
| GET  | `/me` | Bearer | Current user |
| GET  | `/google` | – | Begin Google OAuth |
| GET  | `/google/callback` | – | OAuth callback → redirect to client with token |

### Users (`/users`)

| Method | Path | Auth | Permission |
|--------|------|------|------------|
| GET | `/me` | Bearer | self |
| PATCH | `/me` | Bearer | self (profile update / complete) |
| GET | `/` | Bearer | `user:list` (ADMIN+) |
| PATCH | `/:id/role` | Bearer | `user:update_role` (SUPER_ADMIN) |
| PATCH | `/:id/active` | Bearer | `user:deactivate` (ADMIN+) |

All responses use a consistent envelope:

```jsonc
// success
{ "success": true, "message": "...", "data": { /* ... */ } }
// error
{ "success": false, "error": { "code": "BAD_REQUEST", "message": "...", "details": [ ... ] } }
```

---

## 6. Validation rules

Defined with Zod in `backend/src/validators/*` (mirrored client-side in
`frontend/src/lib/validation.ts`).

**Password policy** (`regist, reset, change`):

- 8–128 characters
- at least one lowercase **and** one uppercase letter
- at least one number **or** special character
- `confirmPassword` must match

**Email:** trimmed, lowercased, RFC-validated, ≤ 254 chars.
**Registration:** `fullName` ≥ 2 chars, `acceptTerms` must be `true`.
**Profile:** optional `companyName`, `timezone`, `avatarUrl` (valid URL).

Validation failures return `400` with a `details[]` array of `{ field, message }`.

---

## 7. Security rules

- **Argon2id** password hashing with optional server-side **pepper**; transparent
  re-hash on parameter upgrades.
- **Access tokens**: short-lived (15 m) JWTs with issuer/audience claims, kept in
  memory on the client (never `localStorage`).
- **Refresh tokens**: long-lived, **opaque**, stored **hashed** (SHA-256), delivered
  in an **httpOnly + Secure + SameSite** cookie scoped to `/api/v1/auth`.
- **Refresh-token rotation** with **reuse detection**: replaying a rotated token
  revokes the entire token family and is audited.
- **`tokenVersion`** invalidates all access tokens on logout-all / password change /
  role change.
- **Account lockout** after N failed logins (configurable), with a cooldown window.
- **Anti-enumeration**: login, forgot-password and resend-verification return generic
  responses regardless of whether the account exists.
- **Rate limiting**: tiered (general / auth / sensitive).
- **Helmet, CORS allow-list (credentialed), HPP, body-size limits**.
- **Audit logging** of security-relevant events.
- **Centralised error handling** never leaks stack traces or internals in production.
- **Constant-time** token comparison to avoid timing attacks.

---

## 8. RBAC model

Roles map to granular permissions (`backend/src/config/permissions.ts`):

| Permission | USER | ADMIN | SUPER_ADMIN |
|------------|:----:|:-----:|:-----------:|
| `profile:read/update` | ✅ | ✅ | ✅ |
| `post:*` | ✅ | ✅ | ✅ |
| `user:list`, `user:deactivate`, `audit:read` | – | ✅ | ✅ |
| `user:update_role` | – | – | ✅ |

Guards: `requireRole(...)`, `requireMinRole(role)`, `requirePermission(...)`.

---

## 9. Token & session model

```
Login ─▶ access JWT (15m, in-memory)  +  refresh cookie (7d, httpOnly)
                                           │
On 401 ─▶ POST /auth/refresh ─────────────┘ rotates → new access + new refresh
Logout ─▶ revoke current refresh token (+ clear cookie)
Logout-all / password change ─▶ tokenVersion++  → every access token rejected
```

The frontend Axios client (`frontend/src/lib/api.ts`) transparently refreshes on
`401` and queues concurrent requests behind a single refresh call.

---

## 10. Frontend pages

Matches the provided ContentFlow design (dark navy + orange, "Create. Schedule. Grow."):

| Screen | Route | File |
|--------|-------|------|
| 01 Login | `/login` | `pages/LoginPage.tsx` |
| 02 Register | `/register` | `pages/RegisterPage.tsx` |
| 03 Forgot Password | `/forgot-password` | `pages/ForgotPasswordPage.tsx` |
| 04 Reset Password | `/reset-password?token=` | `pages/ResetPasswordPage.tsx` |
| 05 Verify Email | `/verify-email?token=` | `pages/VerifyEmailPage.tsx` |
| 06 Complete Profile | `/complete-profile` | `pages/CompleteProfilePage.tsx` |
| OAuth callback | `/oauth/callback` | `pages/OAuthCallbackPage.tsx` |
| Dashboard (protected) | `/dashboard` | `pages/DashboardPage.tsx` |

---

## 11. Setup & running

### Backend

```bash
cd backend
cp .env.example .env          # fill DATABASE_URL, JWT secrets, (optional) SMTP & Google
npm install
npm run prisma:generate
npm run prisma:migrate        # creates tables
npm run db:seed               # optional: create a SUPER_ADMIN
npm run dev                   # http://localhost:4000
```

Generate strong JWT secrets:

```bash
openssl rand -base64 48
```

> **Email/Google are optional in dev.** With SMTP unset, verification & reset emails
> are logged to the console. With Google creds unset, the OAuth routes are simply not
> mounted.

### Frontend

```bash
cd frontend
cp .env.example .env          # VITE_API_URL=http://localhost:4000/api/v1
npm install
npm run dev                   # http://localhost:5173
```

---

## 12. Testing strategy

A layered testing approach:

1. **Unit tests** (no DB) — pure logic: password hashing/verification, token helpers,
   and the RBAC permission matrix. Run anywhere, fast, in CI by default.
   - `tests/unit/password.test.ts`, `tests/unit/rbac.test.ts`
2. **Integration tests** (HTTP via supertest, real test DB) — the full auth flow:
   register → duplicate guard → weak-password rejection → login blocked pre-verify →
   login after verify → protected route. Gated behind `RUN_DB_TESTS=true` so the unit
   suite stays DB-free.
   - `tests/integration/auth.flow.test.ts`
3. **What to extend next**: refresh-token rotation & reuse-detection, lockout
   behaviour, RBAC route authorization (403s), and password-reset token lifecycle.

```bash
# Unit only (default, no DB needed)
npm test

# Include integration tests against a test database
createdb contentflow_test
DATABASE_URL=postgresql://.../contentflow_test npx prisma migrate deploy
RUN_DB_TESTS=true DATABASE_URL=postgresql://.../contentflow_test npm test
```

Run `npm run test:coverage` for a coverage report.
