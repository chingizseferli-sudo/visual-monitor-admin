# Visual Monitor

Professional media monitoring, communication intelligence and PR analytics platform.

Visual Monitor provides two Release 1 monitoring products:

- Keyword Monitor: tracks newly published news across managed media sources and matches customer keywords.
- Change Monitor: watches a manually selected page area and reports newly detected items.

## Production Entry Points

- Admin panel: `/admin`
- Customer portal: `/monitor`
- Sign in: `/sign-in`
- Health check: `/health`

## Tech Stack

- React
- Vite
- TanStack Router
- Supabase Auth, Database and Edge Functions
- Tailwind CSS and shadcn/ui components

## Local Development

```bash
pnpm install
pnpm run dev
```

## Production Build

```bash
npm run build -- --logLevel error
```

## Required Frontend Environment Variables

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_TELEGRAM_BOT_USERNAME=
```

Do not commit local `.env` files or secret keys.