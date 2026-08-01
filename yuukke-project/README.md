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
VITE_GEMINI_API_KEY=
OPENAI_API_KEY=
ZERNIO_API_KEY=
```

| Variable | Used for | Where to get it |
|---|---|---|
| `TRIPO_API_KEY` | Generating rotatable 3D product previews from a photo (Tripo3D) | [developers.tripo3d.ai](https://developers.tripo3d.ai/) |
| `VITE_GEMINI_API_KEY` | All *text* AI features — the listing chatbot, photo analysis, storefront/business-identity generator, social post captions, Ask Yuukke assistant | [Google AI Studio](https://aistudio.google.com/apikey) |
| `OPENAI_API_KEY` | Image generation — business logos and social post graphics (gpt-image-1). Server-side only, unlike the other keys above — never exposed to the browser | [platform.openai.com](https://platform.openai.com/api-keys) |
| `ZERNIO_API_KEY` | Real, automated posting to Instagram/LinkedIn/Pinterest (see below) | [zernio.com](https://zernio.com/) |

The app still runs without these — the features that depend on them will show an error instead of failing to build. `.env` is gitignored; never commit it.

### Publishing to Instagram, LinkedIn, and Pinterest

Real posting goes through [Zernio](https://zernio.com/), a social-posting API that already has Meta/LinkedIn/Pinterest approval. This matters because a seller here is a small-business owner, not a developer — they can't be expected to register their own app with each platform or generate an access token. Instead, on the Storefront tab, a seller types their Instagram handle and clicks one "Connect my accounts" button, which opens Zernio's own hosted login page — they authorize the same way they'd normally log in, no tokens or developer terms ever shown. Pinterest and LinkedIn can be connected the same way via the small badge buttons next to Instagram's. Posts generated in the Social calendar are scheduled with Zernio automatically (`scheduledFor`), so they publish themselves for real at the scheduled time — Zernio's own infrastructure fires them, not this app, so it works even if the local dev server isn't running at that exact moment. Images are uploaded directly from our server to Zernio's storage (not read from a public URL on our end), so this works from local dev too, not just once deployed.

**Cost: free for the first 2 connected accounts, no credit card.** Beyond that it's $6/account/month (accounts 3–10), dropping to $3/account (11–100) — no monthly base fee, no contract.

**One-time setup:** sign up at [zernio.com](https://zernio.com/) (free), go to Settings → API Keys, create a key, and set `ZERNIO_API_KEY` in `.env`. That's it — no domain verification or key-pair setup needed.

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
Check that `VITE_GEMINI_API_KEY` is set in `.env` and restart `npm run dev` (Vite only reads `.env` on startup).

**3D preview generation fails**
Check that `TRIPO_API_KEY` is set in `.env` and restart `npm run dev`.

**"Connect my accounts" or scheduled posts fail**
Check that `ZERNIO_API_KEY` is set in `.env` and restart `npm run dev`.
