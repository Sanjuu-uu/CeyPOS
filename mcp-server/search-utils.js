export const SEARCH_STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'about', 'available', 'can', 'cost', 'customer', 'do', 'does',
  'find', 'for', 'have', 'how', 'i', 'in', 'is', 'item', 'me', 'much', 'my', 'of', 'on',
  'please', 'price', 'product', 'qty', 'quantity', 'show', 'stock', 'tell', 'the', 'there',
  'this', 'to', 'unit', 'we', 'what', 'whats', 'who', 'you', 'our', 'any', 'get',
]);

export const SEARCH_ENTITIES = {
  query_inventory: {
    table: 'inventory',
    columns: ['name', 'category', 'sku', 'inventory_code', 'barcode_id'],
    select:
      'item_id, inventory_code, barcode_id, name, category, sku, price, stock, restock_suggestion',
    primaryColumn: 'name',
  },
  query_customers: {
    table: 'customers',
    columns: ['name', 'email', 'phone'],
    select: 'customer_id, name, email, phone, total_spent, visit_count, last_visit, points_balance',
    primaryColumn: 'name',
  },
};

export function escapeSqlLiteral(value) {
  return String(value || '').replace(/'/g, "''").trim();
}

export function tokenizeSearchText(text, options = {}) {
  const { maxTokens = 8, minLength = 2 } = options;

  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .map((token) => {
      const clean = token.trim();
      if (!clean) return '';
      if (/^[a-z]{4,}s$/.test(clean)) return clean.slice(0, -1);
      return clean;
    })
    .filter((token) => {
      if (!token) return false;
      if (/^\d+$/.test(token)) return token.length >= 2;
      if (token.length < minLength) return false;
      return !SEARCH_STOP_WORDS.has(token);
    })
    .slice(0, maxTokens);
}

export function scoreRowAgainstTokens(row, tokens, columns) {
  const haystack = columns.map((column) => String(row?.[column] ?? '')).join(' ').toLowerCase();
  let score = 0;

  for (const token of tokens) {
    if (!token) continue;
    if (columns.some((column) => String(row?.[column] ?? '').toLowerCase() === token)) {
      score += 6;
      continue;
    }
    if (columns.some((column) => String(row?.[column] ?? '').toLowerCase().startsWith(token))) {
      score += 4;
      continue;
    }
    if (haystack.includes(token)) {
      score += 2;
    }
  }

  return score;
}

export function rankRowsByTokens(rows, tokens, columns, limit = 5) {
  return rows
    .map((row) => ({ ...row, score: scoreRowAgainstTokens(row, tokens, columns) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || String(a.name ?? '').localeCompare(String(b.name ?? '')))
    .slice(0, limit);
}

export function buildRankedSearchQuery(entityKey, terms, limit = 12, matchMode = 'or', selectOverride = null) {
  const config = SEARCH_ENTITIES[entityKey];
  if (!config || !Array.isArray(terms) || !terms.length) return null;

  const escapedTerms = terms.map((term) => escapeSqlLiteral(term)).filter(Boolean);
  if (!escapedTerms.length) return null;

  const safeLimit = Math.max(1, Math.min(Number(limit) || 12, 24));
  const primary = config.primaryColumn || 'name';
  const select = selectOverride || config.select;

  let whereClause;
  if (matchMode === 'and' && escapedTerms.length > 1) {
    whereClause = escapedTerms
      .map((term) => {
        const like = `%${term}%`;
        const columnMatch = config.columns
          .map((column) => `lower(${column}) LIKE lower('${like}')`)
          .join(' OR ');
        return `(${columnMatch})`;
      })
      .join(' AND ');
  } else {
    const termClauses = escapedTerms.map((term) => {
      const like = `%${term}%`;
      return config.columns.map((column) => `lower(${column}) LIKE lower('${like}')`).join(' OR ');
    });
    whereClause = termClauses.join(' OR ');
  }

  const rankParts = [];
  for (const term of escapedTerms) {
    const like = `%${term}%`;
    rankParts.push(`WHEN lower(${primary}) = lower('${term}') THEN 0`);
    rankParts.push(`WHEN lower(${primary}) LIKE lower('${term}%') THEN 1`);
    rankParts.push(`WHEN lower(${primary}) LIKE lower('${like}') THEN 2`);
  }
  for (const column of config.columns.filter((item) => item !== primary)) {
    for (const term of escapedTerms) {
      const like = `%${term}%`;
      rankParts.push(`WHEN lower(${column}) LIKE lower('${like}') THEN 3`);
    }
  }

  return `
    SELECT ${select}
    FROM ${config.table}
    WHERE ${whereClause}
    ORDER BY
      CASE
        ${rankParts.join('\n        ')}
        ELSE 4
      END,
      length(${primary}),
      ${primary}
    LIMIT ${safeLimit}
  `.trim();
}

export function detectSearchableEntityFromSql(query) {
  const normalized = String(query || '').replace(/\s+/g, ' ').toLowerCase();
  if (/\bfrom\s+customers\b/.test(normalized) || /\bjoin\s+customers\b/.test(normalized)) {
    return 'query_customers';
  }
  if (/\bfrom\s+inventory\b/.test(normalized) || /\bjoin\s+inventory\b/.test(normalized)) {
    return 'query_inventory';
  }
  return null;
}

export function resolveEffectiveSearchTool(toolName, query) {
  if (SEARCH_ENTITIES[toolName]) return toolName;
  if (toolName === 'query_general') return detectSearchableEntityFromSql(query);
  return null;
}

export function extractSearchTermsFromSql(query) {
  const normalized = String(query || '').replace(/\s+/g, ' ');
  const terms = new Set();
  const sqlNoise = new Set(['select', 'from', 'where', 'and', 'or', 'in', 'null', 'like', 'not', 'is']);
  const patterns = [
    /(?:name|sku|barcode_id|inventory_code|email|phone|category)\s*(?:=|LIKE)\s*'([^']+)'/gi,
    /(?:name|sku|barcode_id|inventory_code|email|phone|category)\s*(?:=|LIKE)\s*"([^"]+)"/gi,
    /\bIN\s*\(\s*'([^']+)'/gi,
  ];

  for (const pattern of patterns) {
    let match = pattern.exec(normalized);
    while (match) {
      const rawTerm = match[1].replace(/%/g, '').trim();
      if (!rawTerm) {
        match = pattern.exec(normalized);
        continue;
      }

      terms.add(rawTerm);
      match = pattern.exec(normalized);
    }
  }

  return [...terms]
    .filter((term) => term && !sqlNoise.has(String(term).toLowerCase()))
    .sort((a, b) => b.length - a.length);
}

