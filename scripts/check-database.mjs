// Live integration check; run only against a project you administer after applying
// every workspace migration. This creates four confirmed, disposable Auth users
// without sending email. The elevated key is used only for fixtures and cleanup;
// all application and permission checks use the publishable key + user JWT.
//
// Required environment (Node 22 can load an ignored file with --env-file):
// NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or _ANON_KEY),
// SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY). Never commit these values.
// Admin API: https://supabase.com/docs/reference/javascript/auth-admin-createuser
// Key headers: https://supabase.com/docs/guides/getting-started/api-keys
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";

const runId = randomUUID();
const orgName = `Database verification ${runId}`;
const bucket = "org-evidence";
const original = "record,value,unit\nelectricity,42,kWh\n";
const password = `${randomBytes(24).toString("base64url")}aA1!`;
const fixtures = { users: [], orgId: null, supplierIds: [], documentIds: [], invitationIds: [], paths: [] };
let baseUrl;
let publicKey;
let adminKey;

function configure() {
  baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  adminKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert(baseUrl && publicKey && adminKey,
    "Missing database-check environment: URL, publishable/anon key and secret/service-role key are required. No fixtures were created.");
  const url = new URL(baseUrl);
  assert(url.protocol === "https:" && /^[a-z0-9-]+\.supabase\.co$/.test(url.hostname)
    && !url.username && !url.password && !url.search && !url.hash && url.pathname === "/",
  "Database checks require a Supabase HTTPS project URL without credentials, path or query.");
  assert(publicKey !== adminKey && !publicKey.startsWith("sb_secret_"), "The public and elevated keys must be separate.");
  if (!publicKey.startsWith("sb_publishable_")) {
    let role;
    try { role = JSON.parse(Buffer.from(publicKey.split(".")[1], "base64url").toString()).role; } catch { /* checked below */ }
    assert.equal(role, "anon", "The public key must be a publishable key or legacy anon JWT.");
  }
}

function headersFor(actor) {
  if (actor === "admin") {
    return { apikey: adminKey, ...(adminKey.startsWith("sb_secret_") ? {} : { Authorization: `Bearer ${adminKey}` }) };
  }
  return { apikey: publicKey, ...(actor?.token ? { Authorization: `Bearer ${actor.token}` } : {}) };
}

async function request(actor, path, { method = "GET", body, headers = {}, raw = false } = {}) {
  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { ...headersFor(actor), ...(body !== undefined && !raw ? { "Content-Type": "application/json" } : {}), ...headers },
      body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
      redirect: "error", cache: "no-store", signal: AbortSignal.timeout(30_000),
    });
  } catch {
    // Do not expose fetch diagnostics, which can contain request credentials.
    throw new Error(`Database request failed or timed out (${method} ${path.split("?")[0]}).`);
  }
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* downloads are text */ }
  return { ok: response.ok, status: response.status, data, text };
}

function ok(result, label) {
  const code = typeof result.data?.code === "string" && /^[a-zA-Z0-9_-]{1,60}$/.test(result.data.code) ? `; code ${result.data.code}` : "";
  assert(result.ok, `${label} failed (HTTP ${result.status}${code}).`);
  return result.data;
}

function queryPath(table, filters, select = "*") {
  assert(Object.keys(filters).length > 0, "Every table request must have an exact fixture filter.");
  return `/rest/v1/${table}?${new URLSearchParams({ select, ...filters })}`;
}

async function rows(actor, table, filters, select = "*") {
  const data = ok(await request(actor, queryPath(table, filters, select)), `Read ${table}`);
  assert(Array.isArray(data), `Read ${table} did not return rows.`);
  return data;
}

async function insert(actor, table, row) {
  const data = ok(await request(actor, `/rest/v1/${table}`, {
    method: "POST", body: row, headers: { Prefer: "return=representation" },
  }), `Insert ${table}`);
  assert(Array.isArray(data) && data.length === 1, `Insert ${table} did not return the saved record.`);
  return data[0];
}

async function mutate(actor, table, id, method, body) {
  return request(actor, queryPath(table, { id: `eq.${id}`, ...(table === "organizations" ? {} : { org_id: `eq.${fixtures.orgId}` }) }), {
    method, body, headers: { Prefer: "return=representation" },
  });
}

async function rpc(actor, name, body) {
  return request(actor, `/rest/v1/rpc/${name}`, { method: "POST", body });
}

function denied(result, label) {
  // RLS UPDATE/DELETE can legitimately succeed with zero affected rows. Callers
  // also re-read the original with an authorized user to prove it is unchanged.
  assert((!result.ok && result.status >= 400 && result.status < 500)
    || (result.ok && Array.isArray(result.data) && result.data.length === 0), `${label} was not denied.`);
}

function rejected(result, label) {
  assert(!result.ok && result.status >= 400 && result.status < 500, `${label} was not rejected.`);
}

