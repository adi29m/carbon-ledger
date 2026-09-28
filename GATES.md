# Gates: live organisation records

OWNS: app/app/**, lib/supabase-rest.ts, supabase/**, scripts/check-database.mjs, scripts/migrate-database.mjs, package.json, package-lock.json, .env.example, README.md, GATES.md

Scope: persist user records in a live organisation database with private document storage and enforced member roles.

- [x] G1: The configured database has every current workspace migration applied without definition drift.
  CHECK: node --env-file=.env.local scripts/migrate-database.mjs --check
  EXPECT: PASS: workspace database schema current
  EVIDENCE: automatic-evidence=v1; definition-sha256=72b99a5a28664de4b0ed58d548d0f856d56e19a4cfc01331ce636f220fccaddc; exit=0; EXPECT=matched; output-sha256=73084b9d8ae73583f561d54405317f18cf06ba2cb68718612a390d0641aa4093; output-bytes=94; shell=C:\WINDOWS\system32\cmd.exe; cwd=D:\Work\Insurance App\carbon-ledger; path=d48c81637500/47 entries

- [x] G2: Saved records survive a fresh session, member roles restrict writes, and original files remain private and immutable while referenced.
  CHECK: node --env-file=.env.local scripts/check-database.mjs
  EXPECT: PASS: live database persistence, roles, storage isolation and cleanup
  EVIDENCE: automatic-evidence=v1; definition-sha256=801093fdfa48a4ad20b2fd2cd75461442e528d66dedafa13aa98e1eb743141a9; exit=0; EXPECT=matched; output-sha256=ff02cdc8a6b18479e265d4eba6540e9dcc1d8b1a84aada59d174cd6af86b204c; output-bytes=136; shell=C:\WINDOWS\system32\cmd.exe; cwd=D:\Work\Insurance App\carbon-ledger; path=d48c81637500/47 entries

- [ ] G3: The deployed account workspace connects to the database and a user can save and retrieve a record through the website.
  EVIDENCE: pending; Supabase Free is connected and both migrations are applied. Production Auth redirect configuration requested. Browser automation is unavailable in this session.

- [x] G4: The application's existing evidence and export regression checks pass.
  CHECK: node scripts/check-domain.mjs
  EXPECT: PASS: readiness, duplicate handling, empty periods, CSV formula protection, export escaping, draft labels and missing-evidence disclosure.
  EVIDENCE: automatic-evidence=v1; definition-sha256=2cf5efd7d0d7abd326d19a3cedb60afb27a5956464d3d41663ed3ea8a3254cda; exit=0; EXPECT=matched; output-sha256=ab38f016af1d22a401d726816546f0d4c083c6993f1503b529f562b9623d31de; output-bytes=139; shell=C:\WINDOWS\system32\cmd.exe; cwd=D:\Work\Insurance App\carbon-ledger; path=d48c81637500/47 entries

- [x] G5: The final application passes TypeScript, lint, and the Vercel production build.
  CHECK: npm run check:app
  EXPECT: prerendered as static content
  EVIDENCE: automatic-evidence=v1; definition-sha256=662724a9a710caf71c7872c18ce1b10d5edc6ad0a643aede94663bb108c8406b; exit=0; EXPECT=matched; output-sha256=defba1fa6db72a0c67ff20d743ae6ba415c9da976cf37c06673ea7566785a197; output-bytes=1417; shell=C:\WINDOWS\system32\cmd.exe; cwd=D:\Work\Insurance App\carbon-ledger; path=d48c81637500/47 entries
