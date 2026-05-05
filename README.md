# Elex Exchange India — Backend

NestJS + PostGraphile backend for the Elex Exchange India B2B classified board (WTS / WTB) for mobile + electronics wholesale.

Sister product to TradeX. Lives in its own database (NeonDB project) and shares zero state with `tradex-backend`.

## Stack

- NestJS 10 (Express)
- PostGraphile 4 mounted at `/graphql`
- PostgreSQL 15 (NeonDB) with Row-Level Security
- passport-jwt + bcryptjs auth
- Twilio WhatsApp for OTP
- SendGrid for transactional email

## Local setup

```bash
# 1. Install deps
npm install

# 2. Copy env template and fill in real values
cp .env.example .env
# Edit .env: set ELEX_CONNECTION_STRING, ELEX_JWT_SECRET, Twilio + SendGrid keys.

# 3. Initialise the database (schema + seeds)
npm run db:migrate:neon

# 4. Start in dev mode
npm run start:dev
```

The server listens on `PORT` (default `3001`). PostGraphile UI is at `/graphiql`.

## Scripts

| Command | What it does |
|---|---|
| `npm run start:dev` | Watch-mode dev server |
| `npm run start:prod` | Run compiled `dist/main` |
| `npm run build` | Compile to `dist/` |
| `npm run db:migrate:neon` | Apply `database/schema.sql` then every file under `database/seeds/` |
| `npm run db:seed:neon` | Re-apply only the seeds (idempotent) |
| `npm test` | Jest |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## Project layout

```
elex-exchange-backend/
├── api/                       Vercel serverless entry (api/index.ts)
├── database/
│   ├── schema.sql             Canonical full schema (extensions → enums → tables → RLS)
│   ├── seeds/                 Idempotent seed SQL (brands, categories, …)
│   └── migrations/            Future schema deltas (empty at v3 launch)
├── scripts/
│   ├── migrate-neondb.js      schema + seeds
│   └── seed-neondb.js         seeds only
├── src/
│   ├── main.ts                Local server bootstrap
│   ├── app.bootstrap.ts       createApp() factory (helmet, CORS, validation)
│   ├── app.module.ts          Top-level Nest module
│   ├── config/                env validation
│   ├── modules/
│   │   ├── database/          pg Pool + per-request app.current_user_id
│   │   ├── graphql/           PostGraphile mount with JWT pgSettings
│   │   ├── auth/              register, login, OTP, JWT
│   │   ├── kyc/               trader KYC submit + admin approve/reject
│   │   ├── audit/             audit_log writer
│   │   ├── mail/              SendGrid wrapper
│   │   └── whatsapp/          Twilio OTP wrapper
│   └── common/                Guards, decorators, filters
└── vercel.json                Vercel deploy config
```

## Architecture

- **Single users table** holds traders + admins. `users.role` enum (`TRADER`, `ADMIN`, `SUPER_ADMIN`) differentiates.
- **One JWT secret** (`ELEX_JWT_SECRET`). JWT payload: `{ sub: userId, email, role }`.
- **Single Postgres pool** at `DATABASE_URL` / `ELEX_CONNECTION_STRING`. Every request sets `app.current_user_id` and `app.current_user_role` so PostGraphile + RLS work correctly.
- **PostGraphile** mounted at `/graphql` and `/graphiql`. Uses the `app_user` role under the hood; RLS enforces ownership.
- **Subscription tier** is manual (admin sets `trader_profiles.subscription_tier`). No payment automation at MVP.

## Database

- 15 tables. See `database/schema.sql` (header comment lists them).
- All RLS-enforced. App always sets `app.current_user_id` per request.
- `gen_random_uuid()` for PKs (uuid-ossp + pgcrypto extensions).

## Deployment

Vercel serverless via `vercel.json` → `api/index.ts`. The same `createApp()` factory in `src/app.bootstrap.ts` powers both local (`src/main.ts`) and Vercel.

## Conventions

Mirrors `tradex-backend` exactly:
- kebab-case file names (`auth.service.ts`, `jwt.strategy.ts`, `*.dto.ts`)
- class-validator on DTOs
- NestJS Logger (no Pino/Winston)
- Tests in `*.spec.ts` next to source
