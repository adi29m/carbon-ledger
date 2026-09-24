import assert from "node:assert/strict";
import { build } from "esbuild";

// Exercise the real report and checklist modules without browser dependencies.
const result = await build({ stdin: { contents: 'export * from "./lib/reports.ts"; export * from "./lib/workspace.ts";', resolveDir: process.cwd() }, bundle: true, platform: "node", format: "esm", write: false });
const { checklist, csvCell, evidenceCsv, draftHtml, initialDocuments, initialSuppliers } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
const items = checklist(initialSuppliers, initialDocuments);
assert.equal(items.length, 18);
assert.equal(items.filter(x => x.status === "Missing").length, 4);
assert.equal(items.filter(x => x.status === "Reviewed").length, 10);
assert.equal(checklist(initialSuppliers, [...initialDocuments, initialDocuments[0]]).filter(x => x.status === "Reviewed").length, 10, "Duplicate evidence must not inflate readiness");
assert.equal(checklist(initialSuppliers, []).filter(x => x.status === "Missing").length, 18, "Empty working period must show missing evidence");
assert.ok(csvCell('=HYPERLINK("https://example.com")').startsWith('"\''), "Spreadsheet formulas must be neutralised");
assert.ok(csvCell('  +SUM(1,2)').startsWith('"\''), "Leading spaces must not bypass formula protection");
assert.equal(csvCell('A "quoted", name'), '"A ""quoted"", name"');
const csv = evidenceCsv(initialSuppliers, initialDocuments, "2026-Q3", "Demo");
assert.ok(csv.includes("DRAFT - NOT FOR SUBMISSION"));
assert.ok(csv.includes('"YES"'), "Sample records must remain labelled in exports");
assert.ok(csv.includes('"MISSING"'), "Report must disclose missing evidence");
const html = draftHtml(initialSuppliers, initialDocuments, "2026-Q3", '<script>alert("test")</script>');
assert.ok(!html.includes("<script>"), "Export must escape user-provided text");
assert.ok(html.includes("&lt;script&gt;"));
assert.ok(html.includes("SAMPLE DATA"));
assert.ok(html.includes("NOT FOR REGULATORY SUBMISSION"));
console.log("PASS: readiness, duplicate handling, empty periods, CSV formula protection, export escaping, draft labels and missing-evidence disclosure.");
