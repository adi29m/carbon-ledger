import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronDown,
  CircleAlert,
  ClipboardCheck,
  FileCheck2,
  FileText,
  FolderOpen,
  Globe2,
  Layers3,
  LockKeyhole,
  Menu,
  MoveUpRight,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { LandingMotion } from "@/components/landing-motion";
import "./landing.css";

export const metadata: Metadata = {
  title: "CarbonLedger — Clarity for every supplier record",
  description:
    "A clear evidence workspace for aluminium exporters preparing CBAM data. Map suppliers, review source documents, and export draft evidence packs in one place.",
  openGraph: {
    title: "CarbonLedger — Clarity for every supplier record",
    description: "A clearer path from supplier files to a reviewable evidence trail.",
    images: [{ url: "/images/aluminium-plant.webp", width: 1935, height: 812, alt: "Aluminium production facility at dusk" }],
  },
  twitter: { card: "summary_large_image" },
};

const process = [
  {
    number: "01",
    icon: Users,
    title: "Map your network",
    description:
      "Give every supplier a place in your workspace. See which records are present, which need review, and where to follow up.",
    detail: "Supplier-level checklist",
  },
  {
    number: "02",
    icon: ScanSearch,
    title: "Ground data in evidence",
    description:
      "Add bills, production records, and other source files. Record values, units, and source references with a human review step.",
    detail: "Source-linked review",
  },
  {
    number: "03",
    icon: FileCheck2,
    title: "Prepare the handoff",
    description:
      "Export a draft evidence register and readable pack so your team can work from the same set of reviewed inputs.",
    detail: "Draft exports",
  },
];

const faqs = [
  {
    question: "What is CarbonLedger today?",
    answer:
      "CarbonLedger is an interactive prototype for organising supplier evidence. You can explore supplier checklists, upload files for manual review, and download draft evidence packs. It is focused on aluminium workflows in this first version.",
  },
  {
    question: "Does it calculate embedded emissions or submit CBAM declarations?",
    answer:
      "No. This version does not calculate emissions, verify regulatory data, buy certificates, or submit to the EU registry. Those capabilities need a product-specific methodology and specialist validation before they can be built responsibly.",
  },
  {
    question: "Where do files go in the demo?",
    answer:
      "Uploaded files and changes stay in your browser's current session. They are not sent to a server, and refreshing or closing the tab resets the workspace. Download any draft you want to keep.",
  },
  {
    question: "Who is responsible for CBAM reporting?",
    answer:
      "Under the EU's definitive CBAM regime, the formal obligations generally sit with EU importers or their indirect customs representatives. Non-EU producers supply the installation and emissions information those partners need. Confirm your specific obligations with a qualified adviser.",
  },
];

function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link className={`landing-brand ${light ? "landing-brand-light" : ""}`} href="/" aria-label="CarbonLedger home">
      <span className="landing-brand-mark" aria-hidden="true">
        <svg viewBox="0 0 38 38" fill="none">
          <path d="M9 8.5h14.5L29 14v15.5H9V8.5Z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M23.5 8.5V14H29M13 21h12M13 25h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="13" cy="14" r="2" fill="currentColor" />
        </svg>
      </span>
      <span className="landing-brand-type">carbon<span>ledger</span><small>THE EVIDENCE SYSTEM</small></span>
    </Link>
  );
}

function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link className="landing-text-link" href={href}>{children}<ArrowUpRight size={17} /></Link>;
}

