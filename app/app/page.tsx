"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Activity, ArrowLeft, ArrowRight, Building2, Check, ChevronDown, Download,
  FileCheck2, FileText, FolderOpen, Leaf, LockKeyhole, LogOut, Plus,
  Settings2, ShieldCheck, Upload, Users, X,
} from "lucide-react";
import {
  acceptEmailCallback, callRpc, currentUser, deleteRow, downloadPrivate,
  insertRow, removePrivate, selectRows, signIn, signOut, signUp,
  supabaseConfigured, updateRow, uploadPrivate, type AuthUser,
} from "@/lib/supabase-rest";
import "./saved-workspace.css";

type Role = "owner" | "admin" | "editor" | "viewer";
type Org = { id: string; name: string; created_at: string };
type Member = { org_id: string; user_id: string; email: string; role: Role; joined_at: string };
type Supplier = { id: string; org_id: string; name: string; location: string; material: string; email: string; created_at: string };
type Document = {
  id: string; org_id: string; supplier_id: string; category: string; period: string;
  filename: string; storage_path: string; size_bytes: number; status: "Needs review" | "Reviewed";
  value: string; unit: string; source: string; notes: string; created_at: string;
  reviewed_at: string | null; reviewed_by: string | null;
};
type Invitation = { id: string; org_id: string; email: string; role: Role; created_at: string; accepted_at: string | null };
type AuditEvent = { id: number; actor_id: string | null; action: string; details: Record<string, string>; created_at: string };
type Section = "overview" | "suppliers" | "documents" | "team" | "activity" | "settings";
const categories = ["Energy record", "Production record", "Precursor data"];
const sections: { id: Section; label: string; icon: typeof Building2 }[] = [
  { id: "overview", label: "Overview", icon: Building2 },
  { id: "suppliers", label: "Suppliers", icon: Users },
  { id: "documents", label: "Documents", icon: FolderOpen },
  { id: "team", label: "Team & access", icon: ShieldCheck },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "settings", label: "Settings", icon: Settings2 },
];
const formatted = (date: string) => new Date(date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
const message = (cause: unknown) => cause instanceof Error ? cause.message : "Something went wrong. Please try again.";

export default function SavedWorkspacePage() {
  const [phase, setPhase] = useState<"loading" | "unconfigured" | "signed-out" | "ready" | "error">("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [organizations, setOrganizations] = useState<Org[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Invitation[]>([]);
  const [org, setOrg] = useState<Org | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [section, setSection] = useState<Section>("overview");
  const [period, setPeriod] = useState("2026-Q3");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [showUpload, setShowUpload] = useState(false);
  const [reviewing, setReviewing] = useState<Document | null>(null);
  const [reviewValue, setReviewValue] = useState("");
  const [reviewUnit, setReviewUnit] = useState("");
  const [reviewSource, setReviewSource] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");

  async function loadOrg(target: Org, personId = user?.id) {
    const [team, network, evidence, invites, history] = await Promise.all([
      selectRows<Member>("organization_members", { org_id: "eq." + target.id, order: "joined_at.asc" }),
      selectRows<Supplier>("suppliers", { org_id: "eq." + target.id, order: "name.asc" }),
      selectRows<Document>("documents", { org_id: "eq." + target.id, order: "created_at.desc" }),
      selectRows<Invitation>("organization_invitations", { org_id: "eq." + target.id, accepted_at: "is.null", order: "created_at.desc" }),
      selectRows<AuditEvent>("audit_events", { org_id: "eq." + target.id, order: "created_at.desc", limit: "30" }),
    ]);
    setOrg(target); setMembers(team); setSuppliers(network); setDocuments(evidence); setInvitations(invites); setEvents(history);
    if (personId) window.localStorage.setItem("carbonledger.active-org." + personId, target.id);
  }

  async function loadHome(person: AuthUser, preferredId?: string) {
    const [orgRows, inviteRows] = await Promise.all([
      selectRows<Org>("organizations", { order: "created_at.desc" }),
      selectRows<Invitation>("organization_invitations", { email: "eq." + person.email.toLowerCase(), accepted_at: "is.null" }),
    ]);
    setUser(person); setOrganizations(orgRows); setPendingInvites(inviteRows);
    const selectedId = preferredId || window.localStorage.getItem("carbonledger.active-org." + person.id);
    const target = orgRows.find(item => item.id === selectedId) || orgRows[0];
    if (target) await loadOrg(target, person.id);
    else { setOrg(null); setMembers([]); setSuppliers([]); setDocuments([]); setInvitations([]); setEvents([]); }
    setPhase("ready");
  }

  async function initialize() {
    if (!supabaseConfigured) { setPhase("unconfigured"); return; }
    try {
      acceptEmailCallback();
      const person = await currentUser();
      if (person) await loadHome(person);
      else setPhase("signed-out");
    } catch (cause) { setError(message(cause)); setPhase("error"); }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => { void initialize(); }, 0);
    return () => window.clearTimeout(timer);
    // This one-time bootstrapping checks the stored Supabase session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function act(work: () => Promise<void>) {
    setBusy(true); setError(""); setNotice("");
    try { await work(); } catch (cause) { setError(message(cause)); }
    finally { setBusy(false); }
  }
  const role = members.find(item => item.user_id === user?.id)?.role ?? "viewer";
  const canEdit = role !== "viewer";
  const canManage = role === "owner" || role === "admin";
  const periodDocs = documents.filter(item => item.period === period);
  const reviewed = periodDocs.filter(item => item.status === "Reviewed").length;
  const missing = suppliers.length * categories.length - new Set(periodDocs.map(item => item.supplier_id + ":" + item.category)).size;
  const supplierName = (id: string) => suppliers.find(item => item.id === id)?.name ?? "Unknown supplier";

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim().toLowerCase();
    const password = String(data.get("password") ?? "");
    await act(async () => {
      if (authMode === "sign-up") {
        const active = await signUp(email, password);
        if (!active) { setNotice("Check your email to confirm your account, then sign in here."); return; }
      } else await signIn(email, password);
      const person = await currentUser();
      if (!person) throw new Error("Sign-in did not complete. Please try again.");
      await loadHome(person);
    });
  }

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    await act(async () => {
      const id = await callRpc<string>("create_organization", { p_name: name });
      await loadHome(user, id);
      setNotice("Your private workspace is ready.");
    });
  }

  async function acceptInvitation(id: string) {
    if (!user) return;
    await act(async () => {
      const orgId = await callRpc<string>("accept_invitation", { p_invitation_id: id });
      await loadHome(user, orgId);
      setNotice("Invitation accepted.");
    });
  }

  async function addSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!org || !user) return;
    const data = new FormData(event.currentTarget);
    const row = {
      org_id: org.id, name: String(data.get("name") ?? "").trim(),
      location: String(data.get("location") ?? "").trim(),
      material: String(data.get("material") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      created_by: user.id,
    };
    await act(async () => {
      await insertRow<Supplier>("suppliers", row);
      await loadOrg(org);
      (event.target as HTMLFormElement).reset();
      setNotice(row.name + " added.");
    });
  }

  async function addDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!org || !user) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File) || !file.size) { setError("Choose a file to upload."); return; }
    if (!/\.(pdf|xlsx|xls|csv|png|jpe?g)$/i.test(file.name)) { setError("Use a PDF, Excel, CSV, PNG or JPG file."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Files must be 10 MB or smaller."); return; }
    const id = crypto.randomUUID();
    const extension = file.name.split(".").at(-1)?.toLowerCase() ?? "bin";
    const path = org.id + "/" + user.id + "/" + id + "." + extension;
    await act(async () => {
      await uploadPrivate(path, file);
      try {
        await insertRow<Document>("documents", {
          id, org_id: org.id, supplier_id: String(data.get("supplier_id")),
          category: String(data.get("category")), period, filename: file.name,
          storage_path: path, mime_type: file.type || "application/octet-stream",
          size_bytes: file.size, created_by: user.id,
        });
      } catch (cause) { await removePrivate(path).catch(() => undefined); throw cause; }
      await loadOrg(org);
      form.reset(); setShowUpload(false);
      setNotice("Evidence uploaded to private storage.");
    });
  }

  function openReview(doc: Document) {
    setReviewing(doc); setReviewValue(doc.value); setReviewUnit(doc.unit);
    setReviewSource(doc.source); setReviewNotes(doc.notes);
  }
  async function saveReview(status: "Needs review" | "Reviewed") {
    if (!org || !reviewing) return;
    if (status === "Reviewed" && (!/^[0-9]+([.][0-9]+)?$/.test(reviewValue.trim()) || !reviewUnit.trim() || !reviewSource.trim())) {
      setError("Add a non-negative value, unit and source reference before marking reviewed."); return;
    }
    await act(async () => {
      await updateRow<Document>("documents", reviewing.id, {
        value: reviewValue.trim(), unit: reviewUnit.trim(), source: reviewSource.trim(),
        notes: reviewNotes.trim(), status,
      });
      await loadOrg(org); setReviewing(null);
      setNotice(status === "Reviewed" ? "Review recorded with your account and time." : "Draft saved.");
    });
  }

  async function downloadDocument(doc: Document) {
    await act(async () => {
      const blob = await downloadPrivate(doc.storage_path);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = doc.filename; document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    });
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!org || !user) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim().toLowerCase();
    const inviteRole = String(data.get("role") ?? "editor");
    await act(async () => {
      await insertRow<Invitation>("organization_invitations", {
        org_id: org.id, email, role: inviteRole, created_by: user.id,
      });
      await loadOrg(org); form.reset();
      setNotice("Invitation created. Copy its link and send it to " + email + ".");
    });
  }

  async function changeRole(member: Member, next: Role) {
    if (!org) return;
    await act(async () => {
      await callRpc<void>("set_member_role", { p_org_id: org.id, p_user_id: member.user_id, p_role: next });
      await loadOrg(org); setNotice("Role updated.");
    });
  }
  async function removeMember(member: Member) {
    if (!org) return;
    await act(async () => {
      await callRpc<void>("remove_member", { p_org_id: org.id, p_user_id: member.user_id });
      await loadOrg(org); setNotice("Member access removed.");
    });
  }
  async function renameOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!org || !user) return;
    const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    await act(async () => {
      await updateRow<Org>("organizations", org.id, { name });
      await loadHome(user, org.id); setNotice("Organization name updated.");
    });
  }

  if (phase === "loading") return <div className="saved-state"><span className="saved-spinner" /><p>Opening your workspace…</p></div>;
  if (phase === "unconfigured") return <div className="saved-state"><span className="saved-state-icon"><LockKeyhole /></span><h1>Saved workspaces are being connected.</h1><p>The demo remains available while private accounts and storage are configured.</p><Link href="/workspace" className="saved-button">Explore the demo <ArrowRight size={17} /></Link></div>;
  if (phase === "error") return <div className="saved-state"><span className="saved-state-icon"><LockKeyhole /></span><h1>We couldn’t open the saved workspace.</h1><p>{error}</p><button className="saved-button" onClick={() => { setPhase("loading"); void initialize(); }}>Try again</button><Link href="/workspace">Open the demo</Link></div>;
  if (phase === "signed-out") return <div className="saved-auth"><div className="saved-auth-art"><Link href="/" className="saved-brand"><span><Leaf size={22} /></span>Carbon<span>Ledger</span></Link><div><span className="saved-kicker">A MORE CONFIDENT EVIDENCE WORKFLOW</span><h1>Every source.<br />One secure place.</h1><p>Bring supplier records, reviews and your team together in a private organisation workspace.</p><div className="saved-auth-proof"><ShieldCheck size={19} /> Private evidence storage · Organisation roles</div></div><small>Evidence preparation only. No compliance certification or EU submission.</small></div><div className="saved-auth-form"><Link href="/" className="saved-back"><ArrowLeft size={16} /> Back to website</Link><div className="saved-auth-card"><span className="saved-kicker">CARBONLEDGER ACCOUNT</span><h2>{authMode === "sign-in" ? "Welcome back." : "Create your account."}</h2><p>{authMode === "sign-in" ? "Sign in to continue your evidence work." : "Start a private workspace for your organisation."}</p><form onSubmit={handleAuth}><label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@company.com" /></label><label>Password<input name="password" type="password" autoComplete={authMode === "sign-in" ? "current-password" : "new-password"} minLength={6} required placeholder="Your password" /></label>{error && <p className="saved-alert">{error}</p>}{notice && <p className="saved-success">{notice}</p>}<button className="saved-button" disabled={busy}>{busy ? "Please wait…" : authMode === "sign-in" ? "Sign in" : "Create account"} <ArrowRight size={17} /></button></form><p className="saved-switch">{authMode === "sign-in" ? "New to CarbonLedger?" : "Already have an account?"} <button onClick={() => { setAuthMode(authMode === "sign-in" ? "sign-up" : "sign-in"); setError(""); setNotice(""); }}>{authMode === "sign-in" ? "Create an account" : "Sign in"}</button></p><div className="saved-demo-link"><span>Just exploring?</span><Link href="/workspace">Open the sample workspace <ArrowRight size={15} /></Link></div></div></div></div>;

  if (!org) return <div className="saved-onboard"><header><Link href="/" className="saved-brand"><span><Leaf size={21} /></span>Carbon<span>Ledger</span></Link><button onClick={() => void act(async () => { await signOut(); setUser(null); setPhase("signed-out"); })}><LogOut size={16} /> Sign out</button></header><main><span className="saved-kicker">YOUR ORGANISATION</span><h1>Start with a place for your evidence.</h1><p>Create a private workspace, or accept an invitation sent to {user?.email}.</p>{error && <div className="saved-alert">{error}</div>}{notice && <div className="saved-success">{notice}</div>}<div className="saved-onboard-grid"><form onSubmit={createOrganization} className="saved-card"><span className="saved-card-icon"><Building2 /></span><h2>Create an organisation</h2><p>You’ll be its owner and can invite teammates later.</p><label>Organisation name<input name="name" required minLength={2} maxLength={100} placeholder="e.g. Sahyadri Aluminium" /></label><button className="saved-button" disabled={busy}>Create workspace <ArrowRight size={16} /></button></form><div className="saved-card"><span className="saved-card-icon"><Users /></span><h2>Invitations for you</h2>{pendingInvites.length ? pendingInvites.map(item => <div key={item.id} className="saved-invite-row"><div><strong>{organizations.find(o => o.id === item.org_id)?.name ?? "Organisation invitation"}</strong><small>{item.role} access · {formatted(item.created_at)}</small></div><button disabled={busy} onClick={() => void acceptInvitation(item.id)}>Accept</button></div>) : <p>No open invitations for this email yet. Ask an admin to invite {user?.email}.</p>}</div></div><Link href="/workspace" className="saved-text-link">Explore the sample workspace <ArrowRight size={15} /></Link></main></div>;

  return <div className="saved-shell">
    <aside className="saved-sidebar"><Link href="/" className="saved-brand"><span><Leaf size={21} /></span>Carbon<span>Ledger</span></Link><span className="saved-sidebar-caption">PRIVATE WORKSPACE</span><div className="saved-org-select"><span className="saved-org-avatar">{initials(org.name)}</span><div><strong>{org.name}</strong><small>{role} access</small></div><ChevronDown size={15} /><select aria-label="Switch organisation" value={org.id} onChange={event => { const next = organizations.find(item => item.id === event.target.value); if (next) void act(() => loadOrg(next)); }}>{organizations.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div><span className="saved-nav-label">WORKSPACE</span><nav>{sections.map(item => { const Icon = item.icon; return <button key={item.id} className={section === item.id ? "active" : ""} onClick={() => setSection(item.id)}><Icon size={18} />{item.label}{item.id === "documents" && periodDocs.length > 0 && <small>{periodDocs.length}</small>}</button>; })}</nav><div className="saved-sidebar-bottom"><div className="saved-sidebar-tip"><ShieldCheck size={20} /><strong>Source-led evidence</strong><p>Original files remain private to this organisation.</p></div><Link href="/workspace"><FileText size={18} /> View sample demo</Link><button onClick={() => void act(async () => { await signOut(); setUser(null); setPhase("signed-out"); })}><LogOut size={18} /> Sign out</button></div></aside>
    <div className="saved-main"><header className="saved-topbar"><div><span>Workspace</span><span className="saved-topbar-slash">/</span><strong>{sections.find(item => item.id === section)?.label}</strong></div><div><span className="saved-private"><LockKeyhole size={14} /> Private organisation</span><span className="saved-user-avatar">{initials(user?.email?.split("@")[0] ?? "U")}</span></div></header><main className="saved-content"><div className="saved-heading"><div><span className="saved-kicker">YOUR EVIDENCE WORKSPACE</span><h1>{section === "overview" ? "Your work, in view." : sections.find(item => item.id === section)?.label}</h1><p>{section === "overview" ? "A clear record of what your organisation has collected and reviewed." : section === "team" ? "Decide who can see, edit and manage your organisation’s evidence." : "Keep supplier evidence organised and traceable."}</p></div><div className="saved-heading-actions">{["overview", "suppliers", "documents"].includes(section) && <select aria-label="Working period" value={period} onChange={event => setPeriod(event.target.value)}><option value="2026-Q3">Jul – Sep 2026</option><option value="2026-Q2">Apr – Jun 2026</option><option value="2026-Q1">Jan – Mar 2026</option><option value="2026-Q4">Oct – Dec 2026</option></select>}{canEdit && section === "documents" && <button className="saved-button" onClick={() => setShowUpload(true)}><Plus size={16} /> Upload evidence</button>}</div></div>
      {error && <div className="saved-alert" role="alert"><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError("")}><X size={16} /></button></div>}{notice && <div className="saved-success" role="status"><Check size={17} />{notice}<button aria-label="Dismiss notice" onClick={() => setNotice("")}><X size={16} /></button></div>}

      {section === "overview" && <><div className="saved-metrics"><div className="saved-card"><span>Suppliers <Users size={18} /></span><strong>{suppliers.length.toString().padStart(2, "0")}</strong><small>In this organisation</small></div><div className="saved-card"><span>Documents <FolderOpen size={18} /></span><strong>{periodDocs.length.toString().padStart(2, "0")}</strong><small>For {period}</small></div><div className="saved-card"><span>Reviewed <FileCheck2 size={18} /></span><strong>{reviewed.toString().padStart(2, "0")}</strong><small>Checked against source</small></div><div className="saved-card"><span>Evidence gaps <Activity size={18} /></span><strong>{Math.max(0, missing).toString().padStart(2, "0")}</strong><small>Across 3 sample categories</small></div></div><div className="saved-overview-grid"><div className="saved-card"><div className="saved-section-head"><div><span className="saved-kicker">CURRENT PERIOD</span><h2>Evidence register</h2></div><button className="saved-text-link" onClick={() => setSection("documents")}>View documents <ArrowRight size={16} /></button></div>{periodDocs.length ? periodDocs.slice(0, 5).map(item => <div className="saved-list-row" key={item.id}><span className="saved-file-icon"><FileText size={18} /></span><div><strong>{item.filename}</strong><small>{supplierName(item.supplier_id)} · {item.category}</small></div><span className={"saved-pill " + (item.status === "Reviewed" ? "good" : "pending")}>{item.status}</span></div>) : <div className="saved-empty"><FolderOpen size={25} /><strong>No evidence yet</strong><p>Add a supplier, then upload their source records.</p></div>}</div><div className="saved-card saved-next"><span className="saved-card-icon"><ShieldCheck /></span><h2>Built around the source.</h2><p>Each document is tied to a supplier and period. Review records include the account and time that approved the value.</p><button className="saved-button" onClick={() => setSection(suppliers.length ? "documents" : "suppliers")}>{suppliers.length ? "Continue reviewing" : "Add your first supplier"} <ArrowRight size={16} /></button><small>Evidence preparation only. This is not CBAM certification.</small></div></div></>}

      {section === "suppliers" && <div className="saved-two-column"><div className="saved-card"><div className="saved-section-head"><div><span className="saved-kicker">SUPPLIER NETWORK</span><h2>{suppliers.length} suppliers</h2></div></div>{suppliers.length ? suppliers.map(item => <div className="saved-list-row" key={item.id}><span className="saved-supplier-avatar">{initials(item.name)}</span><div><strong>{item.name}</strong><small>{item.location} · {item.material}</small></div><span className="saved-count">{periodDocs.filter(doc => doc.supplier_id === item.id).length} files</span></div>) : <div className="saved-empty"><Users size={25} /><strong>No suppliers added</strong><p>Start your network with the organisation that provides your materials.</p></div>}</div>{canEdit && <form onSubmit={addSupplier} className="saved-card saved-form"><span className="saved-kicker">ADD TO YOUR NETWORK</span><h2>New supplier</h2><label>Supplier name<input name="name" required minLength={2} maxLength={100} placeholder="e.g. Deccan Aluminium" /></label><label>Location<input name="location" maxLength={160} placeholder="e.g. Pune, Maharashtra" /></label><label>Material supplied<input name="material" maxLength={160} placeholder="e.g. Aluminium billets" /></label><label>Contact email <small>Optional</small><input name="email" type="email" maxLength={160} placeholder="supplier@example.com" /></label><button disabled={busy} className="saved-button"><Plus size={16} /> Add supplier</button></form>}</div>}

      {section === "documents" && <div className="saved-card"><div className="saved-section-head"><div><span className="saved-kicker">SOURCE REGISTER · {period}</span><h2>{periodDocs.length} documents</h2></div>{canEdit && <button className="saved-button" onClick={() => setShowUpload(true)}><Upload size={16} /> Upload</button>}</div>{periodDocs.length ? <div className="saved-table-wrap"><table><thead><tr><th>Document</th><th>Supplier</th><th>Category</th><th>Status</th><th>Action</th></tr></thead><tbody>{periodDocs.map(item => <tr key={item.id}><td><div className="saved-table-file"><span className="saved-file-icon"><FileText size={18} /></span><div><strong>{item.filename}</strong><small>{formatted(item.created_at)} · {(item.size_bytes / 1024).toFixed(0)} KB</small></div></div></td><td>{supplierName(item.supplier_id)}</td><td>{item.category}</td><td><span className={"saved-pill " + (item.status === "Reviewed" ? "good" : "pending")}>{item.status}</span></td><td><button className="saved-text-link" onClick={() => openReview(item)}>{canEdit ? "Review" : "View"} <ArrowRight size={15} /></button></td></tr>)}</tbody></table></div> : <div className="saved-empty"><FolderOpen size={27} /><strong>Nothing uploaded for {period}</strong><p>{suppliers.length ? "Upload a bill, production record or precursor source file." : "Add a supplier first, then upload evidence."}</p>{canEdit && suppliers.length > 0 && <button className="saved-button" onClick={() => setShowUpload(true)}>Upload evidence <ArrowRight size={16} /></button>}</div>}<p className="saved-footnote"><LockKeyhole size={14} /> Original files are fetched only with a signed-in member’s access token.</p></div>}

      {section === "team" && <div className="saved-two-column"><div className="saved-card"><div className="saved-section-head"><div><span className="saved-kicker">ORGANISATION ACCESS</span><h2>{members.length} members</h2></div></div>{members.map(member => <div className="saved-member-row" key={member.user_id}><span className="saved-user-avatar">{initials(member.email.split("@")[0])}</span><div><strong>{member.email}</strong><small>Joined {formatted(member.joined_at)}</small></div>{role === "owner" && member.role !== "owner" ? <select aria-label={"Role for " + member.email} value={member.role} disabled={busy} onChange={event => void changeRole(member, event.target.value as Role)}><option value="admin">Admin</option><option value="editor">Editor</option><option value="viewer">Viewer</option></select> : <span className="saved-role">{member.role}</span>}{canManage && member.role !== "owner" && (role === "owner" || member.role !== "admin") && <button className="saved-remove" disabled={busy} aria-label={"Remove " + member.email} onClick={() => void removeMember(member)}>Remove</button>}</div>)}<div className="saved-role-guide"><strong>Role permissions</strong><p><b>Owner</b> manages roles. <b>Admin</b> manages the team. <b>Editor</b> adds and reviews evidence. <b>Viewer</b> can only read and download.</p></div></div><div>{canManage && <form className="saved-card saved-form" onSubmit={invite}><span className="saved-kicker">GROW YOUR TEAM</span><h2>Invite a teammate</h2><p>Create an invite for their email. Share the link yourself; CarbonLedger does not send email yet.</p><label>Email<input name="email" type="email" required placeholder="colleague@company.com" /></label><label>Access role<select name="role" defaultValue="editor"><option value="editor">Editor · add and review</option><option value="viewer">Viewer · read only</option><option value="admin">Admin · manage people</option></select></label><button className="saved-button" disabled={busy}>Create invitation <ArrowRight size={16} /></button></form>}{canManage && invitations.length > 0 && <div className="saved-card saved-invitations"><h2>Pending invitations</h2>{invitations.map(item => <div key={item.id} className="saved-invite-row"><div><strong>{item.email}</strong><small>{item.role} · {formatted(item.created_at)}</small></div><button onClick={() => void act(async () => { await navigator.clipboard.writeText(window.location.origin + "/app?invite=" + item.id); setNotice("Invite link copied. Send it to " + item.email + "."); })}>Copy link</button><button className="saved-remove" onClick={() => void act(async () => { await deleteRow("organization_invitations", item.id); await loadOrg(org); setNotice("Invitation cancelled."); })}>Cancel</button></div>)}</div>}</div></div>}

      {section === "activity" && <div className="saved-card"><span className="saved-kicker">TRACEABLE CHANGES</span><h2>Recent activity</h2><p className="saved-muted">The last 30 organisation changes are recorded by the database.</p>{events.length ? events.map(item => <div className="saved-list-row" key={item.id}><span className="saved-file-icon"><Activity size={17} /></span><div><strong>{item.action.replaceAll(".", " · ").replaceAll("_", " ")}</strong><small>{item.details.filename || item.details.name || item.details.role || "Organisation record"} · {formatted(item.created_at)}</small></div><span className="saved-role">{members.find(member => member.user_id === item.actor_id)?.email || "System"}</span></div>) : <div className="saved-empty"><Activity size={25} /><strong>No activity yet</strong><p>Updates will appear here as your team works.</p></div>}</div>}

      {section === "settings" && <div className="saved-two-column">
        <form className="saved-card saved-form" onSubmit={renameOrganization}>
          <span className="saved-kicker">COMPANY PROFILE</span><h2>Organisation details</h2>
          <label>Organisation name<input name="name" defaultValue={org.name} disabled={!canManage} required minLength={2} maxLength={100} /></label>
          <label>Workspace ID<input value={org.id} readOnly /></label><label>Your role<input value={role} readOnly /></label>
          {canManage && <button className="saved-button" disabled={busy}>Save changes <Check size={16} /></button>}
        </form>
        <div className="saved-card saved-security">
          <span className="saved-card-icon"><LockKeyhole /></span><h2>Private by design.</h2>
          <p>Access to each organisation’s records and original files is checked by database and storage policies. Members only see organisations they belong to.</p>
          <ul><li><Check size={16} /> Account sign-in</li><li><Check size={16} /> Organisation roles</li><li><Check size={16} /> Private source files</li><li><Check size={16} /> Review activity</li></ul>
          <p className="saved-muted">This workspace prepares evidence. It does not calculate emissions or submit to the EU registry.</p>
        </div>
        <div className="saved-card saved-form">
          <span className="saved-kicker">YOUR WORKSPACES</span><h2>Switch or create</h2>
          {pendingInvites.map(item => <div className="saved-invite-row" key={item.id}><div><strong>Invitation to another organisation</strong><small>{item.role} access · {formatted(item.created_at)}</small></div><button disabled={busy} onClick={() => void acceptInvitation(item.id)}>Accept</button></div>)}
          {organizations.map(item => <button className="saved-org-row" key={item.id} onClick={() => void act(() => loadOrg(item))} disabled={busy || item.id === org.id}><span className="saved-supplier-avatar">{initials(item.name)}</span><strong>{item.name}</strong>{item.id === org.id && <span>Current</span>}</button>)}
          <form onSubmit={createOrganization} className="saved-create-org"><label>New organisation name<input name="name" required minLength={2} maxLength={100} placeholder="e.g. New manufacturing group" /></label><button className="saved-secondary" disabled={busy}><Plus size={15} /> Create workspace</button></form>
        </div>
      </div>}
      <footer className="saved-footer"><span>CarbonLedger · Evidence preparation workspace</span><span><LockKeyhole size={13} /> {org.name} · {role}</span></footer>
    </main></div>

    {showUpload && <div className="saved-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setShowUpload(false); }}><form className="saved-modal saved-form" onSubmit={addDocument}><div className="saved-modal-head"><span className="saved-card-icon"><Upload /></span><button type="button" aria-label="Close" onClick={() => setShowUpload(false)}><X size={19} /></button></div><h2>Upload source evidence</h2><p>Original files stay in this organisation’s private storage. Add one file at a time, up to 10 MB.</p>{error && <p className="saved-alert" role="alert">{error}</p>}<label>Supplier<select name="supplier_id" required defaultValue={suppliers[0]?.id ?? ""}>{suppliers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Category<select name="category" required>{categories.map(item => <option key={item}>{item}</option>)}</select></label><label>Source file<input name="file" type="file" accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg" required /></label><div className="saved-modal-actions"><button type="button" className="saved-secondary" onClick={() => setShowUpload(false)}>Cancel</button><button className="saved-button" disabled={busy || !suppliers.length}>Upload evidence <ArrowRight size={16} /></button></div></form></div>}

    {reviewing && <div className="saved-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setReviewing(null); }}><div className="saved-modal saved-form"><div className="saved-modal-head"><span className="saved-card-icon"><FileText /></span><button aria-label="Close" onClick={() => setReviewing(null)}><X size={19} /></button></div><span className="saved-kicker">{supplierName(reviewing.supplier_id)} · {reviewing.category}</span><h2>Review the source</h2><p>{reviewing.filename}</p>{error && <p className="saved-alert" role="alert">{error}</p>}<button className="saved-secondary saved-download" disabled={busy} onClick={() => void downloadDocument(reviewing)}><Download size={16} /> Download original</button><label>Reported value<input type="number" min="0" step="any" value={reviewValue} onChange={event => setReviewValue(event.target.value)} disabled={!canEdit} placeholder="e.g. 24850" /></label><label>Unit<input value={reviewUnit} onChange={event => setReviewUnit(event.target.value)} disabled={!canEdit} placeholder="e.g. kWh or tonnes" maxLength={40} /></label><label>Source reference<input value={reviewSource} onChange={event => setReviewSource(event.target.value)} disabled={!canEdit} placeholder="e.g. Page 2, total consumption" maxLength={300} /></label><label>Notes<textarea value={reviewNotes} onChange={event => setReviewNotes(event.target.value)} disabled={!canEdit} rows={3} maxLength={2000} /></label>{reviewing.reviewed_at && <p className="saved-muted">Last reviewed {formatted(reviewing.reviewed_at)} by {members.find(member => member.user_id === reviewing.reviewed_by)?.email || "a former member"}.</p>}<p className="saved-footnote">Internal evidence review only. This does not verify emissions or certify CBAM compliance.</p>{canEdit && <div className="saved-modal-actions"><button className="saved-secondary" disabled={busy} onClick={() => void saveReview("Needs review")}>Save draft</button><button className="saved-button" disabled={busy} onClick={() => void saveReview("Reviewed")}><Check size={16} /> Mark reviewed</button></div>}</div></div>}
  </div>;
}
