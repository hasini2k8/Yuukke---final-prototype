# Frontend-only Vercel + External Backend Deployment

This setup deploys Vercel as a static Vite frontend only. It does not deploy or call Vercel API functions. Yuukke's Node backend runs separately and every generated storefront is served from the same Vercel deployment.

## Resulting architecture

```text
yuukke.com                         Marketplace and seller application on Vercel
business-slug.yuukke.com           Generated business storefront on Vercel
yuukke-backend.onrender.com        Node API hosted outside Vercel
/var/data/yuukke.db                Persistent SQLite database on the backend disk
```

## 1. Rotate the exposed Postiz key

An earlier `.env.example` contained a real-looking Postiz key. Revoke it in Postiz under **Settings → Developers → Public API**, create a replacement, and enter the replacement only in the backend host's secret environment settings. Never put it in a `VITE_` variable.

## 2. Deploy the external backend

The repository-root `render.yaml` is a Render Blueprint. It builds `yuukke-project/Dockerfile.backend`, starts `server/index.js`, mounts a persistent disk at `/var/data`, and checks `/health`.

1. In Render, create a new Blueprint from the GitHub repository.
2. Approve the `yuukke-backend` service and persistent disk.
3. Set these secret environment variables:

```text
OPENAI_API_KEY=...
POSTIZ_API_KEY=...
GEMINI_API_KEY=...
TRIPO_API_KEY=...
FRONTEND_ORIGINS=https://your-project.vercel.app,https://yuukke.com,https://www.yuukke.com
CORS_ROOT_DOMAIN=yuukke.com
```

4. Keep `YUUKKE_DATA_DIR=/var/data` and `POSTIZ_API_URL=https://api.postiz.com/public/v1` as configured by the Blueprint.
5. Verify `https://yuukke-backend.onrender.com/health` returns `{ "ok": true }`.

The persistent disk makes SQLite suitable for this single-instance prototype. For multiple backend instances or serverless scaling, migrate the store modules to hosted PostgreSQL.

## 3. Deploy the static frontend to Vercel

1. Import the GitHub repository into Vercel.
2. Set **Root Directory** to `yuukke-project`.
3. Vercel should detect Vite. The build command is `npm run build` and output directory is `dist`.
4. Add these frontend environment variables:

```text
VITE_API_BASE_URL=https://yuukke-backend.onrender.com
VITE_STOREFRONT_DOMAIN=yuukke.com
```

5. Do not add OpenAI, Postiz, Gemini or Tripo keys to Vercel. Those secrets belong only on the external backend.
6. Deploy. The included `vercel.json` sends client routes to `index.html` and does not define API functions.

`VITE_` variables are compiled into the browser bundle, so only public URLs and domain names belong in them.

## 4. Configure storefront subdomains

1. Add `yuukke.com` to the Vercel project.
2. Add the wildcard domain `*.yuukke.com` to the same project.
3. Configure the DNS records or use Vercel nameservers as directed by the Vercel domain screen.
4. Keep `VITE_STOREFRONT_DOMAIN=yuukke.com` and redeploy after changing it.

When an entrepreneur publishes a storefront with slug `artisan-haven-a1b2c3`, Yuukke displays:

```text
https://artisan-haven-a1b2c3.yuukke.com
```

The frontend reads the hostname, extracts the slug, requests `/api/site/public/artisan-haven-a1b2c3` from `VITE_API_BASE_URL`, and renders the matching website. No new Vercel project or Vercel API call is created for the entrepreneur.

## 5. Local development

Leave both frontend deployment variables blank in `.env`:

```text
VITE_API_BASE_URL=
VITE_STOREFRONT_DOMAIN=
```

Then run:

```bash
npm run dev
```

Vite proxies relative `/api` calls to the local Node server and published sites continue to work at `/site/:slug`.

## Production notes

- Website edits update immediately because storefronts read the external database; they do not require a Vercel redeployment.
- Public storefront view analytics are recorded by the external backend.
- Instagram analytics, Postiz scheduling, AI generation and poster storage remain server-side.
- Wildcard storefronts share one frontend codebase and deployment.
- Custom customer-owned domains can be added manually in Vercel later. Automating arbitrary domain creation would require a provider API or a separate DNS/domain-management service.