function storagePath(path, download = false) {
  return `/storage/v1/object/${download ? "authenticated/" : ""}${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

async function checkOriginal(actor, path, label) {
  const result = await request(actor, `${storagePath(path, true)}?verification=${randomUUID()}`);
  ok(result, label);
  assert.equal(result.text, original, `${label}: original contents changed or disappeared.`);
}

async function createUser(role) {
  const fixture = { role, email: `cl-check-${runId}-${role}@example.com`, id: null, token: null };
  fixtures.users.push(fixture); // Track the intended account before its request.
  const data = ok(await request("admin", "/auth/v1/admin/users", {
    method: "POST", body: { email: fixture.email, password, email_confirm: true, app_metadata: { carbonledger_check: runId } },
  }), `Create ${role} fixture account`);
  fixture.id = data.id ?? data.user?.id;
  assert.match(fixture.id ?? "", /^[0-9a-f-]{36}$/i, "Auth did not return a fixture user ID.");
  return signIn(fixture);
}

async function signIn(fixture) {
  const data = ok(await request(null, "/auth/v1/token?grant_type=password", {
    method: "POST", body: { email: fixture.email, password },
  }), `Sign in ${fixture.role}`);
  assert(data.access_token && data.user?.id === fixture.id, "Fixture sign-in did not return the expected user.");
  return { ...fixture, token: data.access_token };
}

async function addMember(owner, member) {
  const id = randomUUID();
  fixtures.invitationIds.push(id);
  await insert(owner, "organization_invitations", {
    id, org_id: fixtures.orgId, email: member.email, role: member.role, created_by: owner.id,
  });
  assert.equal(ok(await rpc(member, "accept_invitation", { p_invitation_id: id }), "Accept invitation"), fixtures.orgId);
  const saved = await rows(owner, "organization_members", { org_id: `eq.${fixtures.orgId}`, user_id: `eq.${member.id}` });
  assert.equal(saved[0]?.role, member.role, "Accepted invitation did not grant the expected role.");
}

async function verify() {
  const owner = await createUser("owner");
  const editor = await createUser("editor");
  const viewer = await createUser("viewer");
  const outsider = await createUser("outsider");
  fixtures.orgId = ok(await rpc(owner, "create_organization", { p_name: orgName }), "Create organisation");
  assert.match(fixtures.orgId ?? "", /^[0-9a-f-]{36}$/i, "Organisation RPC did not return an ID.");
  await addMember(owner, editor);
  await addMember(owner, viewer);
  const supplierId = randomUUID();
  fixtures.supplierIds.push(supplierId);
  const supplier = await insert(editor, "suppliers", {
    id: supplierId, org_id: fixtures.orgId, name: `Fixture supplier ${runId}`, location: "Mumbai", material: "Aluminium", created_by: editor.id,
  });
  const path = `${fixtures.orgId}/${editor.id}/${runId}.csv`;
  fixtures.paths.push(path);
  ok(await request(editor, storagePath(path), {
    method: "POST", body: original, raw: true, headers: { "Content-Type": "text/csv", "x-upsert": "false", "cache-control": "no-store" },
  }), "Upload original evidence");
  const documentId = randomUUID();
  fixtures.documentIds.push(documentId);
  const document = {
    id: documentId, org_id: fixtures.orgId, supplier_id: supplierId, category: "Energy record", period: "2026-Q3",
    filename: `${runId}.csv`, storage_path: path, mime_type: "text/csv", size_bytes: Buffer.byteLength(original), created_by: editor.id,
  };
  await insert(editor, "documents", document);
  const reviewedRows = ok(await mutate(editor, "documents", documentId, "PATCH", {
    status: "Reviewed", value: "42", unit: "kWh", source: "Fixture CSV, electricity row", notes: "Disposable live integration check.",
  }), "Review evidence");
  assert.equal(reviewedRows?.[0]?.reviewed_by, editor.id, "Review actor was not recorded.");
  assert(reviewedRows[0].reviewed_at, "Review timestamp was not recorded.");
  const freshOwner = await signIn(owner);
  const persistedSuppliers = await rows(freshOwner, "suppliers", { org_id: `eq.${fixtures.orgId}`, id: `eq.${supplierId}` });
  assert.deepEqual(persistedSuppliers, [supplier], "Supplier did not persist into a fresh session.");
  const persisted = await rows(freshOwner, "documents", { org_id: `eq.${fixtures.orgId}`, id: `eq.${documentId}` });
  assert.deepEqual(persisted, reviewedRows, "Reviewed evidence did not persist into a fresh session.");
  await checkOriginal(freshOwner, path, "Fresh-session evidence download");
  assert.equal((await rows(viewer, "documents", { org_id: `eq.${fixtures.orgId}`, id: `eq.${documentId}` }))[0]?.value, "42");

  for (const [table, id, changes] of [
    ["suppliers", supplierId, { name: "Unauthorized change" }],
    ["documents", documentId, { value: "999" }],
    ["organizations", fixtures.orgId, { name: "Unauthorized change" }],
  ]) {
    const before = await rows(owner, table, { id: `eq.${id}` });
    denied(await mutate(viewer, table, id, "PATCH", changes), `Viewer update ${table}`);
    assert.deepEqual(await rows(owner, table, { id: `eq.${id}` }), before, `Viewer changed ${table}.`);
    if (table !== "organizations") {
      denied(await mutate(viewer, table, id, "DELETE"), `Viewer delete ${table}`);
      assert.deepEqual(await rows(owner, table, { id: `eq.${id}` }), before, `Viewer deleted ${table}.`);
    }
  }
  const forbiddenSupplierId = randomUUID();
  fixtures.supplierIds.push(forbiddenSupplierId);
  rejected(await request(viewer, "/rest/v1/suppliers", { method: "POST", body: {
    id: forbiddenSupplierId, org_id: fixtures.orgId, name: "Forbidden viewer supplier", created_by: viewer.id,
  } }), "Viewer insert supplier");
  assert.equal((await rows(owner, "suppliers", { id: `eq.${forbiddenSupplierId}` })).length, 0);
  rejected(await rpc(viewer, "set_member_role", { p_org_id: fixtures.orgId, p_user_id: viewer.id, p_role: "admin" }), "Viewer self-promotion");
  assert.equal((await rows(owner, "organization_members", { org_id: `eq.${fixtures.orgId}`, user_id: `eq.${viewer.id}` }))[0]?.role, "viewer");
  const forbiddenPath = `${fixtures.orgId}/${viewer.id}/${runId}.csv`;
  fixtures.paths.push(forbiddenPath);
  rejected(await request(viewer, storagePath(forbiddenPath), {
    method: "POST", body: original, raw: true, headers: { "Content-Type": "text/csv", "x-upsert": "false" },
  }), "Viewer upload");
  rejected(await request(owner, storagePath(forbiddenPath, true)), "Viewer upload must leave no object");

  for (const table of ["organizations", "organization_members", "organization_invitations", "suppliers", "documents", "audit_events"]) {
    const filters = table === "organizations" ? { id: `eq.${fixtures.orgId}` } : { org_id: `eq.${fixtures.orgId}` };
    assert.deepEqual(await rows(outsider, table, filters), [], `Outsider could read ${table}.`);
  }
  rejected(await request(outsider, storagePath(path, true)), "Outsider original-file download");
  rejected(await request(null, `/storage/v1/object/public/${bucket}/${path}`), "Anonymous public-file download");

  // Storage DELETE may return 200 with an empty list when RLS hides the object.
  denied(await request(editor, `/storage/v1/object/${bucket}`, { method: "DELETE", body: { prefixes: [path] } }), "Editor delete referenced original");
  await checkOriginal(owner, path, "Original after editor delete attempt");
  rejected(await request(editor, storagePath(path), {
    method: "POST", body: "tampered", raw: true, headers: { "Content-Type": "text/csv", "x-upsert": "true" },
  }), "Editor overwrite referenced original");
  await checkOriginal(owner, path, "Original after editor overwrite attempt");
  assert.deepEqual(await rows(owner, "documents", { id: `eq.${documentId}` }), persisted, "Original metadata changed after storage attacks.");

  for (const invalidPath of [
    `${fixtures.orgId}/${editor.id}/missing-${runId}.csv`,
    `${randomUUID()}/${editor.id}/wrong-org-${runId}.csv`,
  ]) {
    const id = randomUUID();
    fixtures.documentIds.push(id);
    rejected(await request(editor, "/rest/v1/documents", { method: "POST", body: {
      ...document, id, filename: `${id}.csv`, storage_path: invalidPath,
    } }), "Insert invalid or missing storage reference");
    assert.equal((await rows(owner, "documents", { id: `eq.${id}` })).length, 0, "Invalid storage reference persisted.");
  }
  const events = await rows(owner, "audit_events", { org_id: `eq.${fixtures.orgId}` });
  for (const [action, subject, actor] of [
    ["organization.created", fixtures.orgId, owner.id], ["suppliers.insert", supplierId, editor.id],
    ["documents.insert", documentId, editor.id], ["documents.update", documentId, editor.id],
  ]) {
    assert(events.some(event => event.action === action && event.subject_id === subject && event.actor_id === actor), `Missing audit event: ${action}.`);
  }
  assert.equal(events.filter(event => event.action === "invitation.accepted").length, 2, "Invitation acceptance audit is incomplete.");
  const storageBucket = ok(await request("admin", `/storage/v1/bucket/${bucket}`), "Read evidence bucket configuration");
  assert.equal(storageBucket.public, false, "Evidence bucket must be private.");
}

async function cleanup() {
  const errors = [];
  async function attempt(label, work) {
    try { await work(); } catch { errors.push(label); }
  }
  // Recover an uncertain create response by the exact generated email AND marker.
  for (const user of fixtures.users.filter(user => !user.id)) {
    await attempt(`recover ${user.role} fixture ID`, async () => {
      const data = ok(await request("admin", `/auth/v1/admin/users?${new URLSearchParams({ page: "1", per_page: "100", filter: user.email })}`), "Recover fixture account");
      const found = data.users?.filter(candidate => candidate.email === user.email && candidate.app_metadata?.carbonledger_check === runId) ?? [];
      assert(found.length <= 1, "Ambiguous fixture account recovery.");
      user.id = found[0]?.id ?? null;
    });
  }
  const owner = fixtures.users.find(user => user.role === "owner");
  if (!fixtures.orgId && owner?.id) {
    await attempt("recover fixture organisation ID", async () => {
      const found = await rows("admin", "organizations", { name: `eq.${orgName}`, created_by: `eq.${owner.id}` });
      assert(found.length <= 1, "Ambiguous fixture organisation recovery.");
      fixtures.orgId = found[0]?.id ?? null;
    });
  }
  if (fixtures.orgId) {
    // Delete source rows before storage and before the organisation: row deletion
    // triggers audit events whose parent organisation must still exist.
    for (const [table, ids] of [["documents", fixtures.documentIds], ["suppliers", fixtures.supplierIds], ["organization_invitations", fixtures.invitationIds]]) {
      for (const id of ids) await attempt(`delete ${table} fixture`, async () => {
        ok(await mutate("admin", table, id, "DELETE"), `Cleanup ${table}`);
        assert.equal((await rows("admin", table, { id: `eq.${id}`, org_id: `eq.${fixtures.orgId}` })).length, 0);
      });
    }
    for (const path of fixtures.paths) await attempt("delete fixture original", async () => {
      assert.equal((await rows("admin", "documents", { org_id: `eq.${fixtures.orgId}`, storage_path: `eq.${path}` })).length, 0, "Refusing to remove a referenced file during cleanup.");
      ok(await request("admin", `/storage/v1/object/${bucket}`, { method: "DELETE", body: { prefixes: [path] } }), "Cleanup fixture original");
      const remaining = await request("admin", `${storagePath(path, true)}?verification=${randomUUID()}`);
      assert(!remaining.ok && [400, 404].includes(remaining.status), "Fixture object was not removed.");
    });
    for (const user of fixtures.users.filter(user => user.id)) await attempt(`delete ${user.role} membership`, async () => {
      const filters = { org_id: `eq.${fixtures.orgId}`, user_id: `eq.${user.id}` };
      ok(await request("admin", queryPath("organization_members", filters), { method: "DELETE" }), "Cleanup fixture membership");
      assert.equal((await rows("admin", "organization_members", filters)).length, 0);
    });
    await attempt("delete fixture audit events", async () => {
      const events = await rows("admin", "audit_events", { org_id: `eq.${fixtures.orgId}` }, "id");
      for (const event of events) ok(await mutate("admin", "audit_events", event.id, "DELETE"), "Cleanup fixture audit event");
      assert.equal((await rows("admin", "audit_events", { org_id: `eq.${fixtures.orgId}` })).length, 0);
    });
    await attempt("delete fixture organisation", async () => {
      ok(await mutate("admin", "organizations", fixtures.orgId, "DELETE"), "Cleanup fixture organisation");
      assert.equal((await rows("admin", "organizations", { id: `eq.${fixtures.orgId}` })).length, 0);
    });
  }
  for (const user of fixtures.users.filter(user => user.id)) await attempt(`delete ${user.role} fixture account`, async () => {
    ok(await request("admin", `/auth/v1/admin/users/${user.id}`, { method: "DELETE", body: { should_soft_delete: false } }), "Cleanup fixture account");
    assert.equal((await request("admin", `/auth/v1/admin/users/${user.id}`)).status, 404, "Fixture account was not removed.");
  });
  if (errors.length) throw new Error(`Fixture cleanup incomplete for run ${runId}: ${errors.join(", ")}. Inspect only this run's generated records before retrying.`);
}

async function main() {
  configure(); // No requests or fixtures if environment validation fails.
  console.log(`Live database check fixture: ${runId}`);
  let failure;
  try { await verify(); } catch (error) { failure = error; }
  finally {
    try { await cleanup(); } catch (error) {
      if (failure) console.error(`FAIL: ${failure.message}`);
      failure = error;
    }
  }
  if (failure) throw failure;
  console.log("PASS: live database persistence, roles, storage isolation and cleanup");
}

main().catch(error => { console.error(`FAIL: ${error.message}`); process.exitCode = 1; });
