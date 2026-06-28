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

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