export function looksLikeSearchQuery(query) {
  const normalized = String(query || '').replace(/\s+/g, ' ').toLowerCase();
  if (!/\bwhere\b/.test(normalized)) return false;

  return (
    /\b(name|sku|barcode_id|inventory_code|email|phone|category)\s*(=|like|in)\s/.test(normalized) ||
    /\blike\b/.test(normalized)
  );
}

export function buildSearchFallbackStrategies(entityKey, query) {
  const rawTerms = extractSearchTermsFromSql(query);
  if (!rawTerms.length || !SEARCH_ENTITIES[entityKey]) return [];

  const strategies = [];
  const seen = new Set();
  const addStrategy = (terms, mode, label) => {
    const cleanedTerms = [...new Set(terms.map((term) => String(term || '').trim()).filter(Boolean))];
    if (!cleanedTerms.length) return;
    const key = `${mode}:${cleanedTerms.join('|')}`;
    if (seen.has(key)) return;
    seen.add(key);
    strategies.push({ terms: cleanedTerms, mode, label: label || cleanedTerms.join(' ') });
  };

  const tokenTerms = [...new Set(tokenizeSearchText(rawTerms.join(' '), { maxTokens: 6 }))];
  if (tokenTerms.length >= 2) {
    addStrategy(tokenTerms, 'and', tokenTerms.join(' '));
    addStrategy(tokenTerms, 'or', tokenTerms.join(' '));
  } else if (tokenTerms.length === 1) {
    addStrategy(tokenTerms, 'or', tokenTerms[0]);
  }

  for (const term of rawTerms.slice(0, 3)) {
    addStrategy([term], 'or', term);
    const subTokens = tokenizeSearchText(term, { maxTokens: 4 });
    if (subTokens.length >= 2) {
      addStrategy(subTokens, 'and', term);
      addStrategy(subTokens, 'or', term);
    }
  }

  return strategies;
}
