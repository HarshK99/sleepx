@AGENTS.md

# SleepX

A minimal-clicks sleep tracker. Next.js (App Router) + Neon Postgres (Drizzle) + Vercel.

Before doing any non-trivial work, read:
- [docs/STATUS.md](docs/STATUS.md) — where the build is now and which phase is next
- [docs/product_sense.md](docs/product_sense.md) — goal, user, pains, success measure
- [docs/PRD.md](docs/PRD.md) — what the product is, MVP scope, what's explicitly out of scope
- [docs/design.md](docs/design.md) — the look: Dawn sky direction, tokens, screens and states
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — directory map, data model, and the module boundaries that keep this codebase from growing duplicate logic
- [docs/PLAN.md](docs/PLAN.md) — the phase-wise build order; one phase per chat, started with `start phase N`

## Non-negotiables

- **Minimal clicks**: the core "log a night's sleep" flow is the product. Don't add fields, steps, or confirmations to it without checking against the PRD.
- **The entry form opens by default, every new session.** It's a bottom sheet (`SleepEntrySheet`) that's open with zero clicks the first time you land in a session; closing it (× or backdrop tap) is remembered only for that `sessionStorage`-scoped session, reopened via the + FAB. This is a deliberate, explicit reversal of an earlier stricter rule ("never gate behind a FAB/bottom sheet") — see PRD.md §3/§6 for the current reasoning, don't revert to the old rule without checking there first.
- **Mobile-first**: design/build for a ~375–430px viewport first, single column, thumb-reachable primary action, no hover-dependent interactions. Widen up to desktop after, never the reverse.
- **No duplicated logic**: duration math lives only in `lib/sleep/duration.ts`, DB access only in `lib/sleep/queries.ts`. See ARCHITECTURE.md's conventions checklist before adding a new function.
- **The look is Dawn sky** ([docs/design.md](docs/design.md)): every UI change uses its tokens (`app/globals.css`, through their Tailwind names; never raw `gray-*`/`blue-*`/`dark:` utilities) and stays inside its direction. One look, no dark mode. The owner refines pieces individually within it; breaking the direction means revisiting design.md on purpose.
- This Next.js version differs from training data — check `node_modules/next/dist/docs/` for App Router APIs (Server Actions, caching, etc.) before assuming behavior.
