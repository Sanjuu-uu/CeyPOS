import type { TerminalSessionCredentials } from "../types/team";

const TERMINAL_STORAGE_KEY = "ceypos_terminal_session";

export function loadTerminalSession(shopId?: string): TerminalSessionCredentials | null {
  try {
    const raw = localStorage.getItem(TERMINAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TerminalSessionCredentials;
    if (shopId && parsed.shopId !== shopId) return null;
    if (!parsed.terminalId || !parsed.terminalToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveTerminalSession(credentials: TerminalSessionCredentials) {
  localStorage.setItem(TERMINAL_STORAGE_KEY, JSON.stringify(credentials));
}

export function clearTerminalSession() {
  localStorage.removeItem(TERMINAL_STORAGE_KEY);
}
