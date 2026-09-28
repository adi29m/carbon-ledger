import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { rootCertificates } from "node:tls";
import pg from "pg";

// Explicit local maintenance only; this never runs during a website build.
// Example: node --env-file=.env.local scripts/migrate-database.mjs --apply
const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log("Usage: node --env-file=.env.local scripts/migrate-database.mjs [--apply | --check]\nWithout options, list pending migrations without changing the database. --check fails if any migration is pending.");
  process.exit(0);
}
if (args.some(arg => !["--apply", "--check"].includes(arg)) || args.length > 1) throw new Error("Unknown or conflicting options. Use --help.");
const apply = args.includes("--apply");
const check = args.includes("--check");
const connectionString = process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;
const apiUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
if (!connectionString || !apiUrl) {
  console.error("Missing POSTGRES_URL and/or SUPABASE_URL. Pull the linked project's environment variables first.");
  process.exit(1);
}
const connection = new URL(connectionString);
const projectRef = new URL(apiUrl).hostname.split(".")[0];
const databaseMatches = connection.hostname === `db.${projectRef}.supabase.co`
  || (connection.hostname.endsWith(".pooler.supabase.com")
    && decodeURIComponent(connection.username) === `postgres.${projectRef}`);
if (!databaseMatches) throw new Error("The database URL does not match the configured Supabase project. Refusing to migrate.");

// Do not let a URL sslmode setting override certificate and hostname checks.
for (const key of ["sslmode", "ssl", "sslcert", "sslkey", "sslrootcert"]) connection.searchParams.delete(key);
const caFile = process.env.SUPABASE_DB_CA_FILE
  || fileURLToPath(new URL("../supabase/certs/prod-ca-2021.crt", import.meta.url));
const ca = await readFile(caFile, "utf8");
const client = new pg.Client({
  connectionString: connection.toString(),
  ssl: { rejectUnauthorized: true, ca: [...rootCertificates, ca] },
  connectionTimeoutMillis: 20_000,
  statement_timeout: 60_000,
  application_name: "carbonledger-migrations",
});
const directory = fileURLToPath(new URL("../supabase/migrations/", import.meta.url));
const migrations = await Promise.all((await readdir(directory)).filter(name => /^\d+_[a-z0-9_]+\.sql$/.test(name)).sort().map(async name => {
  const sql = (await readFile(`${directory}/${name}`, "utf8")).replace(/\r\n/g, "\n");
  return { name, sql, hash: createHash("sha256").update(sql).digest("hex") };
}));
let transaction = false;
try {
  await client.connect();
  if (apply) {
    await client.query("begin");
    transaction = true;
    await client.query("select pg_advisory_xact_lock(867412, 1)");
  }
  const ledgerExists = (await client.query("select to_regclass('private.carbonledger_migrations') as ledger")).rows[0].ledger;
  const applied = ledgerExists
    ? new Map((await client.query("select name, sha256 from private.carbonledger_migrations")).rows.map(row => [row.name, row.sha256]))
    : new Map();
  const pending = migrations.filter(migration => {
    const recorded = applied.get(migration.name);
    if (recorded && recorded !== migration.hash) throw new Error(`Applied migration changed: ${migration.name}. Add a new migration instead.`);
    return !recorded;
  });
  if (!ledgerExists && (await client.query("select to_regclass('public.organizations') as existing")).rows[0].existing) {
    throw new Error("A workspace schema already exists without a migration ledger. Review and baseline it before applying these migrations.");
  }
  console.log(`Project ${projectRef}: ${pending.length} pending migration(s).`);
  for (const migration of pending) console.log(`${apply ? "Apply" : "Pending"}: ${migration.name}`);
  if (check) {
    if (pending.length) throw new Error("Database schema is not current. Apply the pending migrations first.");
    console.log("PASS: workspace database schema current");
  } else if (!apply) {
    console.log("Dry run only. Add --apply to install the listed migrations.");
  } else {
    await client.query("create schema if not exists private");
    await client.query("create table if not exists private.carbonledger_migrations (name text primary key, sha256 text not null, applied_at timestamptz not null default now())");
    await client.query("revoke all on private.carbonledger_migrations from public, anon, authenticated");
    for (const migration of pending) {
      await client.query(migration.sql);
      await client.query("insert into private.carbonledger_migrations (name, sha256) values ($1, $2)", [migration.name, migration.hash]);
    }
    await client.query("notify pgrst, 'reload schema'");
    await client.query("commit");
    transaction = false;
    console.log("PASS: workspace database migrations applied");
  }
} catch (error) {
  if (transaction) await client.query("rollback").catch(() => {});
  const secrets = [connectionString, connection.toString(), decodeURIComponent(connection.password)].filter(Boolean);
  let detail = error instanceof Error ? error.message : "Database migration failed.";
  for (const secret of secrets) detail = detail.replaceAll(secret, "[redacted]");
  console.error(detail);
  if (/certificate|self.signed/i.test(detail)) console.error("Download this project's database CA certificate from Supabase Database Settings and set SUPABASE_DB_CA_FILE to its local path.");
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
