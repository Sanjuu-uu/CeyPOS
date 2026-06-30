export const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");

type TokenGetter = () => Promise<string | null>;

let authTokenGetter: TokenGetter | null = null;

export function setAuthTokenGetter(getter: TokenGetter | null) {
  authTokenGetter = getter;
}

async function buildAuthHeaders(
  initHeaders?: HeadersInit,
): Promise<Headers> {
  const headers = new Headers(initHeaders || {});
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

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers = await buildAuthHeaders(init.headers);
  return fetch(input, { ...init, headers, credentials: "include" });
}

export async function getJSON<T = unknown>(path: string): Promise<T> {
  const res = await authFetch(`${API_BASE}${path}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || `HTTP ${res.status}`);
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
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || `HTTP ${res.status}`);
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
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }
  return data as T;
}
