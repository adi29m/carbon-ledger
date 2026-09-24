"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, Bell, CalendarDays, ChevronRight, CircleHelp, ClipboardCheck, FileCheck2, FileText, FolderOpen, LayoutDashboard, Leaf, Plus, Settings2, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { initialDocuments, initialSuppliers, type Category, type Evidence, type Supplier, type View } from "@/lib/workspace";
import { checklist } from "@/lib/reports";
import { useWorkspaceTools } from "@/lib/use-workspace-tools";
import { DocumentsView, GuideView, ReportsView, ReviewDialog, SettingsView, SupplierDialog, SupplierSheet, SuppliersView, UploadDialog } from "@/components/workspace-views";

const navigation = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "suppliers", label: "Suppliers", icon: Users },
  { id: "documents", label: "Documents", icon: FolderOpen },
  { id: "review", label: "Data review", icon: ClipboardCheck },
  { id: "reports", label: "Reports", icon: FileCheck2 },
] as const;

function AppNavigation({ view, navigate, pending, company }: { view: View; navigate: (v: View) => void; pending: number; company: string }) {
  const { setOpenMobile } = useSidebar();
  const go = (v: View) => { navigate(v); setOpenMobile(false); };
  return <Sidebar className="app-sidebar">
    <SidebarHeader className="brand-header"><a href="#overview" onClick={() => go("overview")} className="brand"><span className="brand-icon"><Leaf size={23} strokeWidth={1.8} /></span>Carbon<span className="brand-light">Ledger</span></a><span className="brand-subtitle">YOUR CBAM WORKSPACE</span></SidebarHeader>
    <SidebarContent className="workspace-sidebar-scroll">
      <button className="workspace-picker" onClick={() => go("settings")}><span className="workspace-avatar">{company.charAt(0)}</span><span><strong>{company}</strong><small>Demo workspace</small></span><Settings2 size={15} /></button>
      <div className="nav-label">WORKSPACE</div>
      <nav aria-label="Main navigation" className="main-navigation">{navigation.map(({ id, label, icon: Icon }) => <button key={id} aria-current={view === id ? "page" : undefined} className={`nav-link ${view === id ? "active" : ""}`} onClick={() => go(id)}><Icon size={19} strokeWidth={1.7} /><span>{label}</span>{id === "review" && pending > 0 && <span className="nav-count">{pending}</span>}</button>)}</nav>
      <div className="sidebar-guide"><span className="guide-symbol"><ShieldCheck size={22} /></span><strong>A clearer path to CBAM.</strong><p>Turn supplier evidence into a report you can stand behind.</p><button onClick={() => go("guide")}>Explore the workflow <ArrowUpRight size={15} /></button></div>
    </SidebarContent>
    <SidebarFooter className="sidebar-footer"><button className={`nav-link ${view === "guide" ? "active" : ""}`} onClick={() => go("guide")}><CircleHelp size={19} />CBAM guide<ArrowUpRight size={15} className="ml-auto" /></button><button className={`nav-link ${view === "settings" ? "active" : ""}`} onClick={() => go("settings")}><Settings2 size={19} />Workspace settings</button><Link className="nav-link" href="/"><ArrowLeft size={19} />Back to website</Link><div className="profile"><span className="profile-avatar">AD</span><span><strong>Aditya</strong><small>Workspace owner · Demo</small></span><span className="profile-status" /></div></SidebarFooter>
  </Sidebar>;
}

function Status({ value }: { value: string }) { return <span className={`status ${value === "Reviewed" || value === "Ready" ? "green" : value === "Missing evidence" ? "red" : "amber"}`}><span />{value}</span>; }

