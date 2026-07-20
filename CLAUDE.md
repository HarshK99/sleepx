@AGENTS.md

# SleepX

A minimal-clicks sleep tracker. Next.js (App Router) + Neon Postgres (Drizzle) + Vercel.

Before doing any non-trivial work, read:
- [docs/PRD.md](docs/PRD.md) — what the product is, MVP scope, what's explicitly out of scope
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — directory map, data model, and the module boundaries that keep this codebase from growing duplicate logic
- [docs/PLAN.md](docs/PLAN.md) — the phase-wise build order; work through it in sequence rather than jumping to UI polish before the data layer exists

## Non-negotiables

- **Minimal clicks**: the core "log a night's sleep" flow is the product. Don't add fields, steps, or confirmations to it without checking against the PRD.
- **The entry form is always on screen, by default.** Never gate it behind an "Add entry" button, FAB, modal, or collapsed bottom sheet — that's an extra click the PRD explicitly forbids.
- **Mobile-first**: design/build for a ~375–430px viewport first, single column, thumb-reachable primary action, no hover-dependent interactions. Widen up to desktop after, never the reverse.
- **No duplicated logic**: duration math lives only in `lib/sleep/duration.ts`, DB access only in `lib/sleep/queries.ts`. See ARCHITECTURE.md's conventions checklist before adding a new function.
- **UI is placeholder for now**: build clean, functional components — the project owner will refine visuals piece by piece later. Don't over-invest in polish speculatively.
- This Next.js version differs from training data — check `node_modules/next/dist/docs/` for App Router APIs (Server Actions, caching, etc.) before assuming behavior.
