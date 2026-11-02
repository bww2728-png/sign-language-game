# Agent Guide

This repository is a static web starter. Keep changes client-first, portable,
and free of placeholder product assumptions.

## Starter Shape

- The running application intentionally has no demo business domain.
- There is no product API, database, authentication layer, or external service.

## Stack

- Vite, React, and TypeScript
- Tailwind CSS
- Wouter for lightweight client-side routing
- shadcn/ui components built on Radix UI
- pnpm

## Project Conventions

- Put route-level pages in `src/pages/`.
- Put reusable application components in `src/components/`.
- Treat `src/components/ui/` as editable shadcn/ui primitives.
- Put reusable hooks in `src/hooks/` and general utilities in `src/lib/`.
- Use the `@/` alias for imports from `src/`.
- Keep global styles and design tokens in `src/index.css`.
- This starter uses Tailwind CSS v4 theme variables. Do not use Tailwind v3
  color syntax such as `hsl(var(--primary))` or `hsl(var(--sidebar-border))`.
- Prefer semantic Tailwind classes such as `bg-primary`, `text-foreground`,
  `border-border`, and opacity modifiers like `bg-primary/10` for themed UI.
- For inline styles, SVG, canvas, charts, and dynamic colors, use complete CSS
  color values such as `var(--primary)`, `var(--color-blue-600)`, `rgb(...)`,
  hex values, or `color-mix(...)`. Use explicit domain colors for game pieces
  and other non-theme visuals.
- Do not create a `server/` directory for static hosting. Frontend deployment is
  handled by the platform.

## Layer Decision Guide

| Product need                                         | Minimum implementation surface                               |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| Static page or local interaction                     | `src/pages/` and reusable components                         |
| Browser game or local tool                           | Client state, browser APIs, and focused components           |
| Public API data                                      | Fetch directly from the browser if CORS and secrets allow it |
| Product API, persistence, users, private data, roles | Switch to the fullstack starter                              |

## Scope

- Do not add backend APIs, database tables, auth, analytics, payments, email,
  webhooks, scheduled work, or external services without an explicit product
  need.
- Avoid adding dependencies when the existing stack or browser APIs are enough.
- Preserve responsive behavior and keyboard accessibility when changing UI.

## Commands

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm check
pnpm lint
pnpm build
pnpm start
pnpm preview
pnpm format
```

## Before Finishing

For most code changes, run:

```bash
pnpm check
pnpm build
```
