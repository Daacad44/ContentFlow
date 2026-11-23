# Deploying ContentFlow on Vercel + Supabase

ContentFlow runs as two Vercel projects backed by one Supabase project:

| Piece | Where | Notes |
| --- | --- | --- |
| Frontend (React SPA) | Vercel project `content-flow`, root `frontend/` | Serves the app and proxies `/api/*` to the API project, so cookies stay first-party |
| API (Express) | Vercel project `content-flow-api`, root `backend/` | One serverless function (`backend/api/index.ts`), region `fra1` |
| Database | Supabase Postgres | Prisma migrations run on every API deploy (`npm run vercel-build`) |
| Post media | Supabase Storage, public bucket `post-media` | Social platforms fetch media by public URL |
| Scheduled publishing | Supabase `pg_cron` → `GET /api/v1/internal/cron/publish-due` every minute | No Redis or worker needed |

## 1. Supabase

1. Create a project (region close to `fra1`, e.g. `eu-central-1`).
2. **Project Settings → Database → Connection string**:
   - `DATABASE_URL` = *Transaction pooler* URI (port 6543) + `?pgbouncer=true&connection_limit=1`
   - `DIRECT_URL` = *Session pooler* URI (port 5432)
3. **Project Settings → API**: copy the Project URL (`SUPABASE_URL`) and the `service_role` key (`SUPABASE_SERVICE_ROLE_KEY`, secret).
4. Create the media bucket (SQL editor):

   ```sql
   insert into storage.buckets (id, name, public)
   values ('post-media', 'post-media', true)
   on conflict (id) do nothing;
   ```

## 2. API project on Vercel (`backend/`)

Create a Vercel project from this repository with **Root Directory = `backend`**. `backend/vercel.json` sets the build, the function and the region.

Environment variables (Production):

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL`, `DIRECT_URL` | from Supabase (step 1.2) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | from Supabase (step 1.3) |
| `MEDIA_STORAGE` | `supabase` |
| `MAX_UPLOAD_SIZE_MB` | `4` (Vercel limits request bodies to 4.5 MB) |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | `openssl rand -base64 48` each |
| `CRON_SECRET` | `openssl rand -hex 32` |
| `REQUIRE_REDIS_IN_PRODUCTION` | `false` |
| `ENABLE_IN_PROCESS_SCHEDULER` | `false` |
| `API_URL`, `PUBLIC_API_URL`, `CLIENT_URL` | `https://contentflow.botandev.com` |
| `CORS_ORIGINS` | `https://contentflow.botandev.com` |
| `GOOGLE_CALLBACK_URL` | `https://contentflow.botandev.com/api/v1/auth/google/callback` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `ZERNIO_API_KEY`, `GEMINI_API_KEY`, `STRIPE_*` | your keys |

Check: `https://<api-project>.vercel.app/api/v1/health` returns `{"success":true}`.

## 3. Frontend project on Vercel (`frontend/`)

Set `API_PROXY_URL` = `https://<api-project>.vercel.app` and `VITE_API_URL` = `/api/v1`, then redeploy.

## 4. Scheduled publishing (every minute)

Vercel Cron on the Hobby plan runs at most once a day (`backend/vercel.json` keeps a daily safety run). For per-minute publishing, schedule the endpoint from Supabase:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'contentflow-publish-due',
  '* * * * *',
  $$
  select net.http_get(
    url := 'https://<api-project>.vercel.app/api/v1/internal/cron/publish-due',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
  );
  $$
);
```

The endpoint claims each due post's publish job atomically, so overlapping runs never publish a post twice.
