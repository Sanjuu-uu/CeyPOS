import { API_ROUTES } from "./apiRoutes";

export const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");

type TokenGetter = () => Promise<string | null>;

let authTokenGetter: TokenGetter | null = null;
let authUserEmail: string | null = null;
const SENSITIVE_LOG_FIELDS = new Set([
  "authorization",
  "password",
  "token",
  "terminaltoken",
  "authtoken",
  "clerktoken",
  "secret",
]);

export function setAuthTokenGetter(getter: TokenGetter | null) {
  authTokenGetter = getter;
}

export function setAuthUserEmail(email: string | null) {
  const normalized = String(email || "").trim().toLowerCase();
  authUserEmail = normalized || null;
}

async function buildAuthHeaders(
  initHeaders?: HeadersInit,
): Promise<Headers> {
  const headers = new Headers(initHeaders || {});
  if (authUserEmail && !headers.has("X-User-Email")) {
    headers.set("X-User-Email", authUserEmail);
  }
  if (authTokenGetter) {
    try {
      const token = await authTokenGetter();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    } catch {
      // Proceed without token — server returns 401 when auth is required.
    }
  }
  return headers;
}

function redactForLog(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => redactForLog(item));
  if (!value || typeof value !== "object") return value;

  const redacted: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const normalizedKey = key.toLowerCase();
    redacted[key] = SENSITIVE_LOG_FIELDS.has(normalizedKey) ||
      normalizedKey.includes("token") ||
      normalizedKey.includes("password") ||
      normalizedKey.includes("secret")
      ? "[redacted]"
      : redactForLog(entry);
  }
  return redacted;
}

function requestBodyForLog(body: BodyInit | null | undefined): unknown {
  if (!body || typeof body !== "string") return body ? "[non-string-body]" : undefined;
  try {
    return redactForLog(JSON.parse(body));
  } catch {
    return body.slice(0, 2000);
  }
}

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers = await buildAuthHeaders(init.headers);
  const requestInfo = typeof input === "string" ? input : input instanceof URL ? input.toString() : String(input);
  console.debug("[ceypos:api] request", {
    method: init.method || "GET",
    url: requestInfo,
    body: requestBodyForLog(init.body),
  });
  const response = await fetch(input, { ...init, headers, credentials: "include" });
  console.debug("[ceypos:api] response", {
    method: init.method || "GET",
    url: requestInfo,
    status: response.status,
    ok: response.ok,
  });
  return response;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function waitForApiReady(options: {
  timeoutMs?: number;
  intervalMs?: number;
} = {}): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 8000;
  const intervalMs = options.intervalMs ?? 300;
  const startedAt = Date.now();
  const healthUrl = `${API_BASE}${API_ROUTES.health}`;

  while (Date.now() - startedAt <= timeoutMs) {
    try {
      const response = await fetch(healthUrl, { credentials: "include" });
      if (response.ok) {
        return;
      }
    } catch {
      // keep retrying until the backend is ready or the timeout expires
    }

    await sleep(intervalMs);
  }

  throw new Error("Backend is not ready yet. Please retry in a moment.");
}

export async function getJSON<T = unknown>(path: string): Promise<T> {
  const res = await authFetch(`${API_BASE}${path}`);
  const data = await res.json().catch(() => ({}));
  console.debug("[ceypos:api] parsed", { path, status: res.status, data });
  if (!res.ok || data?.ok === false) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    (err as any).payload = data;
    console.error("[ceypos:api] error", { path, status: res.status, data });
    throw err;
  }
  return data as T;
}

export async function patchJSON<T = unknown>(
  path: string,
  body: unknown,
): Promise<T> {
  const res = await authFetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  console.debug("[ceypos:api] parsed", { path, status: res.status, data });
  if (!res.ok || data?.ok === false) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    (err as any).payload = data;
    console.error("[ceypos:api] error", { path, status: res.status, data });
    throw err;
  }
  return data as T;
}

export async function postJSON<T = unknown>(
  path: string,
  body: unknown,
): Promise<T> {
  const res = await authFetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  console.debug("[ceypos:api] parsed", { path, status: res.status, data });
  if (!res.ok || data?.ok === false) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    (err as any).payload = data;
    console.error("[ceypos:api] error", { path, status: res.status, data });
    throw err;
  }
  return data as T;
}
