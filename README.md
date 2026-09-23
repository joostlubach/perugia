# Perugia Quiz Party 🇮🇹

A Kahoot-style live quiz for the reunion: one big screen (TV) driving the game, everyone else answers on their phone.

## Stack

- `server/` — NestJS API (rooms, questions, scoring)
- `web/` — React + Vite frontend, both host (TV) and player (phone) UI
- `api/index.js` — thin Vercel serverless entry that wraps the compiled Nest app
- Single Vercel deployment serves both: static site + `/api/*` functions

## How it works

- Host creates a room from `/host`, gets a 5-letter code + QR code, shows it on the TV.
- Players go to `/play` on their phones, enter the code + their name.
- Host clicks through: Start → (question countdown, auto-reveals when time's up or host clicks early) → Reveal → Leaderboard → next question → ... → Final results/podium.
- Sync between host and players is done by polling (every ~1–1.2s), not WebSockets — this keeps it fully compatible with Vercel serverless functions, at the cost of ~1s of latency, which is unnoticeable for this kind of game.
- Only "multiple choice / single correct answer" questions are supported for now, matching what you asked for. The types (`server/src/game/types.ts`) are structured so more question types can be added later.

## Local development

```bash
npm install
npm run dev
```

This runs the Nest API on `http://localhost:3001` and Vite on `http://localhost:5173` (which proxies `/api` to the Nest server). Open `http://localhost:5173`.

## Customizing questions

On the host setup screen there's a "Customize Questions" option where you can paste a JSON array of questions before creating the room — no code changes needed. Default questions live in `server/src/game/questions.sample.ts` if you want to edit the defaults directly instead.

Each question looks like:

```json
{
  "type": "multiple_choice",
  "text": "Perugia is the capital of which region?",
  "options": ["Tuscany", "Umbria", "Lazio", "Marche"],
  "correctIndex": 1,
  "timeLimitSec": 20,
  "points": 1000
}
```

## Audio

Files live in `web/public/audio/`. I sourced free, public-domain / CC0 clips for you (see `web/public/audio/SOURCES.md` for exact sources/licenses — worth a quick look before Friday, but they're all either CC0 or a pre-1970s public-domain recording, fine for private personal use):

- `background-tarantella.mp3` — a genuine old Tarantella Napoletana recording, loops during the lobby
- `correct.mp3` / `incorrect.mp3` — answer feedback stings
- `reveal.mp3` — drumroll before showing the right answer
- `victory.mp3` — fanfare for the final podium
- `funny-sting.mp3` — a goofy slide-whistle sound

I did **not** bundle an actual Mario/Nintendo sound clip — that's real copyrighted game audio and not something I'll go source and embed, even for personal use. If you want an actual "Mariooo" sound, just drop your own mp3 in as `web/public/audio/funny-sting.mp3` (same filename) and it'll get used automatically.

## Deploying to Vercel

1. Push this repo to GitHub (or run `vercel` from this folder directly).
2. Import the project in Vercel. The root `vercel.json` already tells it how to build both the API function and the static site — no manual config needed.
3. **Recommended:** add a free Redis integration (Vercel dashboard → your project → Storage → Marketplace → any "Redis"/Upstash option) so game state is stored reliably instead of in each serverless function's memory. Without it, the app still works (falls back to in-memory state), but state can behave inconsistently if Vercel spins up multiple instances of the function under load — riskier for a live event with lots of phones polling at once. The code auto-detects either the legacy `KV_REST_API_URL`/`KV_REST_API_TOKEN` or newer `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` env vars, whichever the integration sets.
4. Deploy. The site and API are served from the same domain, so there's nothing else to wire up.

## Notes / things worth knowing

- Room state expires after 12h when using Redis; the in-memory fallback just lives as long as the function stays warm.
- Host and player sessions are remembered in `localStorage`, so a refreshed phone/TV tab rejoins the same room automatically.
- There's a mute button (top-right) on both host and player screens.
