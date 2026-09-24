import { categories, type Evidence, type Supplier } from "./workspace";

export function checklist(suppliers: Supplier[], documents: Evidence[]) {
  return suppliers.flatMap(s => categories.map(category => {
    const matching = documents.filter(d => d.supplierId === s.id && d.category === category);
    return { supplier: s.name, supplierId: s.id, category, status: matching.some(d => d.status === "Reviewed") ? "Reviewed" : matching.length ? "Needs review" : "Missing" };
  }));
}

export function csvCell(value: string) {
  const safe = /^[\s]*[=+@-]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function evidenceCsv(suppliers: Supplier[], docs: Evidence[], period: string, company: string) {
  const rows = [["Report status", "Company", "Working period", "Supplier", "Category", "Document", "Value", "Unit", "Source reference", "Review status", "Sample data", "Notes"],
    ...docs.map(d => ["DRAFT - NOT FOR SUBMISSION", company, period, suppliers.find(s => s.id === d.supplierId)?.name ?? "Unknown", d.category, d.name, d.value, d.unit, d.source, d.status, d.demo ? "YES" : "NO", d.notes]),
    ...checklist(suppliers, docs).filter(c => c.status === "Missing").map(c => ["DRAFT - NOT FOR SUBMISSION", company, period, c.supplier, c.category, "MISSING", "", "", "", "Missing", "", "Required by this demo checklist; confirm actual methodology with a specialist."])
  ];
  return "\ufeff" + rows.map(row => row.map(csvCell).join(",")).join("\r\n");
}
export function escapeHtml(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;"); }
export function draftHtml(suppliers: Supplier[], docs: Evidence[], period: string, company: string) {
  const e = escapeHtml;
  const items = checklist(suppliers, docs);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CarbonLedger draft evidence pack</title><style>body{font:16px/1.6 system-ui,sans-serif;color:#173c2e;max-width:1100px;margin:50px auto;padding:24px}h1{font-size:32px}h2{margin-top:35px}table{width:100%;border-collapse:collapse;font-size:13px}td,th{padding:12px;text-align:left;border-bottom:1px solid #dce5df;overflow-wrap:anywhere}th{background:#f1f5ee}.notice{padding:20px;background:#faf2df;border:1px solid #e8d9af}small{color:#607569}@media print{body{margin:0}tr{break-inside:avoid}}</style></head><body><small>CARBONLEDGER / EVIDENCE PACK</small><h1>${e(company)}</h1><p>Working period: ${e(period)} · Generated ${e(new Date().toISOString())}</p><div class="notice"><strong>DRAFT — NOT FOR REGULATORY SUBMISSION</strong><p>This is an evidence inventory, not a CBAM emissions calculation, verifier report or registry submission. Sample records are marked below. Originals are not embedded; preserve and share real source files separately. Working quarters organise evidence and do not represent statutory filing deadlines.</p></div><h2>Preparation summary</h2><p>${suppliers.length} suppliers · ${docs.length} evidence records · ${items.filter(x => x.status === "Reviewed").length}/${items.length} checklist items reviewed · ${items.filter(x => x.status === "Missing").length} missing</p><h2>Source register</h2><table><thead><tr><th>Supplier / document</th><th>Value / unit</th><th>Reference</th><th>Status</th></tr></thead><tbody>${docs.map(d => `<tr><td>${e(suppliers.find(s => s.id === d.supplierId)?.name ?? "Unknown")}<br>${e(d.name)}${d.demo ? "<br><strong>SAMPLE DATA</strong>" : ""}</td><td>${e(d.value || "Not entered")} ${e(d.unit)}</td><td>${e(d.source || "Missing")}<br>${e(d.notes)}</td><td>${e(d.status)}</td></tr>`).join("")}</tbody></table><h2>Evidence checklist</h2><p>This prototype uses three illustrative evidence categories. Confirm the applicable requirements for the product and installation before filing.</p><table><thead><tr><th>Supplier</th><th>Category</th><th>Status</th></tr></thead><tbody>${items.map(c => `<tr><td>${e(c.supplier)}</td><td>${e(c.category)}</td><td>${e(c.status)}</td></tr>`).join("")}</tbody></table></body></html>`;
}

export function download(content: string | Blob, filename: string, type = "text/plain;charset=utf-8") {
  const blob = typeof content === "string" ? new Blob([content], { type }) : content;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