function EmissionsChart() {
  const points = [78, 118, 145, 114, 176, 161, 189, 168, 126];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];
  const [active, setActive] = useState(8);
  return <div className="emissions-chart"><div className="chart-top"><div><strong>{(points[active] / 100).toFixed(2)}</strong><span>tCO₂e / tonne</span></div><span className="chart-sample">Illustrative data</span></div><div className="plot"><div className="plot-axis"><span>2.0</span><span>1.5</span><span>1.0</span><span>0.5</span><span>0</span></div><div className="plot-content"><div className="grid-lines">{[0, 1, 2, 3, 4].map(i => <i key={i} />)}</div><div className="bars">{points.map((point, i) => <button key={i} className={`bar-column ${active === i ? "selected" : ""}`} onClick={() => setActive(i)} aria-label={`${months[i]}: ${(point / 100).toFixed(2)} tonnes CO2 equivalent per tonne`}><span className="bar" style={{ height: `${point / 2}%` }} /><span className="bar-month">{months[i]}</span></button>)}</div></div></div><div className="chart-footer"><span><i />Specific embedded emissions</span><small>Sample trend · Jan–Sep 2026</small></div></div>;
}

export default function Home() {
  const [view, setView] = useState<View>("overview");
  const [period, setPeriod] = useState("2026-Q3");
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [documents, setDocuments] = useState<Evidence[]>(initialDocuments);
  const [company, setCompany] = useState("Sahyadri Aluminium");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadSupplier, setUploadSupplier] = useState("");
  const [uploadCategory, setUploadCategory] = useState<Category>("Energy record");
  const [addSupplierOpen, setAddSupplierOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Evidence | null>(null);
  const docs = documents.filter(d => d.period === period);
  const items = checklist(suppliers, docs);
  const reviewed = items.filter(c => c.status === "Reviewed").length;
  const pending = docs.filter(d => d.status === "Needs review").length;
  const expected = suppliers.length * 3;
  const readiness = expected ? Math.round(reviewed / expected * 100) : 0;
  const missing = Math.max(0, expected - new Set(docs.map(d => `${d.supplierId}:${d.category}`)).size);
  const navigate = useCallback((target: View) => { setView(target); window.history.replaceState(null, "", `#${target}`); window.scrollTo({ top: 0 }); }, []);
  useEffect(() => { const update = () => { const hash = window.location.hash.slice(1); if ([...navigation.map(n => n.id), "settings", "guide"].includes(hash)) setView(hash as View); }; update(); window.addEventListener("hashchange", update); return () => window.removeEventListener("hashchange", update); }, []);
  const upload = () => { setUploadSupplier(""); setUploadCategory("Energy record"); setUploadOpen(true); };
  const uploadForSupplier = (id: string, category: Category = "Energy record") => { setUploadSupplier(id); setUploadCategory(category); setUploadOpen(true); };
  useWorkspaceTools({ view, period, supplierCount: suppliers.length, documentCount: docs.length, pending, missing, readiness }, navigate);
  const supplierReadiness = (id: string) => Math.round(new Set(docs.filter(d => d.supplierId === id && d.status === "Reviewed").map(d => d.category)).size / 3 * 100);
  const supplierStatus = (id: string) => supplierReadiness(id) === 100 ? "Ready" : new Set(docs.filter(d => d.supplierId === id).map(d => d.category)).size < 3 ? "Missing evidence" : "Needs review";

  return <SidebarProvider style={{ "--sidebar-width": "264px" } as CSSProperties}><a className="skip-link" href="#main-content">Skip to content</a><AppNavigation view={view} navigate={navigate} pending={pending} company={company} /><div className="app-main">
    <header className="topbar"><div className="breadcrumb"><SidebarTrigger className="mobile-menu" /><span>Workspace</span><ChevronRight size={14} /><strong>{navigation.find(n => n.id === view)?.label ?? (view === "guide" ? "CBAM guide" : "Settings")}</strong></div><div className="topbar-right"><span className="demo-tag"><span />Demo mode</span><button aria-label="View items needing attention" className="notification-button" onClick={() => navigate("review")}><Bell size={19} />{pending > 0 && <span />}</button><span className="topbar-avatar">AD</span></div></header>
    <main id="main-content" className="page-content"><div className="page-heading"><div><div className="eyebrow">{view === "overview" ? "A LITTLE CLARITY. A LOT OF PROGRESS." : "YOUR CBAM WORKSPACE"}</div><h1>{view === "overview" ? "Your compliance, in view." : navigation.find(n => n.id === view)?.label ?? (view === "guide" ? "From evidence to confidence." : "Your workspace.")}</h1><p>{view === "overview" ? "Know where you stand. See what needs your attention." : "Prepare and review the evidence behind your emissions data."}</p></div><div className="heading-actions"><Select value={period} onValueChange={setPeriod}><SelectTrigger aria-label="Working period" className="period-select"><CalendarDays size={16} /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="2026-Q3">Jul – Sep 2026</SelectItem><SelectItem value="2026-Q2">Apr – Jun 2026</SelectItem></SelectContent></Select><button className="button primary" onClick={upload}><Plus size={18} />Upload documents</button></div></div>

    {view === "overview" ? <>
      <section className="overview-stats" aria-label="Workspace statistics"><div className="stat-card"><span className="stat-label">Active suppliers<Users size={18} /></span><strong>{suppliers.length.toString().padStart(2, "0")}</strong><span className="stat-foot"><span className="positive">{suppliers.filter(s => supplierReadiness(s.id) === 100).length} ready</span> for your next review</span></div><div className="stat-card"><span className="stat-label">Evidence collected<FolderOpen size={18} /></span><strong>{docs.length}<small> / {expected}</small></strong><span className="stat-foot">Across your supplier network</span></div><div className="stat-card"><span className="stat-label">Awaiting review<ClipboardCheck size={18} /></span><strong>{pending.toString().padStart(2, "0")}<span className="stat-pill">Action needed</span></strong><button className="stat-foot stat-action" onClick={() => navigate("review")}>Let’s check the details <ArrowRight size={14} /></button></div><div className="stat-card"><span className="stat-label">Missing evidence<FileText size={18} /></span><strong>{missing.toString().padStart(2, "0")}</strong><span className="stat-foot"><span className="amber-text">Follow-up needed</span> with suppliers</span></div></section>
      <section className="insight-grid"><div className="readiness-card"><div className="card-heading"><h2>Evidence readiness</h2><ShieldCheck size={19} /></div><p>Small steps. Stronger reporting.</p><div className="readiness-visual"><div className="readiness-ring" style={{ "--readiness": `${readiness}%` } as CSSProperties}><div><strong>{readiness}<span>%</span></strong><small>of checklist reviewed</small></div></div></div><div className="readiness-legend"><span><i className="lime-dot" />Reviewed<strong>{reviewed}</strong></span><span><i className="muted-dot" />Still to complete<strong>{expected - reviewed}</strong></span></div><button className="readiness-button" onClick={() => navigate("review")}>Continue your review <ArrowRight size={16} /></button><small className="readiness-note">Evidence progress, not a compliance certification.</small></div>
      <div className="panel trend-card"><div className="card-heading"><div><h2>Emissions at a glance</h2><p>A preview of your future reporting insights</p></div><span className="icon-tile"><Leaf size={18} /></span></div><EmissionsChart /></div>
      <div className="panel next-card"><div className="card-heading"><h2>Your next steps</h2><span className="count-circle">3</span></div><div className="next-step"><span className="step-icon amber-bg"><ClipboardCheck size={19} /></span><div><strong>Review your evidence</strong><p>{pending} documents need a human check.</p><button onClick={() => navigate("review")}>Review documents <ArrowRight size={14} /></button></div></div><div className="next-step"><span className="step-icon blue-bg"><Users size={19} /></span><div><strong>Fill the evidence gaps</strong><p>{missing} checklist items are still missing.</p><button onClick={() => navigate("suppliers")}>View suppliers <ArrowRight size={14} /></button></div></div><div className="next-step"><span className="step-icon green-bg"><FileCheck2 size={19} /></span><div><strong>Prepare your data pack</strong><p>Bring your evidence into one place.</p><button onClick={() => navigate("reports")}>Go to reports <ArrowRight size={14} /></button></div></div></div></section>
      <section className="panel supplier-panel"><div className="section-heading"><div><h2>Your supplier network <span className="inline-count">{suppliers.length}</span></h2><p>Good reporting starts with connected suppliers.</p></div><button className="text-link" onClick={() => navigate("suppliers")}>View all suppliers <ArrowRight size={16} /></button></div><Table><TableHeader><TableRow><TableHead>Supplier</TableHead><TableHead>Material</TableHead><TableHead>Evidence readiness</TableHead><TableHead>Status</TableHead><TableHead>Last updated</TableHead><TableHead><span className="sr-only">Open supplier</span></TableHead></TableRow></TableHeader><TableBody>{suppliers.slice(0, 4).map((s, i) => <TableRow key={s.id}><TableCell><div className="supplier-identity"><span className={`supplier-avatar avatar-${i % 4}`}>{s.initials}</span><div><strong>{s.name}</strong><small>{s.location}</small></div></div></TableCell><TableCell>{s.material}</TableCell><TableCell><div className="table-progress"><Progress value={supplierReadiness(s.id)} aria-label={`${s.name} evidence reviewed`} /><span>{supplierReadiness(s.id)}%</span></div></TableCell><TableCell><Status value={supplierStatus(s.id)} /></TableCell><TableCell className="muted">{docs.filter(d => d.supplierId === s.id).map(d => d.date).sort().at(-1) ?? "No evidence"}</TableCell><TableCell><button className="row-action" aria-label={`View ${s.name}`} onClick={() => setSelectedSupplier(s)}><ArrowUpRight size={17} /></button></TableCell></TableRow>)}</TableBody></Table><div className="table-bottom"><span>Showing {Math.min(suppliers.length, 4)} of {suppliers.length} suppliers</span><span><ShieldCheck size={14} />Every number starts with evidence.</span></div></section>
      <section className="workspace-note"><span className="note-icon"><Sparkles size={18} /></span><div><strong>A connected workflow, from upload to review.</strong><span>This demo uses sample data. Your session changes stay in this tab.</span></div><button onClick={() => navigate("guide")}>See how it works <ArrowUpRight size={16} /></button></section>
    </> : view === "suppliers" ? <SuppliersView suppliers={suppliers} docs={docs} openSupplier={setSelectedSupplier} add={() => setAddSupplierOpen(true)} />
    : view === "documents" || view === "review" ? <DocumentsView key={`${view}-${period}`} suppliers={suppliers} docs={docs} openReview={setSelectedDocument} upload={upload} reviewOnly={view === "review"} />
    : view === "reports" ? <ReportsView key={period} suppliers={suppliers} docs={docs} period={period} company={company} navigate={navigate} />
    : view === "settings" ? <SettingsView company={company} setCompany={setCompany} />
    : <GuideView navigate={navigate} />}
    <footer className="page-footer"><span>CarbonLedger <span className="footer-dot">·</span> Built for a lower-carbon trade.</span><span><span className="footer-status" />Demo workspace <span className="footer-dot">·</span> Session only</span></footer></main></div>
    <SupplierDialog open={addSupplierOpen} close={() => setAddSupplierOpen(false)} suppliers={suppliers} add={s => setSuppliers(current => [...current, s])} />
    {uploadOpen && <UploadDialog open close={() => setUploadOpen(false)} suppliers={suppliers} period={period} docs={documents} initialSupplier={uploadSupplier} initialCategory={uploadCategory} add={newDocs => { setDocuments(current => [...newDocs, ...current]); navigate("documents"); }} />}
    <SupplierSheet supplier={selectedSupplier} docs={docs} period={period} close={() => setSelectedSupplier(null)} upload={uploadForSupplier} review={setSelectedDocument} />
    {selectedDocument && <ReviewDialog key={selectedDocument.id} doc={selectedDocument} supplier={suppliers.find(s => s.id === selectedDocument.supplierId)} close={() => setSelectedDocument(null)} save={updated => setDocuments(current => current.map(d => d.id === updated.id ? updated : d))} />}
    <Toaster position="bottom-right" theme="light" /></SidebarProvider>;
}
