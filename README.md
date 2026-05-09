# Feedwise

Personal RSS news reader with AI-powered relevance filtering.

You describe in natural language what you want to read. Claude extracts topics, generates Google News RSS feeds, and scores each article by relevance — so your feed only shows what actually matters to you.

## Features

- **AI feed generation** — describe your interests in plain language, Claude generates Google News RSS queries automatically
- **Relevance scoring** — every article is scored 0–100 by Claude Haiku against your interests; set a threshold to filter out noise
- **Reader modal** — distraction-free reading with focus mode, adjustable font size, AI summary, and highlights
- **Daily briefing** — Claude synthesises your top articles into a structured daily digest with source links
- **Chat with your feeds** — ask questions about articles from the last 14 days, with full conversation memory
- **Engagement stats** — reading streak, hourly patterns, per-feed depth (open rate, save rate, avg score)
- **Deduplication** — similar articles from different sources are grouped automatically
- **OPML import** — migrate from Feedly or any other reader
- **Push notifications** — get notified when high-score articles arrive
- **PWA-ready** — installable on mobile, swipe gestures to save/mark read
- **i18n** — Spanish and English

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 App Router + TypeScript |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| Queue / Cron | Upstash QStash |
| AI | Anthropic Claude (Sonnet for feed generation, Haiku for scoring) |
| Styling | Tailwind CSS + shadcn/ui |
| i18n | next-intl |
| Testing | Vitest |

## Getting started

```bash
pnpm install
cp .env.example .env.local   # fill in your keys
pnpm supabase start          # local Supabase instance
pnpm supabase db push        # apply migrations
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

See `.env.example` for the full list. Required:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
QSTASH_TOKEN
QSTASH_CURRENT_SIGNING_KEY
QSTASH_NEXT_SIGNING_KEY
```

## Project structure

```
app/
  (auth)/          # login, register
  (dashboard)/     # feed, feeds, saved, profile, stats, briefing, ia, chat
  api/             # REST endpoints
components/
  articles/        # ArticleCard, ArticleRow, ReaderModal, ShareButton…
  briefing/        # BriefingPanel
  chat/            # ChatInterface
  feeds/           # FeedList, FeedForm, TopicInput…
  layout/          # Sidebar, MobileNav
  stats/           # ReadingStats
lib/
  ai/              # topic-extractor.ts (Sonnet), scorer.ts (Haiku)
  rss/             # parser.ts, google-news.ts
  qstash/          # client.ts, scheduler.ts
  supabase/        # server.ts, client.ts
supabase/
  migrations/      # 14 SQL migrations
```

## Key commands

```bash
pnpm dev           # development server
pnpm build         # production build
pnpm test          # Vitest
pnpm lint          # ESLint
pnpm type-check    # tsc --noEmit
pnpm supabase db push   # apply pending migrations
```
