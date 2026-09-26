# Diplomaps: rules for future sessions

Diplomaps is a browser diplomacy game for a "map"-themed hackathon. The player rules **the Crossing**, a small
neutral valley at the centre of a generated map, surrounded by five AI-driven nations (Varrow, Kelm, Sael,
The Tarn, Ostrin). Tagline: **"Start a war without firing a shot."** Judges play it alone from a hosted link:
it must look great, explain itself, and never freeze.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server **and** the API (handlers mounted by `server/vitePlugin.ts`). Reads `.env.local`. |
| `npm run typecheck` | `tsc` over the app, server and node projects (all strict). |
| `npm run lint` | ESLint (flat config). Engine purity rules live here. |
| `npm run simulate` | 200 headless games with random valid actions; prints balance stats. |
| `npm run build` | Typecheck, then `vite build` to `dist/`. |
| `npm run preview` | Serve the production build, with the API mounted. |
| `npm run playtest` | Plays a full game through the UI with Playwright against a running dev server (`BASE=...` to point elsewhere). |

Typecheck, lint and simulate must pass before every commit.

## Art direction (non-negotiable)

The player looks down at **a war table in a candlelit strategy room at night**: a hand-inked parchment map on
dark wood, surrounded by objects (sealed letters, carved army tokens, ink pot, coin purse, bell, candle).
Warm, dim, tense. Tabletop board game meets old atlas.

Do:
- Full-screen, no page scroll. The table and map fill the viewport (works from 1280x720 up).
- The map is the hero: organic inked regions, ragged coast, sea, mountains, river, dashed roads.
- UI elements are **objects on the table**: parchment sheets, wax seals, scrolls, coins, candles.
- Fonts: Cinzel / Cinzel Decorative / IM Fell English SC for headings, EB Garamond for body, IM Fell English for
  handwriting. Tokens live in `src/styles/index.css` (`@theme`).
- Candlelight glow, vignette, subtle flicker, drifting cloud shadows, sea shimmer. Things move: tokens slide,
  parchment slides in, chronicle entries ink themselves in, rumour trails glow along roads.
- Waiting states are in-world ("A rider sets out for Varrow...", a wax seal pressing, ink drying).
- Respect `prefers-reduced-motion`. Keep 60fps: animate transforms/opacity, avoid live SVG filters on big areas.

Don't:
- No landing-page layouts, hero headlines, marketing copy.
- **No sans-serif fonts anywhere** (the Tailwind sans/mono families are remapped to serif).
- No flat cards, rounded SaaS buttons, pill badges, chat bubbles, dashboard sidebars, spinners.
- No grid-of-rectangles map. No bright saturated colours: nation colours are muted inks and dyes.

## Architecture

```
src/engine   pure TypeScript game logic: types, schema (Zod), rng, mapgen, resolve, battles, gossip,
             economy, tension, endings, views (AI context builders), config (ALL tunable numbers)
src/store    worldStore.ts (Zustand): the single store and auto-save; orchestration (audiences, season turns,
             ending) lives in src/store/flow.ts
src/ai       client.ts: typed fetch wrappers for /api, including NDJSON stream reading
src/ui       table/, map/, hud/, panels/, audience/, screens/, common/
src/audio    sound.ts (Howler; missing files fail silently)
src/data     nations.json (hand-written personalities, goals, red lines, grudges)
server       handlers/ (plain Web Request -> Response functions), prompts/ (one file per prompt type,
             prompts/nations/* per-nation voice), openai.ts (client, retries, circuit breaker, usage log),
             rateLimit.ts, http.ts, manipulation.ts, replyParser.ts (incremental JSON for streamed replies),
             vitePlugin.ts (dev/preview API), assetManifest.ts (virtual:diplomaps-assets)
api          thin Vercel Function wrappers re-exporting server/handlers
scripts      simulate.ts
```

Rules:
- **The engine is pure**: no React, no network, no DOM, no Node APIs, and **no `Math.random`** (use `Rng` from
  `src/engine/rng.ts`; its state is stored in `WorldState.rng`). ESLint enforces this for `src/engine/**`.
- `WorldState` must stay fully JSON-serialisable (it is saved to localStorage).
- Every tunable number goes in `src/engine/config.ts`.
- Server-side relative imports use explicit `.js` extensions (Node ESM on Vercel needs them).
- All AI output is validated with Zod and bounded by the `sanitize*` helpers in `src/engine/schema.ts`.

## AI rules (OpenAI)

- OpenAI is called **only on the server** (`server/openai.ts`), via the **Responses API**. Structured outputs use
  Zod schemas (`zodTextFormat`), audience replies stream as NDJSON.
- Models from env: `MODEL_FAST` (default `gpt-5.6-luna`) for audiences, actions, extraction; `MODEL_RICH`
  (default `gpt-5.6-terra`) for chronicle, verdicts, epilogue. Reasoning effort is kept low for latency.
- **The server builds every prompt** from structured game data. Never accept raw prompts, system text or
  free-form context from the browser. The only free text accepted is the player's own audience messages
  (length-capped and cleaned). News is sent as structured items and rendered to text on the server.
- Personalities live in `server/prompts/nations/*.ts` so they can be tuned without touching code.
- Manipulation resistance: attempts to break character ("ignore your rules", "you are now...") are treated as a
  bizarre insult; the ruler stays in character and the trust delta is forced negative. Only structured outputs
  change game state, never reply text.
- Reliability: every call has a timeout (audience 25s, others 20s), one retry, then an in-world fallback
  (action -> `wait` "watches and waits"; extraction -> empty; chronicle -> template; audience -> the ruler is
  called away). Output tokens are capped on every call. Per-IP rate limit (60/min). Token usage is logged per call.
- **Never print, log or commit the API key.** `.env*` is git-ignored except `.env.example`.

## Gotchas

- The map is split into a **static SVG** (`StaticMap`, re-rendered only when ownership changes) and a light dynamic
  SVG (hover, tokens, season effects). Keep per-frame work out of the static layer. Hover state is read inside
  `MapView`, not the table, so mouse movement never re-renders the whole screen.
- Noise textures are SVG data URIs in `src/styles/index.css`. Every `<filter>` needs `x='0' y='0' width='100%' height='100%'`
  and `stitchTiles='stitch'`, or the tiles show seams.
- Optional art and audio are discovered at build time through `virtual:diplomaps-assets`; missing files are never fetched.
- Several dev servers on one checkout share `node_modules/.vite` and can serve "Outdated Optimize Dep" 504s to each
  other. Run one at a time.
- Balance targets: with a passive player, first war should usually fall in seasons 4-5 (`npm run simulate`).
