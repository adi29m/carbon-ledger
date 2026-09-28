# CarbonLedger

A responsive CBAM evidence-preparation website for aluminium exporters. The public landing page explains the product, the interactive demo uses fictional suppliers, and a separate organisation workspace stores accounts, roles, supplier records, and private source files in Supabase.

[Visit the landing page](https://carbon-ledger-self.vercel.app) · [Open the interactive demo](https://carbon-ledger-self.vercel.app/workspace) · [Saved workspace](https://carbon-ledger-self.vercel.app/app)

## Interface preview

These screenshots show fictional demo data. The application prepares draft evidence; it does not certify CBAM compliance.

**Overview — evidence progress and next steps**

![CarbonLedger overview showing supplier counts, evidence readiness, and next steps](docs/screenshots/overview.png)

**Suppliers — evidence status for each supplier**

![Supplier cards showing reviewed, missing, and pending evidence](docs/screenshots/suppliers.png)

**Documents — the supplier evidence register**

![Document register with supplier, category, and review status columns](docs/screenshots/documents.png)

## Run locally

Requires Node.js 22.13 or newer.

```sh
npm install
npm run dev
```

Open the local address printed by the server (normally `http://localhost:5173`).

```sh
npx tsc --noEmit --incremental false
node scripts/check-domain.mjs
npm run build
```

If Windows resolves `npm` incorrectly, invoke the installed npm CLI directly with Node. The site otherwise uses the standard project scripts.

For substantial changes, follow the [development quality workflow](AGENTS.md), based on a [pinned Unlazy revision](https://github.com/Leonxlnx/unlazy/tree/16671491f6679ad9378f52604d3bc2415b4120c7). It uses explicit acceptance gates and reviewed checks; it is not included in the production bundle.

## Implemented

- Overview with live evidence counts, checklist readiness, action links and an explicitly illustrative emissions chart.
- Supplier creation, search, status filtering, individual evidence checklists and downloadable request drafts.
- Multi-file upload and drag-and-drop, category and supplier selection, 10 MB file limits and filename-based duplicate checks within a supplier/period.
- PDF and image preview; spreadsheet originals can be downloaded for review in a spreadsheet application.
- Manual data entry, unit selection, source references, notes, confirmation before review, and draft saving.
- CSV evidence registers and escaped, printable HTML evidence packs, clearly marked as drafts and retaining sample labels.
- Working-period filtering, workspace-name settings, responsive navigation and accessible dialogs.
- Optional WebMCP read-summary and navigation tools that share the visible application state.

## Saved organisation workspace

The separate /app route supports email accounts, private organisations, team invitations, owner/admin/editor/viewer roles, supplier records, source-file uploads, document reviews, and a database-backed activity log. An invitation creates a link for an admin to share; the application does not send invitation emails. A recipient must sign in with the invited email to accept it.

This is implemented with Supabase Auth, Postgres row-level security, and a private Storage bucket. The browser uses only a publishable key. The database policies check membership and role for every organisation record and Storage object. Files are limited to 10 MB in the UI, table constraint, and bucket. The original file is downloaded through an authenticated request. The public demo remains separate and never writes its sample records to an organisation.

CarbonLedger uses the Supabase Free resource `carbon-ledger-records` in Mumbai, connected to the Vercel project. The database migrations enforce organisation isolation and member permissions. Each evidence record references its actual Storage object; the original cannot be deleted while that record exists. Unregistered uploads can still be removed if saving their metadata fails.

The live database check creates temporary owner, editor, viewer, and outsider accounts, verifies persistence and access restrictions, and removes its fixtures. Passing these API checks does not verify email delivery; configure the Auth URLs and an email provider before opening registration to customers.

### Connect Supabase

1. For a fresh installation, provision the [Supabase Vercel integration](https://vercel.com/marketplace/supabase) for the linked project. The integration supplies the public browser keys and server-only maintenance credentials. The app accepts a publishable key or the legacy anon key. Never put a secret/service-role key in a `NEXT_PUBLIC_` variable.
2. Pull the linked project's environment variables into the ignored `.env.local` file with `vercel env pull .env.local --yes --scope adi29ms-projects`. This replaces the local file; keep custom overrides separately.
3. Run `node --env-file=.env.local scripts/migrate-database.mjs` to preview pending migrations, then `npm run db:migrate` to apply them. The runner checks the project identity, verifies TLS using [Supabase's public CA](supabase/certs/README.md), applies SQL in one transaction, and records checksums. It refuses changed historical migrations or an existing untracked schema. Add a new migration for later changes. The current project's initial migrations are already applied.
4. In Supabase Auth URL settings, set the Site URL to `https://carbon-ledger-self.vercel.app` and allow `https://carbon-ledger-self.vercel.app/app` as a redirect. Keep email confirmation enabled, so only a verified address can accept an invitation. Configure custom SMTP before customer sign-ups; Supabase's default sender has recipient and rate limits.
5. Run `npm run db:check` against a project you administer. It uses the elevated key only to create and clean up isolated fixtures; all access tests use signed-in user tokens. The script sends no emails and prints no credentials. For the website, sign in, create an organisation, upload a source file, review it, and refresh to confirm the saved result.
6. Run `npm run check:app`, then deploy. Public environment values are embedded at build time, so changing them requires a fresh Vercel build.

The app does not yet provide password reset, automated email invitations, virus scanning, or a formal backup/retention policy. Add those before storing customer production evidence.

## Demo prototype boundaries

All changes and uploads are held in browser memory, only for the current page session. Refreshing or closing the tab resets the data. Files are not uploaded to a backend. The demo uses one manually entered value per document; this is not a complete CBAM data model.

Readiness measures three illustrative checklist categories for each supplier. It does not measure regulatory compliance. Working quarters organise evidence; they are not statutory filing periods. The chart is illustrative and never enters draft exports.

The demo does not use the saved account or storage. Neither route implements OCR/AI extraction, a methodology-specific emissions engine, accredited verification or EU registry submission. Exported demo HTML lists source references but does not embed original files. No email is sent by the application.

## Structure

- `app/page.tsx` and `app/landing.css`: public product landing page, responsive styling and visual storytelling.
- `app/workspace/page.tsx`: shared demo session state, dashboard and navigation.
- `components/landing-motion.tsx`: progressive scroll reveals and mobile navigation behavior.
- `components/workspace-views.tsx`: suppliers, documents, review dialogs, reports and settings.
- `lib/workspace.ts`: typed records and sample fixtures.
- `lib/reports.ts`: evidence checklist and safe draft exports.
- `lib/use-workspace-tools.ts`: optional WebMCP integration.
- [Saved workspace](app/app/page.tsx) and [browser data client](lib/supabase-rest.ts): signed-in organisation flow.
- [Supabase migration](supabase/migrations/202609250001_workspaces.sql): role, row-level security, private Storage and audit schema.
- `app/globals.css`: responsive theme and application styles.
- `public/images`: optimized, illustrative industrial imagery and workspace previews for the landing page.

Built with React and TypeScript. The local preview uses the original Vinext development setup. Vercel uses a standard Next.js static export through npm run build:vercel, configured in vercel.json. The saved route connects directly to Supabase with authenticated requests; Supabase enforces access in the database and private Storage. The legacy Sites identity is retained locally in .openai/hosting.json and excluded from Vercel uploads.

## Deploy to Vercel

The project is linked to `adi29ms-projects/carbon-ledger` through the ignored `.vercel/project.json`.

```sh
npm run build:vercel
vercel deploy --prod
```

For a fresh environment, connect Supabase and apply migrations before using `/app`. Keep Auth URLs and email delivery configured for the site's domain. Local environment files and development artifacts are excluded using `.vercelignore`.

## Next implementation phase

Add document extraction with source-location references, password recovery and operational safeguards for a team pilot. Implement emissions calculations only after the product-specific methodology and data requirements have been reviewed with a CBAM specialist.
