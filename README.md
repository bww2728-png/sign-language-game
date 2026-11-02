# Static Web Starter

A minimal React 19, Vite, Tailwind CSS, and shadcn/ui starter for static web
experiences. It ships only frontend source and a Vite static build.

Use this starter for landing pages, public websites, dashboards, browser games,
local interactive tools, and frontend-only prototypes. Use the fullstack starter
instead when the first product workflow needs server APIs, persistence, users,
private data, roles, or background work.

## Commands

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm build
pnpm start
pnpm preview
pnpm format
```

## Structure

```text
index.html
public/
src/
  components/
  hooks/
  lib/
  pages/
  App.tsx
  main.tsx
  index.css
```

## Notes

- Keep app code in `src`.
- Import reusable UI primitives from `@/components/ui/*`.
- Keep global tokens and Tailwind setup in `src/index.css`.
- Keep local assets small. Large media should be hosted outside the project and
  referenced by URL.
- Do not add backend, database, auth, analytics, payments, or external services
  unless the requested product path needs them.