export default function LandingPage() {
  return (
    <div className="landing-page">
      <LandingMotion />
      <a className="landing-skip" href="#landing-main">Skip to content</a>

      <header className="landing-header">
        <div className="landing-header-inner">
          <Brand />
          <div className="landing-header-index">
            <span className="landing-index-stamp"><span /> CBAM / 2026</span>
            <nav className="landing-desktop-nav" aria-label="Main navigation">
              <a href="#why" data-nav-target="why" className="is-active" aria-current="location"><span>01</span> Context</a>
              <a href="#product" data-nav-target="product"><span>02</span> Platform</a>
              <a href="#workflow" data-nav-target="workflow"><span>03</span> Process</a>
              <a href="#faq" data-nav-target="faq"><span>04</span> Notes</a>
            </nav>
          </div>
          <Link className="landing-header-cta" href="/workspace"><span>Enter workspace</span><span className="landing-header-cta-icon"><ArrowUpRight size={18} /></span></Link>
          <details className="landing-mobile-nav">
            <summary aria-label="Navigation menu"><span>MENU</span><Menu size={20} /></summary>
            <nav aria-label="Mobile navigation">
              <span className="landing-mobile-nav-label">THE FIELD INDEX <span>2026 / CBAM</span></span>
              <a href="#why" data-nav-target="why" aria-label="The challenge"><span>01</span> The challenge <ArrowUpRight size={16} /></a>
              <a href="#product" data-nav-target="product" aria-label="The workspace"><span>02</span> The workspace <ArrowUpRight size={16} /></a>
              <a href="#workflow" data-nav-target="workflow" aria-label="How it works"><span>03</span> How it works <ArrowUpRight size={16} /></a>
              <a href="#faq" data-nav-target="faq" aria-label="Questions"><span>04</span> Questions <ArrowUpRight size={16} /></a>
              <Link className="landing-mobile-demo" href="/workspace">Enter workspace <ArrowUpRight size={18} /></Link>
            </nav>
          </details>
        </div>
        <div className="landing-header-progress" aria-hidden="true"><span /></div>
      </header>

      <main id="landing-main">
        <section className="landing-hero" aria-labelledby="hero-title">
          <Image
            src="/images/aluminium-plant.webp"
            alt="Aluminium profiles outside a modern production facility at dusk"
            fill
            priority
            sizes="100vw"
            className="landing-hero-image"
          />
          <div className="landing-hero-overlay" />
          <div className="landing-hero-grid" aria-hidden="true" />
          <div className="landing-hero-trace" aria-hidden="true">
            <svg viewBox="0 0 420 280" fill="none">
              <path className="landing-trace-path" d="M28 216C100 216 106 82 185 82S280 173 392 38" />
              <circle className="landing-trace-node landing-trace-node-one" cx="28" cy="216" r="5" />
              <circle className="landing-trace-node landing-trace-node-two" cx="185" cy="82" r="5" />
              <circle className="landing-trace-node landing-trace-node-three" cx="392" cy="38" r="5" />
            </svg>
            <span className="landing-trace-label landing-trace-label-one">01 / SOURCE</span>
            <span className="landing-trace-label landing-trace-label-two">02 / REVIEW</span>
            <span className="landing-trace-label landing-trace-label-three">03 / HANDOFF</span>
          </div>
          <div className="landing-hero-content">
            <span className="landing-kicker landing-hero-kicker"><span className="landing-kicker-dot" /> THE EVIDENCE BEHIND BETTER TRADE</span>
            <h1 id="hero-title"><span className="landing-headline-line">Every export begins</span><span className="landing-headline-line">with <em>evidence.</em></span></h1>
            <p>Bring scattered supplier records into one clear, reviewable workspace for your CBAM preparation.</p>
            <div className="landing-hero-actions">
              <Link className="landing-button landing-button-lime" href="/workspace">Explore the demo <ArrowUpRight size={19} /></Link>
              <a className="landing-button landing-button-ghost" href="#workflow">See how it works <ArrowDown size={18} /></a>
            </div>
            <div className="landing-hero-note"><ShieldCheck size={16} /> Built for aluminium exporters and the teams behind them</div>
          </div>
          <div className="landing-hero-float" aria-hidden="true">
            <div className="landing-hero-float-inner">
              <div className="landing-hero-float-top"><span className="landing-float-icon"><Layers3 size={19} /></span><span>THE EVIDENCE TRAIL</span><CheckCheck size={18} /></div>
              <div className="landing-float-lines"><span><i /> Supplier records</span><span><i /> Source documents</span><span><i /> Human review</span></div>
              <div className="landing-float-bottom"><span>One connected view</span><ArrowUpRight size={16} /></div>
            </div>
          </div>
          <div className="landing-hero-bottom">
            <span>01 / 03 &nbsp; SUPPLIER NETWORK</span>
            <span>02 / 03 &nbsp; EVIDENCE REVIEW</span>
            <span>03 / 03 &nbsp; DRAFT HANDOFF</span>
          </div>
        </section>

        <div className="landing-ticker" aria-label="From scattered data to source-linked clarity">
          <div className="landing-ticker-track">
            {[0, 1].map((copy) => <div className="landing-ticker-set" key={copy} aria-hidden={copy === 1}>
              <span>From scattered data to source-linked clarity</span><i /><span>Built for the people behind every number</span><i />
            </div>)}
          </div>
        </div>

        <section className="landing-intro landing-container" id="why">
          <div className="landing-intro-heading" data-reveal>
            <span className="landing-eyebrow"><span>01</span> THE CHALLENGE</span>
            <h2>The hard part isn&apos;t one number. <em>It&apos;s everything behind it.</em></h2>
          </div>
          <div className="landing-intro-copy" data-reveal>
            <p>For an exporter, the evidence can live across suppliers, teams, spreadsheets, invoices, and inboxes. Finding the right record at the right time should not depend on who remembers where it was saved.</p>
            <TextLink href="#workflow">See a clearer way to work</TextLink>
          </div>
        </section>

        <section className="landing-story landing-container" aria-label="Supplier evidence story">
          <div className="landing-story-photo" data-reveal="photo">
            <Image src="/images/aluminium-production.webp" alt="A worker checks aluminium profiles during production" fill sizes="(max-width: 800px) 100vw, 48vw" />
            <span className="landing-photo-label"><span /> FROM THE FACTORY FLOOR</span>
          </div>
          <div className="landing-story-card" data-reveal="right">
            <div className="landing-story-card-top"><span className="landing-eyebrow">THE WORK BEHIND THE WORK</span><FolderOpen size={23} /></div>
            <h3>One material.<br /><em>Many moving parts.</em></h3>
            <p>Each supplier has its own records, formats, and open questions. CarbonLedger gives your team a place to gather the evidence and see the gaps.</p>
            <div className="landing-mini-checklist">
              <div><span className="landing-mini-icon"><Users size={18} /></span><span>Supplier network</span><Check size={16} /></div>
              <div><span className="landing-mini-icon"><FileText size={18} /></span><span>Source documents</span><Check size={16} /></div>
              <div><span className="landing-mini-icon"><ClipboardCheck size={18} /></span><span>Review status</span><span className="landing-mini-pending">IN VIEW</span></div>
            </div>
          </div>
        </section>

        <section className="landing-product" id="product">
          <div className="landing-container">
            <div className="landing-section-heading landing-product-heading" data-reveal>
              <div><span className="landing-eyebrow"><span>02</span> THE WORKSPACE</span><h2>Complex process.<br /><em>Clearer picture.</em></h2></div>
              <p>Give your team a shared view of suppliers, source documents, and review progress—without pretending a checklist is a compliance certificate.</p>
            </div>
            <div className="landing-screen-shell" data-reveal="depth">
              <div className="landing-screen-bar"><div><i /><i /><i /></div><span>CarbonLedger / Overview</span><span>INTERACTIVE DEMO</span></div>
              <Image src="/images/workspace-overview.webp" alt="CarbonLedger overview showing supplier counts, evidence readiness, and next steps" width={1440} height={900} sizes="(max-width: 1000px) 100vw, 84vw" className="landing-screen-image" />
            </div>
            <div className="landing-product-caption" data-reveal><span><Sparkles size={18} /> MADE FOR THE DETAILS</span><p>One calm place to see what is reviewed and what still needs attention.</p><TextLink href="/workspace">Open the workspace</TextLink></div>
            <div className="landing-screen-grid">
              <article className="landing-screen-feature" data-reveal="left"><div className="landing-screen-mini"><Image src="/images/workspace-suppliers.webp" alt="Supplier cards with evidence checklists and status" width={1200} height={780} sizes="(max-width: 800px) 100vw, 42vw" /></div><div><span>01 / SUPPLIERS</span><h3>Know where every supplier stands.</h3><p>See evidence status across your network and focus follow-ups where they matter.</p></div></article>
              <article className="landing-screen-feature" data-reveal="right"><div className="landing-screen-mini"><Image src="/images/workspace-documents.webp" alt="Document register with source files and review status" width={1200} height={780} sizes="(max-width: 800px) 100vw, 42vw" /></div><div><span>02 / DOCUMENTS</span><h3>Keep the source close to the number.</h3><p>Review inputs alongside the file and retain a clear source reference.</p></div></article>
            </div>
          </div>
        </section>

        <section className="landing-workflow landing-container" id="workflow">
          <div className="landing-section-heading" data-reveal>
            <div><span className="landing-eyebrow"><span>03</span> HOW IT WORKS</span><h2>A better path from <em>file to finding.</em></h2></div>
            <p>Simple enough to start today. Structured enough to make the next conversation with your importer or specialist more productive.</p>
          </div>
          <div className="landing-process-grid">
            {process.map(({ number, icon: Icon, title, description, detail }) => <article className="landing-process-card" key={number} data-reveal>
              <div className="landing-process-top"><span>{number}</span><Icon size={27} strokeWidth={1.4} /></div>
              <h3>{title}</h3><p>{description}</p><div className="landing-process-footer"><span>{detail}</span><ArrowUpRight size={17} /></div>
            </article>)}
          </div>
          <div className="landing-workflow-link" data-reveal><Link className="landing-button landing-button-dark" href="/workspace">Try the workflow <ArrowUpRight size={19} /></Link><span>No account required for the demo</span></div>
        </section>

        <section className="landing-perspective" aria-label="Who CarbonLedger is for">
          <div className="landing-perspective-image"><Image src="/images/export-port.webp" alt="Cargo containers and cranes at a port at sunset" fill sizes="(max-width: 900px) 100vw, 50vw" /></div>
          <div className="landing-perspective-content" data-reveal>
            <span className="landing-eyebrow"><span>04</span> BUILT FOR THE HANDOFF</span>
            <h2>From your facility to <em>the wider world.</em></h2>
            <p>When a shipment crosses borders, the evidence behind it crosses teams. CarbonLedger helps non-EU producers organise records that importer partners and advisers may need to assess.</p>
            <div className="landing-audiences"><span><Globe2 size={18} /> Export manufacturers</span><span><Users size={18} /> Sustainability & procurement teams</span><span><ShieldCheck size={18} /> Importer partners & advisers</span></div>
            <TextLink href="/workspace">See the demo in action</TextLink>
          </div>
        </section>

        <section className="landing-principles landing-container">
          <div data-reveal><span className="landing-eyebrow"><span>05</span> BUILT WITH CARE</span><h2>Clarity that <em>holds up to a closer look.</em></h2></div>
          <div className="landing-principle-grid">
            <div data-reveal><span className="landing-principle-icon"><FolderOpen size={22} /></span><h3>Trace the source</h3><p>Keep a document and reference alongside every manually recorded value.</p></div>
            <div data-reveal><span className="landing-principle-icon"><CircleAlert size={22} /></span><h3>See the gaps</h3><p>Make missing and unreviewed evidence visible before a handoff.</p></div>
            <div data-reveal><span className="landing-principle-icon"><LockKeyhole size={22} /></span><h3>Stay honest about scope</h3><p>Draft outputs are clearly marked. Specialist verification remains essential.</p></div>
          </div>
        </section>

        <section className="landing-faq" id="faq">
          <div className="landing-container landing-faq-grid">
            <div data-reveal><span className="landing-eyebrow"><span>06</span> GOOD TO KNOW</span><h2>Questions, answered <em>plainly.</em></h2><p>Understand what this first version can do before you explore it.</p><a href="https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism/cbam-definitive-regime_en" target="_blank" rel="noopener noreferrer" className="landing-eu-link">Read the European Commission&apos;s CBAM guidance <MoveUpRight size={16} /></a></div>
            <div className="landing-faq-list" data-reveal>{faqs.map(({ question, answer }) => <details key={question}><summary>{question}<ChevronDown size={19} /></summary><p>{answer}</p></details>)}</div>
          </div>
        </section>

        <section className="landing-final-wrap">
          <div className="landing-final landing-container" data-reveal>
            <div className="landing-final-glow" aria-hidden="true" />
            <span className="landing-eyebrow"><span>YOUR NEXT STEP</span> START WITH WHAT YOU HAVE</span>
            <h2>Make sense of the records behind your next move.</h2>
            <p>Explore the CarbonLedger demo with sample supplier data. See how a clearer evidence workflow could take shape for your team.</p>
            <Link className="landing-button landing-button-lime" href="/workspace">Explore the workspace <ArrowUpRight size={19} /></Link>
            <span className="landing-final-small">Interactive prototype · No account required</span>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-main"><div><Brand light /><p>Evidence, organised.<br />Decisions, better informed.</p></div><div className="landing-footer-links"><div><span>EXPLORE</span><a href="#why">Why CarbonLedger</a><a href="#product">Product</a><a href="#workflow">How it works</a></div><div><span>RESOURCES</span><Link href="/workspace">Interactive demo</Link><a href="#faq">FAQ</a><a href="https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en" target="_blank" rel="noopener noreferrer">About CBAM <ArrowUpRight size={14} /></a></div></div></div>
        <div className="landing-container landing-footer-bottom"><span>© {new Date().getFullYear()} CarbonLedger</span><span>Demo product. Not a regulatory submission or compliance certification.</span><a href="#landing-main">Back to top ↑</a></div>
      </footer>
    </div>
  );
}
