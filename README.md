# CarbonLedger

A responsive CBAM evidence-preparation website for aluminium exporters. This first version is an interactive frontend prototype with six fictional suppliers and clearly marked sample evidence.

[Open the live demo](https://carbon-ledger-self.vercel.app)

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

## Implemented

- Overview with live evidence counts, checklist readiness, action links and an explicitly illustrative emissions chart.
- Supplier creation, search, status filtering, individual evidence checklists and downloadable request drafts.
- Multi-file upload and drag-and-drop, category and supplier selection, 10 MB file limits and filename-based duplicate checks within a supplier/period.
- PDF and image preview; spreadsheet originals can be downloaded for review in a spreadsheet application.
- Manual data entry, unit selection, source references, notes, confirmation before review, and draft saving.
- CSV evidence registers and escaped, printable HTML evidence packs, clearly marked as drafts and retaining sample labels.
- Working-period filtering, workspace-name settings, responsive navigation and accessible dialogs.
- Optional WebMCP read-summary and navigation tools that share the visible application state.

## Prototype boundaries

All changes and uploads are held in browser memory, only for the current page session. Refreshing or closing the tab resets the data. Files are not uploaded to a backend. The demo uses one manually entered value per document; this is not a complete CBAM data model.

Readiness measures three illustrative checklist categories for each supplier. It does not measure regulatory compliance. Working quarters organise evidence; they are not statutory filing periods. The chart is illustrative and never enters draft exports.

The application does not yet implement accounts, durable storage, OCR/AI extraction, audit-history persistence, a methodology-specific emissions engine, accredited verification or EU registry submission. Exported HTML lists source references but does not embed original files. No email is sent by the application.

## Structure

- `app/page.tsx`: shared session state, dashboard and navigation.
- `components/workspace-views.tsx`: suppliers, documents, review dialogs, reports and settings.
- `lib/workspace.ts`: typed records and sample fixtures.
- `lib/reports.ts`: evidence checklist and safe draft exports.
- `lib/use-workspace-tools.ts`: optional WebMCP integration.
- `app/globals.css`: responsive theme and application styles.

Built with React and TypeScript. The local preview uses the original Vinext development setup. Vercel uses a standard Next.js static export through `npm run build:vercel`, configured in `vercel.json`. The legacy Sites identity is retained locally in `.openai/hosting.json` and excluded from Vercel uploads.

## Deploy to Vercel

The project is linked to `adi29ms-projects/carbon-ledger` through the ignored `.vercel/project.json`.

```sh
npm run build:vercel
vercel deploy --prod
```

This is a static frontend deployment. No server-side document storage or AI processing is enabled by hosting it. Local environment files and development artifacts are excluded using `.vercelignore`.

## Next implementation phase

Add authenticated organisation-level access and durable document storage, then document extraction with source-location references. Implement emissions calculations only after the product-specific methodology and data requirements have been reviewed with a CBAM specialist.
