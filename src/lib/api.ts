export const API_BASE =
  import.meta.env.VITE_API_BASE || "";

export async function postJSON<T = any>(
  path: string,
  body: unknown
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
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

/**
 * Generate a consistent shop ID from user email
 * This ensures all components use the same logic for shop identification
 */
export function generateShopId(email: string): string {
  if (!email || typeof email !== 'string') {
    throw new Error('Valid email is required to generate shop ID');
  }
  return `user_${email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_')}`;
}
