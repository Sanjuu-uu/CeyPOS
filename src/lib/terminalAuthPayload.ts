import { loadTerminalSession } from "./terminalSession";

export function normalizeTerminalShopId(shopId: string) {
  return String(shopId || "").replace(/^shop_/, "");
}

export function getTerminalAuthPayload(shopId: string) {
  const rawShopId = normalizeTerminalShopId(shopId);
  const terminal =
    loadTerminalSession(rawShopId) ||
    loadTerminalSession(shopId);

  if (!terminal?.terminalId || !terminal?.terminalToken) {
    return {};
  }

  return {
    terminalId: terminal.terminalId,
    terminalToken: terminal.terminalToken,
  };
}
