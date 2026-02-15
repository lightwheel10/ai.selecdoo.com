# Selecdoo v2 — ai.selecdoo.com

This is **v2** of the Selecdoo admin dashboard, a complete rewrite of the original project.

## V1 Reference

- **Project**: sal-dashboard
- **Location**: `C:\Users\paras\Projects\sal-dashboard`
- **Stack**: Vanilla HTML/JS/CSS + Supabase + Python backend
- **Status**: Production (legacy)

V2 replaces the v1 frontend entirely while maintaining compatibility with the same Supabase backend.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI | Tailwind CSS 4 + Radix UI + shadcn/ui |
| State | React 19 (local state, no global store yet) |
| i18n | next-intl (EN + DE) |
| Database | Supabase (SSR client via @supabase/ssr) |
| Toasts | Sonner |
| Icons | Lucide React |

## Project Structure

```
src/
├── app/
│   ├── dashboard/
│   │   ├── admin/          # Admin panel (shops, products, AI activity)
│   │   ├── monitoring/     # Store monitoring dashboard
│   │   ├── stores/         # Store management
│   │   ├── products/       # Product catalog
│   │   ├── jobs/           # Scrape jobs
│   │   ├── scrape/         # Scrape triggers
│   │   └── ai-content/     # AI-generated content
│   └── login/
├── components/
│   ├── ui/                 # shadcn/ui primitives
│   └── domain/             # Domain-specific components (StatusBadge, etc.)
├── lib/                    # Utilities, mock data, Supabase client
├── types/                  # TypeScript interfaces (domain.ts)
└── messages/               # i18n translations (en.json, de.json)
```

## Design System

- Dark theme with lime (#CAFF04) accent
- Monospace labels (`var(--font-mono)`) — uppercase, 9-11px, `tracking-[0.15em]`
- 2px borders, no border-radius (sharp edges)
- Status colors: green (success), red (error), orange (warning), gray (muted)

## Getting Started

```bash
npm install
npm run dev
```

Runs on `http://localhost:3000`. Requires a `.env.local` with Supabase credentials.

## Current Status

The UI is built with mock data. Backend integration (Supabase queries, API routes) is the next phase. Types and field names are designed to map 1:1 to Supabase columns for a smooth transition.
