import type { ShopContextResponse } from "../types/team";
import { authFetch } from "./api";
import {
  loadTerminalSession,
  saveTerminalSession,
  clearTerminalSession,
} from "./terminalSession";

export { loadTerminalSession, saveTerminalSession, clearTerminalSession };

export async function fetchShopContext(
  shopId: string,
  userEmail: string,
  terminalId?: string | null,
  terminalToken?: string | null,
): Promise<ShopContextResponse> {
  const params = new URLSearchParams({
    shopId,
    userEmail,
  });
  if (terminalId) params.set("terminalId", terminalId);
  if (terminalToken) params.set("terminalToken", terminalToken);

  const res = await authFetch(`/api/team/context?${params.toString()}`);
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error || "Failed to load shop context");
  }
  return body as ShopContextResponse;
}
