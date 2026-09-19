# BuildTrack360

BuildTrack360 is a construction finance management platform for customer onboarding, projects, credit appraisal, loan facilities, milestone-based drawdowns, payments, risk monitoring, and executive reporting.

## Stack

- React + TypeScript
- TanStack Start / TanStack Router
- TanStack Query
- Supabase PostgreSQL + Auth + Storage
- Cloudflare Workers
- Tailwind CSS
- Recharts
- Zod + React Hook Form

## Supabase

The application is configured for the external Supabase project through environment variables.

Required runtime variables:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Browser builds also require:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Never commit credentials or local `.env` files.

## Development

```bash
bun install
bun run dev
```

## Production build

```bash
bun run build
npx wrangler deploy
```

## Security

- Service-role credentials are server-only.
- Application data is protected by Supabase RLS.
- Server functions validate authenticated callers and privileged operations.
- Authentication uses the external Supabase project.
