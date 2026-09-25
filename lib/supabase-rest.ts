// Small browser client for Supabase Auth, PostgREST, and private Storage.
// Authorization is enforced by the SQL row-level and object policies, never
// by trusting role flags from the browser.
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
export const supabaseConfigured = Boolean(supabaseUrl && publishableKey);
const sessionKey = "carbonledger.supabase.session.v1";

export type AuthUser = { id: string; email: string };
type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: AuthUser;
};

let cachedSession: AuthSession | null = null;
let refreshPending: Promise<AuthSession | null> | null = null;

function requireConfig() {
  if (!supabaseConfigured) throw new Error("Supabase is not connected yet.");
}

function remember(session: AuthSession | null) {
  cachedSession = session;
  if (typeof window === "undefined") return;
  if (session) window.localStorage.setItem(sessionKey, JSON.stringify(session));
  else window.localStorage.removeItem(sessionKey);
}

function stored(): AuthSession | null {
  if (cachedSession) return cachedSession;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(sessionKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed.access_token || !parsed.refresh_token || !parsed.user?.id) return null;
    cachedSession = parsed;
    return parsed;
  } catch { return null; }
}

async function errorMessage(response: Response): Promise<string> {
  const body = await response.json().catch(() => null) as Record<string, string> | null;
  return body?.msg ?? body?.message ?? body?.error_description ?? body?.error ?? `Request failed (${response.status}).`;
}

async function authRequest(path: string, body: object): Promise<Record<string, unknown>> {
  requireConfig();
  const response = await fetch(`${supabaseUrl}/auth/v1/${path}`, {
    method: "POST",
    headers: { apikey: publishableKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await errorMessage(response));
  return response.json() as Promise<Record<string, unknown>>;
}

function asSession(data: Record<string, unknown>): AuthSession {
  const user = data.user as AuthUser | undefined;
  if (!user?.id || !data.access_token || !data.refresh_token) throw new Error("No active session was returned.");
  return {
    access_token: String(data.access_token),
    refresh_token: String(data.refresh_token),
    expires_at: Number(data.expires_at ?? Math.floor(Date.now() / 1000) + Number(data.expires_in ?? 3600)),
    user: { id: user.id, email: user.email ?? "" },
  };
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const session = asSession(await authRequest("token?grant_type=password", { email, password }));
  remember(session);
  return session.user;
}

export async function signUp(email: string, password: string): Promise<boolean> {
  const redirect = typeof window === "undefined" ? "" : `?redirect_to=${encodeURIComponent(`${window.location.origin}/app`)}`;
  const data = await authRequest(`signup${redirect}`, { email, password });
  if (data.access_token) { remember(asSession(data)); return true; }
  return false; // Supabase email confirmation is enabled.
}

export function acceptEmailCallback(): boolean {
  if (typeof window === "undefined") return false;
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  if (!hash.get("access_token") || !hash.get("refresh_token")) return false;
  const session = asSession({
    access_token: hash.get("access_token"),
    refresh_token: hash.get("refresh_token"),
    expires_in: hash.get("expires_in") ?? 3600,
    user: { id: "pending", email: "" },
  });
  remember(session);
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  return true;
}

async function refresh(): Promise<AuthSession | null> {
  if (refreshPending) return refreshPending;
  const current = stored();
  if (!current) return null;
  refreshPending = (async () => {
    try {
      const next = asSession(await authRequest("token?grant_type=refresh_token", { refresh_token: current.refresh_token }));
      remember(next);
      return next;
    } catch {
      remember(null);
      return null;
    } finally { refreshPending = null; }
  })();
  return refreshPending;
}

async function accessToken(): Promise<string | null> {
  const session = stored();
  if (!session) return null;
  if (session.expires_at * 1000 > Date.now() + 60_000) return session.access_token;
  return (await refresh())?.access_token ?? null;
}

export async function currentUser(): Promise<AuthUser | null> {
  requireConfig();
  const token = await accessToken();
  if (!token) return null;
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: publishableKey, Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) { remember(null); return null; }
  const user = await response.json() as AuthUser;
  if (!user.id) { remember(null); return null; }
  const session = stored();
  if (session) remember({ ...session, user: { id: user.id, email: user.email ?? "" } });
  return { id: user.id, email: user.email ?? "" };
}

export async function signOut(): Promise<void> {
  const token = await accessToken();
  if (token) await fetch(`${supabaseUrl}/auth/v1/logout`, {
    method: "POST", headers: { apikey: publishableKey, Authorization: `Bearer ${token}` },
  }).catch(() => undefined);
  remember(null);
}

async function authorized(path: string, init: RequestInit = {}): Promise<Response> {
  requireConfig();
  const token = await accessToken();
  if (!token) throw new Error("Your session has expired. Please sign in again.");
  const headers = new Headers(init.headers);
  headers.set("apikey", publishableKey);
  headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${supabaseUrl}${path}`, { ...init, headers, cache: "no-store" });
}

async function json<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(await errorMessage(response));
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return text ? JSON.parse(text) as T : undefined as T;
}

export async function selectRows<T>(table: string, query: Record<string, string> = {}): Promise<T[]> {
  const params = new URLSearchParams({ select: "*", ...query });
  return json<T[]>(await authorized(`/rest/v1/${table}?${params}`));
}

export async function insertRow<T>(table: string, row: object): Promise<T> {
  const result = await json<T[]>(await authorized(`/rest/v1/${table}`, {
    method: "POST", headers: { "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(row),
  }));
  if (!result?.[0]) throw new Error("The record could not be saved.");
  return result[0];
}

export async function updateRow<T>(table: string, id: string, changes: object): Promise<T> {
  const result = await json<T[]>(await authorized(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH", headers: { "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(changes),
  }));
  if (!result?.[0]) throw new Error("You do not have permission to update this record.");
  return result[0];
}

export async function deleteRow(table: string, id: string): Promise<void> {
  const response = await authorized(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!response.ok) throw new Error(await errorMessage(response));
}

export async function callRpc<T>(name: string, args: object): Promise<T> {
  return json<T>(await authorized(`/rest/v1/rpc/${name}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(args),
  }));
}

const bucket = "org-evidence";
function objectPath(path: string) { return path.split("/").map(encodeURIComponent).join("/"); }

export async function uploadPrivate(path: string, file: File): Promise<void> {
  const response = await authorized(`/storage/v1/object/${bucket}/${objectPath(path)}`, {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream", "x-upsert": "false" },
    body: file,
  });
  if (!response.ok) throw new Error(await errorMessage(response));
}

export async function removePrivate(path: string): Promise<void> {
  const response = await authorized(`/storage/v1/object/${bucket}/${objectPath(path)}`, { method: "DELETE" });
  if (!response.ok) throw new Error(await errorMessage(response));
}

export async function downloadPrivate(path: string): Promise<Blob> {
  const response = await authorized(`/storage/v1/object/authenticated/${bucket}/${objectPath(path)}`);
  if (!response.ok) throw new Error(await errorMessage(response));
  return response.blob();
}
