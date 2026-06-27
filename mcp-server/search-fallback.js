const SEARCHABLE_TOOLS = {
  query_inventory: {
    table: "inventory",
    columns: ["name", "category", "sku", "inventory_code", "barcode_id"],
    select:
      "item_id, inventory_code, barcode_id, name, category, sku, price, stock, restock_suggestion",
  },
  query_customers: {
    table: "customers",
    columns: ["name", "email", "phone"],
    select: "customer_id, name, email, phone, total_spent, visit_count, last_visit, points_balance",
  },
};

function escapeSqlLiteral(value) {
  return String(value || "").replace(/'/g, "''").trim();
}

function extractSearchTerms(query) {
  const normalized = String(query || "").replace(/\s+/g, " ");
  const terms = new Set();
  const patterns = [
    /(?:name|sku|barcode_id|inventory_code|email|phone)\s*(?:=|LIKE)\s*'([^']+)'/gi,
    /'([^']{2,120})'/g,
  ];

  for (const pattern of patterns) {
    let match = pattern.exec(normalized);
    while (match) {
      const term = match[1].replace(/%/g, "").trim();
      if (term && !/^(select|from|where|and|or)$/i.test(term)) {
        terms.add(term);
      }
      match = pattern.exec(normalized);
    }
  }

  return [...terms].sort((a, b) => b.length - a.length);
}

function looksLikeExactLookupQuery(query) {
  const normalized = String(query || "").replace(/\s+/g, " ").toLowerCase();
  return (
    /\bwhere\b/.test(normalized) &&
    (/\bname\s*=/.test(normalized) ||
      /\bbarcode_id\s*=/.test(normalized) ||
      /\binventory_code\s*=/.test(normalized) ||
      /\bsku\s*=/.test(normalized) ||
      /\bemail\s*=/.test(normalized) ||
      /\bphone\s*=/.test(normalized) ||
      /\blike\b/.test(normalized))
  );
}

function buildClosestMatchQuery(toolName, term, limit = 12) {
  const config = SEARCHABLE_TOOLS[toolName];
  if (!config || !term) return null;

  const escaped = escapeSqlLiteral(term);
  const like = `%${escaped}%`;
  const whereClause = config.columns
    .map((column) => `lower(${column}) LIKE lower('${like}')`)
    .join(" OR ");

  const rankParts = [
    `WHEN lower(name) = lower('${escaped}') THEN 0`,
    `WHEN lower(name) LIKE lower('${escaped}%') THEN 1`,
    `WHEN lower(name) LIKE lower('${like}') THEN 2`,
  ];

  for (const column of config.columns.filter((item) => item !== "name")) {
    rankParts.push(`WHEN lower(${column}) LIKE lower('${like}') THEN 3`);
  }

  return `
    SELECT ${config.select}
    FROM ${config.table}
    WHERE ${whereClause}
    ORDER BY
      CASE
        ${rankParts.join("\n        ")}
        ELSE 4
      END,
      length(name),
      name
    LIMIT ${Math.max(1, Math.min(Number(limit) || 12, 24))}
  `.trim();
}

export function shouldTrySearchFallback(toolName, query, rows) {
  if (!Array.isArray(rows) || rows.length > 0) return false;
  if (!SEARCHABLE_TOOLS[toolName]) return false;
  if (!looksLikeExactLookupQuery(query)) return false;
  return extractSearchTerms(query).length > 0;
}

export function buildSearchFallbackQuery(toolName, query, limit) {
  const terms = extractSearchTerms(query);
  const term = terms[0];
  if (!term) return null;
  return {
    term,
    sql: buildClosestMatchQuery(toolName, term, limit),
  };
}

export function wrapFallbackResult(rows, term) {
  return {
    rows,
    meta: {
      exactMatchFound: false,
      matchType: rows.length ? "closest" : "none",
      searchTerm: term,
      note:
        rows.length > 0
          ? "Exact match not found. Closest matching records are included."
          : "No exact or close matches were found.",
    },
  };
}

export function normalizeToolResult(result) {
  if (Array.isArray(result)) {
    return { rows: result, meta: null, raw: result };
  }
  if (result && typeof result === "object" && Array.isArray(result.rows)) {
    return { rows: result.rows, meta: result.meta ?? null, raw: result };
  }
  return { rows: null, meta: null, raw: result };
}
