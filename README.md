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

Copy `.env.example` to `.env.local`, then set `STRIPE_SECRET_KEY` to a Stripe test-mode
secret key. Set `NEXT_PUBLIC_APP_URL` to the deployed app URL in production. The donation
button creates a one-time Stripe-hosted Checkout Session; secret keys never reach the browser.

## DeskCat anchor editor

With the development server running, open
[http://localhost:3000/dev/deskcat-anchors](http://localhost:3000/dev/deskcat-anchors) to place
and preview cosmetic anchors. Saving validates the full pose document and writes
`app/data/deskcatAnchors.json`; commit that file with the related art changes.

The editor is disabled in production by default. Set `DESKCAT_ANCHOR_EDITOR_ENABLED=true` at
build time and configure `DESKCAT_ANCHOR_EDITOR_TOKEN` to expose token-protected saves. Local
authoring is preferred because writes to many serverless production filesystems are not durable.

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
