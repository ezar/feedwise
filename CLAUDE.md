# feedwise

Lector de noticias personal con filtrado por IA.
El usuario describe en lenguaje natural lo que quiere leer.
Claude extrae temas, genera feeds de Google News, y puntúa
cada artículo por relevancia.

## Stack
- Next.js 14 App Router + TypeScript estricto
- Supabase (Auth + PostgreSQL + RLS)
- Upstash QStash (cron/queue — reemplaza Vercel cron en plan Hobby)
- Tailwind CSS + shadcn/ui (componentes en components/ui/)
- next-intl (ES / EN)
- Vitest, pnpm

## Comandos
- pnpm dev
- pnpm build
- pnpm test
- pnpm lint
- pnpm type-check
- pnpm supabase start
- pnpm supabase db push

## Patrones clave
- lib/supabase/server.ts y client.ts — clientes Supabase (server y browser)
- QStash autentica con verifySignatureAppRouter (no CRON_SECRET)
- Un schedule QStash por feed: se crea al insertar, se borra al eliminar
- qstash_schedule_id se guarda en tabla feeds para poder borrarlo después
- Claude Sonnet (claude-sonnet-4-5) para extracción de temas (1 vez al crear feed)
- Claude Haiku (claude-haiku-4-5) para scoring de artículos (barato, rápido)
- Google News RSS: https://news.google.com/rss/search?q=QUERY&hl=es&gl=ES&ceid=ES:es
- feed_type: 'manual' | 'topic'
- user_profile se crea automáticamente vía trigger on_auth_user_created

## Estructura
- app/(auth)/ — login y register (rutas públicas)
- app/(dashboard)/ — feed principal, feeds, saved, settings (protegidas)
- app/api/ — feeds, articles, opml/import, jobs/fetch-feeds, profile
- lib/ai/ — topic-extractor.ts (Sonnet), scorer.ts (Haiku)
- lib/rss/ — parser.ts, google-news.ts
- lib/qstash/ — client.ts, scheduler.ts
- components/ui/ — componentes shadcn/ui manuales
- supabase/migrations/ — 3 migraciones SQL

## Variables de entorno
Ver .env.example
