import type { ShopContextResponse } from "../types/team";
import { authFetch } from "./api";
import { API_ROUTES } from "./apiRoutes";
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

  const res = await authFetch(API_ROUTES.team.context(params));
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error || "Failed to load shop context");
  }
  return body as ShopContextResponse;
}
