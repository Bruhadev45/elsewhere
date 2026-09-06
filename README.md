# ELSEWHERE

A standalone cinematic world-exploration concept. React, TypeScript, Vite, Framer Motion, and a lazily loaded Three.js planet studio.

## Run locally

```sh
npm install
npm run dev
```

Open http://127.0.0.1:4173/. `npm run build` checks TypeScript and produces the static site in `dist`. `npm test` checks the world catalog, local assets, and browser-storage validation.

## Experience

- Twelve original worlds with search, categories, and persistent favorites.
- A looping forest cinemagraph with pause control.
- Scroll-driven expanding portal, scenery parallax, split typography, world crossfades, and chapter progress.
- Studio with twelve presets, lighting and mist controls, procedural 3D planet, local saving/editing, and configuration export.
- Interactive atmosphere preview, conceptual pricing, tour, and FAQs.
- Responsive layouts, keyboard dialogs, and a reduced-motion alternative.

This is a working frontend concept. Prompts customize curated scenes; no generative backend, payments, accounts, or cloud storage are connected. Saved worlds stay in the current browser. The forest video is a locally rendered cinemagraph, not Google Flow footage. See ASSETS.md for media provenance and scripts/render_scenery_video.py for reproduction.

The project is isolated from GovCon and has no deployment configured.

## Design references

Mobbin MCP references inspected for visual composition:
- [KODE Immersive](https://mobbin.com/sites/sections/d2552c1b-4584-44c1-99d7-d73071d0edb0): oversized editorial type.
- [Lightship](https://mobbin.com/sites/sections/a5fa6838-ff45-42cc-8e90-b513fd69a5e7): expansive landscape and restrained overlay.
- [Savor](https://mobbin.com/sites/sections/094caaa7-65f0-434b-afb8-5b1a0c9d9226): framed imagery and negative space.

These were static reference captures. Scroll choreography is an original implementation using Framer Motion, not animation code supplied by Mobbin.
