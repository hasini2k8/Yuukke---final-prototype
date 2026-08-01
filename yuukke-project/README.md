# Yuukke

A marketplace web app for women entrepreneurs — storefronts, AI-assisted product listings, 3D product previews, and a full marketplace with cart/checkout/orders.

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or later (tested on v24)
- npm (comes with Node)

## 1. Install dependencies

```bash
npm install
```

## 2. Set up environment variables

Create a `.env` file in the project root:

```bash
TRIPO_API_KEY=
OPENAI_API_KEY=
ZERNIO_API_KEY=
PUBLIC_BASE_URL=
JSON2VIDEO_API_KEY=
```

| Variable | Used for | Where to get it |
|---|---|---|
| `TRIPO_API_KEY` | Generating rotatable 3D product previews from a photo (Tripo3D) | [developers.tripo3d.ai](https://developers.tripo3d.ai/) |
| `OPENAI_API_KEY` | Every AI feature — the listing chatbot, photo analysis, storefront/business-identity generator, social post captions, Ask Yuukke assistant (Chat Completions), and business logos/social post graphics (gpt-image-1). Server-side only — never exposed to the browser | [platform.openai.com](https://platform.openai.com/api-keys) |
| `ZERNIO_API_KEY` | Real, automated posting to Instagram and LinkedIn (see below) | [zernio.com](https://zernio.com/) |
| `PUBLIC_BASE_URL` | Zernio's OAuth redirect URI, and the public URL JSON2Video fetches a post's image from — set to your deployed app's URL; falls back to whatever host the request came in on, which only works once actually deployed (JSON2Video can't reach a bare `localhost`) | — |
| `JSON2VIDEO_API_KEY` | Turning a generated post image into a short video reel | [json2video.com](https://json2video.com/) |

The app still runs without these — the features that depend on them will show an error instead of failing to build. `.env` is gitignored; never commit it.

### Publishing to Instagram and LinkedIn

Real posting goes through [Zernio](https://zernio.com/), a social-posting API that already has Meta's and LinkedIn's platform approvals. This matters because a seller here is a small-business owner, not a developer — they shouldn't have to register their own app with each platform or generate an access token. Instead, on the Storefront tab, a seller clicks "Connect" next to Instagram or LinkedIn, which opens Zernio's own hosted login page (`server/zernioClient.js`) — they authorize the same way they'd normally log in, no tokens or developer terms ever shown, and our server never sees their password. Once connected, the AI (OpenAI Chat Completions for captions, gpt-image-1 for the image) drafts posts for that seller's own account, and each confirmed post is handed to Zernio with its scheduled date — Zernio's own infrastructure fires it for real at that time (`server/socialSchedule.js`), so it works even if this app's server isn't running at that exact moment. Images are uploaded directly from our server to Zernio's storage (not read from a public URL on our end), so this works from local dev too, not just once deployed.

**Cost: free for the first 2 connected accounts, no credit card.** Beyond that it's Zernio's own per-account pricing — no cost to run this app itself.

**One-time setup:** sign up at [zernio.com](https://zernio.com/) (free), go to Settings → API Keys, create a key, and set `ZERNIO_API_KEY` in `.env`. That's it — no per-platform developer app, no domain verification.

### Video reels

A seller can turn a generated post's image into a short video reel instead — the image becomes the background with the caption overlaid as text, rendered by [JSON2Video](https://json2video.com/) (`server/json2videoProxy.js`). JSON2Video fetches the image itself from `GET /api/posts/:id/image`, which is why that route is public (keyed only by the post's own unguessable id) rather than gated behind the seller header. **Requires `PUBLIC_BASE_URL` to actually be a publicly reachable URL** — this only works once deployed, not from a bare local dev server, since JSON2Video's servers can't reach `localhost`.

**One-time setup:** sign up at [json2video.com](https://json2video.com/), grab an API key, and set `JSON2VIDEO_API_KEY` in `.env`.

## 3. Run it

```bash
npm run dev
```

This starts two processes together:
- **Vite** — the frontend, at `http://localhost:5173` (or the next free port if that one's taken)
- **Backend proxy** — a local Node server on port `8791` that handles auth, cart, wishlist, orders, the product catalog, and the Tripo3D proxy. Vite forwards `/api/*` requests to it automatically.

Open the Vite URL printed in the terminal. Both processes need to be running for the app to fully work — if you only see 4 demo products on the marketplace with a "couldn't reach the product catalog" banner, the backend proxy isn't running (see Troubleshooting below).

## 4. Build for production

```bash
npm run build
```

Output goes to `dist/`. Note: the backend proxy (`server/index.js`) only runs locally — there's no production/serverless equivalent for it yet except the Tripo3D proxy (`api/tripo/[...path].js`, written for Vercel). Deploying the built frontend as-is means auth, cart, wishlist, orders, and the product catalog won't work until an equivalent backend is deployed too.

## Data storage

Products, user accounts, carts, wishlists, and orders are stored as local JSON files under `server/data/` (created automatically on first run). This persists across restarts as long as you're running on the same machine — it's not a real database, just a local dev/demo store.

## Troubleshooting

**"Couldn't reach the product catalog" banner, or `EADDRINUSE: address already in use :::8791`**
A previous `node server/index.js` process is still running and holding port 8791. Find and stop it:

```bash
# Windows PowerShell
Get-NetTCPConnection -LocalPort 8791 -State Listen | Select-Object OwningProcess
Stop-Process -Id <the ProcessId from above> -Force
```

```bash
# macOS/Linux
lsof -i :8791
kill <the PID from above>
```

Then run `npm run dev` again.

**AI features return an error**
Check that `OPENAI_API_KEY` is set in `.env` and restart `npm run dev`.

**3D preview generation fails**
Check that `TRIPO_API_KEY` is set in `.env` and restart `npm run dev`.

**"Connect" or scheduled posts fail**
Check that `ZERNIO_API_KEY` is set in `.env` and restart `npm run dev`.
