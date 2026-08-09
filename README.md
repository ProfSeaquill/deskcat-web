This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Stripe donations

DeskCat can keep donations disabled locally and configure them only in hosted environments.
Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `NEXT_PUBLIC_APP_URL` in the deployment
environment. The webhook endpoint is `/api/donations/webhook`; subscribe it to
`checkout.session.completed` and `checkout.session.async_payment_succeeded`. Completed
payments are recorded idempotently and update the community total. Secret keys never reach
the browser.

## Google Analytics

Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` to the GA4 measurement ID, for example `G-XXXXXXXXXX`, in
the deployment environment. When it is unset, DeskCat does not load the Google Analytics script.
Client-side page navigation is tracked through the shared App Router layout.

## Database

DeskCat uses Drizzle with a Postgres-compatible Neon connection for admin-managed data. Set
`DATABASE_URL` in `.env.local` for local database commands and in the deployment environment for
server-side database access.

```bash
npm run db:generate
npm run db:migrate
npm run db:studio
```

The user-facing appearance catalog is database-backed. Accessible cosmetic assets, pose placements,
and background themes are loaded from Postgres; private cosmetic PNGs are streamed through an
access-checked same-origin route instead of exposing Blob credentials or private URLs.

## Admin asset uploads

Connect a Vercel Blob store to the project and enable access to System Environment Variables for
OIDC authentication. The production path uses `BLOB_STORE_ID` plus Vercel's runtime
`x-vercel-oidc-token` header. For local development outside Vercel, set `BLOB_READ_WRITE_TOKEN` as
a fallback. Uploads are stored in Vercel Blob and recorded in the `cosmetic_assets` table. The
public DeskCat runtime only includes assets whose `accessible` value is enabled and whose cosmetic
has not been retired. DeskCat's standard black glasses remain a core default: every DeskCat wears
them unless another accessible glasses asset is selected, and the appearance editor does not offer
a glasses `None` option.

The asset manager supports staging up to 20 PNGs in a batch table, editing each row's category,
anchor, purpose, view, pose, and app access, and saving the batch with one action. Former built-in
editor entries are no longer mixed into the managed asset list. Their PNGs, metadata manifest, and
source definitions are backed up under `deskcat-assets/built-in-archive`.

Background themes can be imported in batches from individual JSON files. The nine former built-in
themes are preserved as upload-ready files under `deskcat-assets/built-in-archive/backgrounds`.

Background themes are stored in `appearance_backgrounds`. Run `npm run db:migrate` after pulling
schema changes before creating themes in the asset manager.

## DeskCat anchor editor

With the development server running, open
[http://localhost:3000/dev/editor](http://localhost:3000/dev/editor) to place
and preview cosmetic anchors. Publishing validates the full pose document and writes
`app/data/deskcatAnchors.json`, which is the same data the DeskCat app renders from; commit that
file with the related art changes.

The editor is disabled in production by default. Set `DESKCAT_ANCHOR_EDITOR_ENABLED=true` and
configure `DESKCAT_ANCHOR_EDITOR_TOKEN` as the editor password to expose `/dev/editor`. The old
`/dev/deskcat-anchors` URL redirects to `/dev/editor`. Local authoring is preferred because writes
to many serverless production filesystems are not durable.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
