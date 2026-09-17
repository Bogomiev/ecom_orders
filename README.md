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
