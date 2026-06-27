import { applyReadLimit, validateReadOnlySql } from './sql-safety.js';
import {
  buildRankedSearchQuery,
  buildSearchFallbackStrategies,
  extractSearchTermsFromSql,
  looksLikeSearchQuery,
  resolveEffectiveSearchTool,
} from './search-utils.js';

export {
  tokenizeSearchText,
  SEARCH_ENTITIES,
  buildRankedSearchQuery,
  rankRowsByTokens,
} from './search-utils.js';

export function shouldTrySearchFallback(toolName, query, rows) {
  if (!Array.isArray(rows) || rows.length > 0) return false;
  if (!resolveEffectiveSearchTool(toolName, query)) return false;
  if (!looksLikeSearchQuery(query)) return false;
  return extractSearchTermsFromSql(query).length > 0;
}

export function buildSearchFallbackQuery(toolName, query, limit) {
  const effectiveTool = resolveEffectiveSearchTool(toolName, query);
  if (!effectiveTool) return null;

  const strategies = buildSearchFallbackStrategies(effectiveTool, query);
  const strategy = strategies[0];
  if (!strategy) return null;

  return {
    term: strategy.label,
    sql: buildRankedSearchQuery(effectiveTool, strategy.terms, limit, strategy.mode),
    effectiveTool,
    strategies,
  };
}

export async function applySearchFallback(toolName, query, rows, rowLimit, runQuery) {
  if (!shouldTrySearchFallback(toolName, query, rows)) {
    return rows;
  }

  const effectiveTool = resolveEffectiveSearchTool(toolName, query);
  const strategies = buildSearchFallbackStrategies(effectiveTool, query);

  for (const strategy of strategies) {
    const sql = buildRankedSearchQuery(effectiveTool, strategy.terms, rowLimit, strategy.mode);
    if (!sql) continue;

    const validation = validateReadOnlySql(sql);
    if (!validation.ok) continue;

    const fallbackRows = await runQuery(applyReadLimit(validation.sql, rowLimit));
    if (Array.isArray(fallbackRows) && fallbackRows.length > 0) {
      return wrapFallbackResult(fallbackRows, strategy.label);
    }
  }

  return rows;
}

export function wrapFallbackResult(rows, term) {
  return {
    rows,
    meta: {
      exactMatchFound: false,
      matchType: rows.length ? 'closest' : 'none',
      searchTerm: term,
      note:
        rows.length > 0
          ? 'Exact match not found. Closest matching records are included.'
          : 'No exact or close matches were found.',
    },
  };
}

export function normalizeToolResult(result) {
  if (Array.isArray(result)) {
    return { rows: result, meta: null, raw: result };
  }
  if (result && typeof result === 'object' && Array.isArray(result.rows)) {
    return { rows: result.rows, meta: result.meta ?? null, raw: result };
  }
  return { rows: null, meta: null, raw: result };
}
