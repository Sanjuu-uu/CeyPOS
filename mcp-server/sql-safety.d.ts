export const DEFAULT_ROW_LIMIT: number;
export const MAX_ROW_LIMIT: number;

export function applyReadLimit(sql: string, requestedLimit?: number): string;

export function validateReadOnlySql(query: string): {
  ok: true;
  sql: string;
} | {
  ok: false;
  error: string;
};
