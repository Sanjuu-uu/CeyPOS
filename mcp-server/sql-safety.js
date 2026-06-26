const DEFAULT_ROW_LIMIT = 100;
const MAX_ROW_LIMIT = 500;

function stripSqlComments(sql) {
  return String(sql || "")
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim();
}

function validateReadOnlySql(query) {
  const sql = String(query || "").trim();
  if (!sql) {
    return { ok: false, error: "SQL query is empty" };
  }

  const withoutTrailingSemicolon = sql.replace(/;\s*$/, "").trim();
  if (withoutTrailingSemicolon.includes(";")) {
    return { ok: false, error: "Only one SQL statement is allowed" };
  }

  const normalized = stripSqlComments(withoutTrailingSemicolon).toLowerCase();
  const startsReadOnly =
    normalized.startsWith("select ") ||
    normalized.startsWith("with ") ||
    normalized.startsWith("pragma table_info") ||
    normalized.startsWith("pragma index_list") ||
    normalized.startsWith("pragma foreign_key_list");

  if (!startsReadOnly) {
    return {
      ok: false,
      error: "Only read-only SELECT, WITH, and safe PRAGMA queries are allowed",
    };
  }

  const blocked =
    /\b(insert|update|delete|drop|alter|create|replace|attach|detach|vacuum|reindex|truncate)\b/i;
  if (blocked.test(normalized)) {
    return { ok: false, error: "Mutating SQL statements are not allowed" };
  }

  return { ok: true, sql: withoutTrailingSemicolon };
}

function hasTopLevelLimit(sql) {
  const normalized = stripSqlComments(sql).toLowerCase();
  return /\blimit\s+\d+\b/i.test(normalized);
}

function applyReadLimit(sql, requestedLimit = DEFAULT_ROW_LIMIT) {
  const normalized = stripSqlComments(sql).toLowerCase();
  if (normalized.startsWith("pragma ")) {
    return sql;
  }

  const parsedLimit = Number(requestedLimit);
  const safeLimit = Math.min(
    Math.max(Number.isFinite(parsedLimit) ? Math.trunc(parsedLimit) : DEFAULT_ROW_LIMIT, 1),
    MAX_ROW_LIMIT,
  );

  if (hasTopLevelLimit(sql)) {
    return sql;
  }

  return `${sql} LIMIT ${safeLimit}`;
}

export {
  DEFAULT_ROW_LIMIT,
  MAX_ROW_LIMIT,
  applyReadLimit,
  validateReadOnlySql,
};
