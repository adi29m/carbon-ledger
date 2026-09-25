# CarbonLedger development

For substantial feature work, use [Unlazy](https://github.com/Leonxlnx/unlazy/tree/16671491f6679ad9378f52604d3bc2415b4120c7) as a completion checklist. This project pins upstream commit `16671491f6679ad9378f52604d3bc2415b4120c7`; review its `SKILL.md` and `SECURITY.md` before using its scripts. Unlazy is a development workflow, not an application dependency.

- Before a multi-part change, write observable outcomes in a task-specific `GATES.md`. Give each runnable gate a check that can fail and an expected success-only result. Skip a ledger for small edits.
- Treat every `CHECK:` as executable code. Inspect the command and any script it calls. Use Unlazy's non-executing `--status` first. Do not run inherited checks or install its optional Claude Code hook automatically.
- Verify the product behavior that matters, including failure cases and role boundaries. Run TypeScript, lint, domain checks, and a Vercel build when the change touches the app. Recheck gates after fixes and report any unmet outcome plainly.
- Keep the public demo distinct from `/app`. Never describe saved organisations or private evidence storage as live until Supabase is connected and the two-account plus outsider access checks in the README pass.

Normal local verification commands:

```sh
npx tsc --noEmit --incremental false
npm run lint
node scripts/check-domain.mjs
npm run build:vercel
```

The exact upstream version and this file make the workflow reproducible for future contributors without adding a runtime package or a machine-specific hook to the site.
