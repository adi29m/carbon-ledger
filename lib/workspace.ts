export type View = "overview" | "suppliers" | "documents" | "review" | "reports" | "settings" | "guide";
export type Category = "Energy record" | "Production record" | "Precursor data";
export const categories: Category[] = ["Energy record", "Production record", "Precursor data"];
export type Supplier = { id: string; name: string; initials: string; location: string; material: string; email: string };
export type Evidence = { id: string; name: string; supplierId: string; category: Category; period: string; status: "Reviewed" | "Needs review"; demo: boolean; date: string; value: string; unit: string; source: string; file?: File; notes: string };
export const initialSuppliers: Supplier[] = [
 { id: "s1", name: "Deccan Aluminium", initials: "DA", location: "Pune, Maharashtra", material: "Aluminium billets", email: "" },
 { id: "s2", name: "Western Metalworks", initials: "WM", location: "Kolhapur, Maharashtra", material: "Aluminium ingots", email: "" },
 { id: "s3", name: "Konkan Alloys", initials: "KA", location: "Ratnagiri, Maharashtra", material: "Aluminium alloys", email: "" },
 { id: "s4", name: "Prakash Extrusions", initials: "PE", location: "Nashik, Maharashtra", material: "Aluminium profiles", email: "" },
 { id: "s5", name: "Sahyadri Metals", initials: "SM", location: "Sangli, Maharashtra", material: "Aluminium billets", email: "" },
 { id: "s6", name: "Precision Castings", initials: "PC", location: "Aurangabad, Maharashtra", material: "Aluminium castings", email: "" },
];
const evidenceRows: [string, Category, "Reviewed" | "Needs review"][] = [
 ["s1", "Energy record", "Reviewed"], ["s1", "Production record", "Reviewed"], ["s1", "Precursor data", "Reviewed"],
 ["s2", "Energy record", "Needs review"], ["s2", "Production record", "Reviewed"],
 ["s3", "Energy record", "Reviewed"], ["s3", "Production record", "Reviewed"], ["s3", "Precursor data", "Reviewed"],
 ["s4", "Energy record", "Needs review"], ["s4", "Production record", "Reviewed"], ["s4", "Precursor data", "Needs review"],
 ["s5", "Production record", "Reviewed"], ["s5", "Precursor data", "Needs review"], ["s6", "Energy record", "Reviewed"],
];
export const initialDocuments: Evidence[] = evidenceRows.map(([supplierId, category, status], i) => ({
 id: `d${i + 1}`, supplierId, category, status, period: "2026-Q3", demo: true, date: "2026-09-23",
 name: `${initialSuppliers.find(s => s.id === supplierId)!.name.split(" ")[0]}_${category.replaceAll(" ", "_")}_Q3_2026.${category === "Production record" ? "xlsx" : "pdf"}`,
 value: category === "Energy record" ? "24850" : category === "Production record" ? "125.5" : "1.42",
 unit: category === "Energy record" ? "kWh" : category === "Production record" ? "tonnes" : "tCO2e/tonne",
 source: category === "Production record" ? "Production summary, cell D12 (sample)" : "Page 1, reported total (sample)", notes: "Illustrative sample. Not a verified emissions input.",
}));
