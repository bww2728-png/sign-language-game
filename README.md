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
  referenced by URL, except on-device inference assets that prevent sending camera
  frames to a third party.
- Do not add backend, database, auth, analytics, payments, or external services
  unless the requested product path needs them.

## Camera Recognition

Camera frames are processed in the browser by MediaPipe Hand Landmarker. The app does not request audio, save frames, or send camera data to a server. Camera permission is requested only after the player starts the camera, and the session stops when the game view is closed.

The 28-letter baseline classifier was generated from the 6,299 valid letter samples in **ArSL-31-Pilot: Arabic Sign Language (ArSL) Dataset**, by Youssef Farhan and Abdessalam Ait Madi, [Zenodo record 18363162](https://doi.org/10.5281/zenodo.18363162), licensed CC BY 4.0. The dataset describes samples extracted from personal video recordings and does not provide signer identities; its samples are not an independent signer evaluation and do not establish real-world accuracy. The classifier is a nearest-landmark baseline, not a production-grade recognition claim.

The hand landmark runtime and `hand_landmarker.task` model are provided by MediaPipe under Apache 2.0. The added Ra, Zay, and Zha reference crops are from the ArASL chart by Ghazanfar Latif, Jaafar Alghazo, Nazeeruddin Mohammad, Roaa AlKhalaf, and Rawan AlKhalaf, [Mendeley Data 10.17632/y7pckrw6z2.1](https://doi.org/10.17632/y7pckrw6z2.1), CC BY 4.0.

Players may explicitly save normalized 21-point hand coordinates in browser IndexedDB to personalize the current device's predictions. This is off by default; the player can export or erase those samples. Exports are manual and are never uploaded by the app.

To regenerate the compact classifier from the cited CSV:

```bash
python3 scripts/build-arsl-model.py path/to/ArSL_dataset.csv public/models/arsl_landmarks.bin
```
