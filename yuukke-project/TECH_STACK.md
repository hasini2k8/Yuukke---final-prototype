# Yuukke Technology Stack

This document explains the technologies used by the Yuukke final prototype and why each one was selected.

## Frontend

| Technology | Where it is used | Why it is used |
|---|---|---|
| React 19 | Marketplace, seller dashboard, onboarding, product listing, storefront studio, brand workbench, calendar, analytics, cart and checkout | Component-based UI makes complex interactive workflows easier to maintain and reuse. |
| React Router 7 | Marketplace, product details, orders and public `/site/:slug` storefront URLs | Provides client-side navigation while preserving shareable public URLs. |
| Vite 8 | Development server, API proxy and production build | Fast startup and updates during development with a straightforward optimized build pipeline. |
| Lucide React | Navigation and action icons | A consistent, lightweight and accessible visual language. |
| Three.js | Browser-based 3D rendering | Displays generated 3D product models and spatial previews. |
| React Three Fiber | React integration for Three.js | Allows 3D scenes to be managed as React components. |
| Drei | 3D helpers and controls | Reduces custom code for cameras, loading and interaction. |
| Gaussian Splats 3D | Spatial product and room previews | Supports rich scene reconstruction and experimental AR-style placement. |
| Web Speech API | Microphone input and read-aloud controls | Gives entrepreneurs a voice-first alternative to typing. |
| Google Translate widget | Interface translation | Adds quick multilingual access without maintaining separate translation files for every screen. |
| Responsive inline design system | Storefront and dashboard layouts | Keeps the prototype consistent across desktop and smaller screens without a heavy UI framework. |

## Backend

| Technology | Where it is used | Why it is used |
|---|---|---|
| Node.js | Local application server and integration layer | Uses the same JavaScript language as the frontend and supports native web APIs such as `fetch`, `FormData` and `Blob`. |
| Native Node HTTP server | REST endpoints for accounts, products, sites, posts, analytics, posters, cart, wishlist and orders | Keeps the prototype lightweight and makes every request path explicit. |
| Modular store layer | `authStore`, `productStore`, `siteStore`, `postStore`, `analyticsStore`, `posterStore` and commerce stores | Separates persistence and ownership rules from request handling. |
| Server-side proxy modules | OpenAI, Postiz, Tripo3D and Google video calls | Keeps billable API keys outside the browser and normalizes external errors. |
| Vercel serverless functions | OpenAI and Tripo routes prepared under `api/` | Provides deployable secret-holding endpoints for supported integrations. |

## Database and persistence

| Technology | Data stored | Why it is used |
|---|---|---|
| SQLite through `node:sqlite` | Users, sessions, products, storefronts, posts, carts, wishlists, orders, analytics and AI poster assets | A real relational database with no separate database server, ideal for a local prototype. |
| WAL mode | SQLite read/write coordination | Improves reliability when the UI performs overlapping reads and writes. |
| Foreign keys | Product-linked posters, cart items, wishlist items and order relationships | Protects relationships between seller-owned records. |
| JSON columns stored as text | Brand guidelines, storefront sections, dimensions, connections and characters | Preserves flexible structured AI output while keeping core entities relational. |
| Daily analytics tables | Instagram metrics and public-storefront views | Retains historical performance so graphs and future marketing decisions survive refreshes. |
| Product poster table | AI poster image, product relationship, prompt, format and creation date | Creates a reusable per-business marketing asset library. |

SQLite is durable for local and single-server use. A production serverless deployment should migrate these tables to managed PostgreSQL or another persistent hosted database because serverless local disks are not durable.

## Authentication and security

| Technology | Purpose | Why it is used |
|---|---|---|
| Scrypt password hashing | Protect account passwords | A memory-hard password derivation function is safer than storing reversible passwords. |
| Random salts | Ensure identical passwords do not create identical hashes | Limits precomputed hash attacks. |
| Cryptographically random bearer sessions | Authenticate API requests | Supports per-user data boundaries without exposing passwords after login. |
| Server-side seller ownership checks | Scope products, sites, posts, posters and analytics | Prevents one entrepreneur from modifying another business's records. |
| Server-only environment variables | Store OpenAI, Postiz, Tripo and Gemini credentials | Prevents secret API keys from being bundled into browser JavaScript. |

## Artificial intelligence

| Service or model | Features | Why it is used |
|---|---|---|
| OpenAI text models | Product-listing conversation, structured extraction, description rewriting, document understanding, storefront generation, calendar commands, brand guidelines, captions and marketing decisions | Strong natural-language and structured-JSON capabilities support typed and spoken entrepreneur workflows. |
| OpenAI vision input | Document reading, photo checks and product-image understanding | Lets the application reason about uploaded business documents and product imagery. |
| OpenAI `gpt-image-1` | Logos, brand characters, social advertisements and product posters | Produces branded visual assets and can use the entrepreneur's product photo as a reference through image editing. |
| Google Gemini Veo | Image-to-video social reels | Animates a generated product advertisement into short promotional video content. |
| Tripo3D | Product-photo-to-3D conversion | Creates rotatable product previews from ordinary seller photographs. |

## Social publishing and analytics

| Technology | Features | Why it is used |
|---|---|---|
| Postiz Public API | Channel discovery, media upload, Instagram and LinkedIn scheduling, background publishing and Instagram post analytics | Uses the entrepreneur's subscribed scheduling service instead of requiring Yuukke to maintain separate social-network credentials and job infrastructure. |
| Yuukke calendar database | Editable drafts, dates, times, stable post numbers and publishing status | Keeps the seller's planning state independent from the delivery provider. |
| Instagram analytics snapshots | Views/impressions, likes, comments and shares | Allows performance graphs and evidence-based creative recommendations. |
| Public storefront counters | Daily website page views | Shows whether social attention is reaching the business website. |
| Saved marketing strategies | Evidence-based instructions supplied to later AI advertisement calls | Makes future campaigns learn from the business's own performance rather than generating every post without context. |

## Media and asset flow

1. The entrepreneur uploads a real product photograph during listing creation.
2. The product and image are stored under the authenticated seller.
3. The storefront displays only that seller's saved products.
4. OpenAI image editing uses the selected listing image as the source of truth for an advertisement or brand poster.
5. Product posters are stored in SQLite and remain available in the Brand Workbench.
6. An image advertisement can be animated into a video reel through Veo.
7. Approved media is uploaded to Postiz and scheduled for Instagram or LinkedIn.
8. Postiz analytics and storefront views are saved and turned into strategy guidance for the next campaign.

## Development and quality tools

| Technology | Purpose | Why it is used |
|---|---|---|
| npm | Dependency and script management | Standard Node.js workflow for installation, development and builds. |
| Concurrently | Runs Vite and the backend together | Gives developers one `npm run dev` command. |
| Oxlint | Static code checks | Fast detection of unused code and common JavaScript/React problems. |
| Git and GitHub | Version control and collaboration | Preserves project history and provides a shared final-prototype repository. |

## Required environment variables

| Variable | Used for |
|---|---|
| `OPENAI_API_KEY` | Text, vision and image generation |
| `POSTIZ_API_KEY` | Social integrations, scheduling and analytics |
| `POSTIZ_API_URL` | Optional Postiz Cloud or self-hosted API base URL |
| `GEMINI_API_KEY` | Veo video generation |
| `TRIPO_API_KEY` | 3D product generation |

Secrets belong in `.env`, which must remain ignored by Git. `.env.example` documents the required names without containing real credentials.
