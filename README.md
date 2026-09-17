# ecom_orders

Next.js application for ecommerce order management.

## Architecture

The project uses Next.js filesystem routing together with a feature-driven source layout.

```text
app/                  Next.js service layer: routes, layouts, metadata, global CSS import
src/views/            Page-level composition imported by app routes
src/widgets/          Large composed UI blocks
src/features/         User-facing actions and flows
src/entities/         Domain models and entity-specific logic
src/shared/           Reusable UI, utilities, config, and infrastructure
src/shared/components Shared UI-kit components: buttons, modals, form controls
```

Keep route files in `app/` thin. Put business logic, UI composition, and reusable modules in `src/`.

## Getting Started

### Local development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production deployment

Production runs as Docker containers (app + nginx + Let's Encrypt) behind a `Makefile` that handles setup, TLS, builds, and auto-deploy from GitHub. Run this on the server, not locally.

See every available command, the repo URL, and which branch the server currently deploys from:

```bash
make help
```

First-time setup on a fresh server:

```bash
make install    # install Docker, ask for domain/email, start the app over HTTP
make ssl-test   # dry-run certificate request (doesn't use up Let's Encrypt's rate limit)
make ssl        # request the real Let's Encrypt certificate
make https      # switch nginx to HTTPS + http->https redirect
```

After that, rebuild whenever code or config changes:

```bash
make build
```

#### Deploy branch (`dev` vs `master`)

The server always deploys whatever branch is checked out locally on it. Switch it with:

```bash
make branch         # show the current deploy branch and its sync status
make branch-dev     # point this server at the dev branch
make branch-master  # point this server at the master branch
```

Enable hourly auto-deploy so the server keeps itself up to date with whichever branch it's on:

```bash
make autodeploy      # check GitHub every hour, pull, and rebuild on changes
make autodeploy-off  # disable it
```

To pull and rebuild immediately instead of waiting for cron:

```bash
make update
make build
```

#### Everyday maintenance

```bash
make status  # container status
make logs    # tail logs for all containers
make restart # restart containers without rebuilding
make down    # stop and remove containers
```

### Local development with dev CRM

Set these values in `.env.local` (preserve any existing secrets):

```dotenv
RMS_API_URL=http://51.250.48.55:8082
APP_ORIGIN=http://localhost:3000
ONE_C_API_URL=http://dev.1c.ikorniysrv.ru:85/eshop/hs/PAPI/v1
```

Set `RMS_SIGNING_KEY` to the same secret used by dev CRM (at least 32 bytes);
an independently generated key will not work. On dev CRM, include
`http://localhost:3000` in `app_origins` / `RMS_APP_ORIGINS`, preserving other origins.
Keep `.env.local` out of Git.

Run `npm install` if dependencies are missing, then `npm run dev -- --hostname localhost --port 3000`.
Restart the development server after changing environment variables. Open
`http://localhost:3000/?user_token=<dev-user-token>`, choose a store, and enter
that user's five-digit PIN. Obtain the invitation and PIN from the dev CRM administrator.
Orders and reference data still use the separate dev 1C backend above.

To check the CRM connection through Next.js, run
`curl -i http://localhost:3000/api/auth/session`. Without session cookies,
HTTP 401 is expected; HTTP 502 indicates a proxy/upstream failure.

## RMS authentication

Copy `.env.example` to `.env.local` for local development (or `.env` for Docker Compose):

- `RMS_API_URL`: RMS base URL reachable **from Next.js**, e.g. `http://127.0.0.1:8082` outside Docker. Inside Docker use the actual RMS service/host address.
- `APP_ORIGIN`: exact public origin without trailing slash. Use `http://localhost:3000` with `npm run dev`; production requires `https://your-domain`.
- `RMS_SIGNING_KEY`: the same persistent secret configured in RMS, at least 32 bytes. It is server-only; do not prefix it with `NEXT_PUBLIC_`.
- `ONE_C_API_URL`: retained for orders and reference data.

Include this client’s `APP_ORIGIN` in RMS `app_origins` (YAML list) or `RMS_APP_ORIGINS` (comma-separated origins without spaces). RMS supports multiple clients; each Next.js client keeps its own single `APP_ORIGIN`. Legacy RMS `app_origin` / `RMS_APP_ORIGIN` remains a fallback when no list is configured. Both servers reject missing/foreign Origin on login and refresh. RMS does not need browser CORS: the browser calls same-origin Next.js routes, which forward credentials and both Set-Cookie headers. Production must terminate HTTPS in front of Next.js; the bundled plain HTTP nginx template needs TLS configuration or an external HTTPS proxy. Cookies deliberately remain Secure, including in development (use localhost or local HTTPS).

Open `/?access_token=<user_token>` (or `/?user_token=<user_token>`). The invitation is checked by RMS `/usertokenvalid`. Only the store list is available before PIN login, and that route independently validates the invitation. Choose a store and enter the user's five-digit PIN: Next.js posts `{user_token,password}` to RMS `/auth/login`. RMS users must have their own PIN stored as a bcrypt password; the old shared 1C PIN is no longer used. Non-admin RMS users may be created with five-digit PINs; administrator passwords remain at least eight bytes.

After success the invitation is removed from the URL and is not written to localStorage. Old `access_stores` and `ecom-orders-access-token` entries are deleted. Only CSRF and the selected store persist locally. Access and refresh JWTs are held in HttpOnly/Secure cookies with SameSite Lax/Strict respectively. Reloading restores and validates the session before authorizing the UI; a stored store selection alone never grants access.

`authenticatedFetch` sends cookies and X-CSRF-Token on POST/PUT/PATCH/DELETE. On 401 it performs one shared refresh and retries the original request once with the new CSRF token. Web Locks coordinate refresh across tabs where available; all tabs in supported production browsers share the rotated CSRF through localStorage. A temporary RMS failure preserves the session. An expired/revoked refresh ends UI authorization and requires opening the invitation again. Every protected Next.js Route Handler verifies the signed access JWT and CSRF, then checks persisted session validity in RMS before requesting 1C. Do not add public/CDN caching to these responses.

Routes: `/api/auth/login`, `/api/auth/refresh`, `/api/auth/session`, `/api/auth/logout`; `/api/rms/products`, `/api/rms/stores`, `/api/rms/users` proxy supported RMS methods. Existing `/api/orders/*` and entity routes continue using 1C for business data. `/api/pin-is-valid` is removed. New Route Handlers must call `requireSession` before accessing business data or performing changes.

The fifth wrong PIN returns HTTP 401, `result_code: 1001` (also `resultCode` for RMS compatibility), `messages` and ISO `blockedUntil`. The UI displays the server message with the unblock time formatted in the browser's timezone. RMS controls the attempt limit and duration; client-side delays are not the security boundary.

Verification: `npm run lint`, `npx tsc --noEmit --incremental false`, `npm test`, `npm run build`. Security behavior follows the [OWASP CSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) and uses [Next.js Route Handler responses](https://nextjs.org/docs/app/api-reference/functions/next-response) to forward cookies.
