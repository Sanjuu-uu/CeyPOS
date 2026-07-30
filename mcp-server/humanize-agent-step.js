const TOOL_DOMAIN = {
  query_inventory: "Inventory",
  query_inventory_operations: "Inventory operations",
  query_sales: "Sales",
  query_register_shifts: "Register shifts",
  query_customers: "Customers",
  query_general: "Shop data",
  get_schema: "Shop records",
  generate_kpi_card: "KPI",
  generate_bar_chart: "Chart",
  generate_line_chart: "Chart",
  generate_pie_chart: "Chart",
};

const TABLE_PHRASES = {
  daily_sales: "sales records",
  transactions: "transactions",
  transaction_items: "purchase details",
  inventory: "inventory",
  inventory_suppliers: "suppliers",
  inventory_purchase_orders: "purchase orders",
  inventory_goods_received: "goods received",
  inventory_purchase_returns: "purchase returns",
  inventory_stock_counts: "stock counts",
  inventory_movements: "inventory movement ledger",
  inventory_product_variants: "product variants",
  checkout_invoice_sequences: "checkout invoice sequence",
  checkout_audit_records: "checkout audit records",
  shop_terminals: "register terminals",
  member_shifts: "register shifts",
  register_cash_movements: "cash movements",
  customers: "customer records",
  shop_meta: "shop profile",
  inventory_forecast: "inventory forecasts",
};

const IDENTIFIER_PHRASES = {
  daily_sales: "sales records",
  transaction_items: "purchase line items",
  transactions: "transactions",
  inventory_forecast: "inventory forecasts",
  inventory: "inventory",
  inventory_suppliers: "suppliers",
  inventory_purchase_orders: "purchase orders",
  inventory_goods_received: "goods received",
  inventory_purchase_returns: "purchase returns",
  inventory_stock_counts: "stock counts",
  inventory_movements: "inventory movement ledger",
  inventory_product_variants: "product variants",
  checkout_invoice_sequences: "checkout invoice sequence",
  checkout_audit_records: "checkout audit records",
  shop_terminals: "register terminals",
  member_shifts: "register shifts",
  register_cash_movements: "cash movements",
  shop_meta: "shop profile",
  item_id: "product ID",
  inventory_code: "product code",
  barcode_id: "barcode",
  restock_suggestion: "restock recommendation",
  cost_price: "cost price",
  reorder_threshold: "reorder threshold",
  unit_name: "unit",
  pack_size: "pack size",
  quantity_delta: "stock change",
  quantity_after: "stock after change",
  customer_id: "customer ID",
  payment_method: "payment method",
  idempotency_key: "checkout retry key",
  invoice_number: "invoice number",
  total_cents: "total",
  subtotal_cents: "subtotal",
  discount_cents: "discount",
  tax_cents: "tax",
  surcharge_cents: "surcharge",
  redemption_cents: "points redemption",
  terminal_id: "terminal ID",
  served_by_member_id: "cashier ID",
  served_by_display_name: "cashier",
  opening_float_cents: "opening float",
  cash_paid_in_cents: "cash paid in",
  cash_paid_out_cents: "cash paid out",
  expected_cash_cents: "expected cash",
  actual_closing_cash_cents: "actual closing cash",
  variance_cents: "variance",
  closing_notes: "closing notes",
  manager_approval_status: "manager approval",
  movement_type: "cash movement type",
  total_sales: "total sales",
  transactions_count: "order count",
  created_at: "date",
  updated_at: "last updated",
  query_inventory: "inventory lookup",
  query_inventory_operations: "inventory operations lookup",
  query_sales: "sales lookup",
  query_register_shifts: "register shift lookup",
  query_customers: "customer lookup",
  query_general: "data lookup",
  get_schema: "record structure",
};

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getToolNameFromTitle(title) {
  const match = String(title || "").match(/^(?:Running|Completed|Failed)\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

function getToolDomain(toolName) {
  return TOOL_DOMAIN[toolName] || "Shop data";
}

function extractPrimarySearchTerm(sql) {
  const normalized = normalizeWhitespace(sql);
  const patterns = [
    /where\s+(?:[\w.]+\.)?name\s*(?:=|like)\s*'([^']+)'/i,
    /where\s+(?:[\w.]+\.)?(?:item_id|inventory_code|barcode_id|sku|receipt_id|transaction_code)\s*(?:=|like)\s*'([^']+)'/i,
    /where\s+(?:[\w.]+\.)?(?:email|phone)\s*(?:=|like)\s*'([^']+)'/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      return match[1].replace(/%/g, "").trim();
    }
  }
  return null;
}

function detectTimeScope(text) {
  const lower = normalizeWhitespace(text).toLowerCase();
  if (/\blast month\b/.test(lower)) return "last month";
  if (/\bthis month\b/.test(lower)) return "this month";
  if (/\btoday\b/.test(lower)) return "today";
  if (/\byesterday\b/.test(lower)) return "yesterday";
  if (/\blast week\b/.test(lower)) return "last week";
  if (/\bthis week\b/.test(lower)) return "this week";
  if (/\blast 7 days\b/.test(lower)) return "the last 7 days";
  if (/\blast 30 days\b/.test(lower)) return "the last 30 days";
  if (/strftime\s*\(\s*'%Y-%m'/.test(lower)) return "the selected month";
  if (/\bdate\b/.test(lower) || /\bcreated_at\b/.test(lower)) return "the selected period";
  return null;
}

function resolveTimeScope(sql, question = null) {
  const questionScope = question ? detectTimeScope(question) : null;
  const sqlScope = sql ? detectTimeScope(sql) : null;
  if (questionScope) return questionScope;
  if (sqlScope && sqlScope !== "the selected period") return sqlScope;
  return sqlScope;
}

function inferSqlIntent(sql, domain, question = null) {
  const normalized = normalizeWhitespace(sql);
  const lower = normalized.toLowerCase();
  const searchTerm = extractPrimarySearchTerm(normalized);
  const timeScope = resolveTimeScope(normalized, question);

  if (searchTerm) {
    const domainLabel = domain === "Customers" ? "customers" : domain.toLowerCase();
    return {
      domain,
      running: `Searching ${domainLabel} for "${searchTerm}"`,
      doneBase: `Searched ${domainLabel} for "${searchTerm}"`,
    };
  }

  if (/\bpayment_method\b/.test(lower)) {
    return {
      domain: "Sales",
      running: "Comparing sales by payment method",
      doneBase: "Compared sales by payment method",
    };
  }

  if (/\b(member_shifts|register_cash_movements|opening_float|expected_cash|actual_closing_cash|variance|cash_paid_in|cash_paid_out)\b/.test(lower)) {
    return {
      domain: "Register shifts",
      running: "Reviewing register reconciliation",
      doneBase: "Reviewed register reconciliation",
    };
  }

  if (/\b(checkout_audit_records|idempotency_key|invoice_number|invoice_sequence)\b/.test(lower)) {
    return {
      domain: "Sales",
      running: "Reviewing checkout audit records",
      doneBase: "Reviewed checkout audit records",
    };
  }

  if (/\brestock|stock\b/.test(lower) && domain === "Inventory") {
    return {
      domain: "Inventory",
      running: "Reviewing restock recommendations",
      doneBase: "Reviewed restock recommendations",
    };
  }

  if (/\b(sum|count|avg|min|max)\s*\(/i.test(normalized)) {
    if (domain === "Sales") {
      const scope = timeScope ? `${timeScope}'s sales` : "sales totals";
      return {
        domain: "Sales",
        running: `Calculating ${scope}`,
        doneBase: timeScope ? `Calculated ${timeScope}'s sales` : "Calculated sales totals",
      };
    }
    if (domain === "Inventory") {
      return {
        domain: "Inventory",
        running: "Calculating inventory figures",
        doneBase: "Calculated inventory figures",
      };
    }
    if (domain === "Customers") {
      return {
        domain: "Customers",
        running: "Calculating customer metrics",
        doneBase: "Calculated customer metrics",
      };
    }
    if (domain === "Register shifts") {
      return {
        domain: "Register shifts",
        running: "Calculating register reconciliation",
        doneBase: "Calculated register reconciliation",
      };
    }
    return {
      domain,
      running: "Calculating shop metrics",
      doneBase: "Calculated shop metrics",
    };
  }

  if (/\bjoin\b/.test(lower)) {
    return {
      domain,
      running: "Cross-checking related shop records",
      doneBase: "Cross-checked related shop records",
    };
  }

  if (timeScope && domain === "Sales") {
    return {
      domain: "Sales",
      running: `Analyzing ${timeScope}'s sales`,
      doneBase: `Analyzed ${timeScope}'s sales`,
    };
  }

  if (domain === "Sales") {
    return {
      domain: "Sales",
      running: "Analyzing sales records",
      doneBase: "Reviewed sales records",
    };
  }

  if (domain === "Inventory") {
    return {
      domain: "Inventory",
      running: "Reviewing inventory",
      doneBase: "Reviewed inventory",
    };
  }

  if (domain === "Customers") {
    return {
      domain: "Customers",
      running: "Reviewing customer records",
      doneBase: "Reviewed customer records",
    };
  }

  return {
    domain,
    running: `Checking ${domain.toLowerCase()}`,
    doneBase: `Reviewed ${domain.toLowerCase()}`,
  };
}

function humanizeRowSuffix(rowCount) {
  if (rowCount === 0) return "no data found";
  if (rowCount === 1) return "found 1 matching record";
  if (typeof rowCount === "number" && rowCount > 1) {
    return `found ${rowCount} matching records`;
  }
  return null;
}

function humanizeChartStep(toolName, args, phase) {
  const title = normalizeWhitespace(args?.title);
  const label = title ? `"${title}"` : "visual";

  if (toolName === "generate_kpi_card") {
    return {
      domain: "KPI",
      message:
        phase === "running"
          ? `Preparing KPI card ${label}`
          : `Prepared KPI card ${label}`,
    };
  }

  return {
    domain: "Chart",
    message:
      phase === "running" ? `Building ${label}` : `Built ${label}`,
  };
}

export function humanizeAgentStepPayload({
  toolName,
  phase = "running",
  sql = null,
  rowCount = null,
  args = {},
  error = null,
  question = null,
}) {
  const domain = getToolDomain(toolName);

  if (phase === "error") {
    return {
      domain,
      message: `Couldn't complete ${domain.toLowerCase()} check`,
      detail: error ? normalizeWhitespace(String(error)).slice(0, 180) : undefined,
    };
  }

  if (toolName === "get_schema") {
    return {
      domain: "Shop records",
      message:
        phase === "running"
          ? "Reading shop record structure"
          : "Reviewed shop record structure",
    };
  }

  if (toolName?.startsWith("generate_")) {
    return humanizeChartStep(toolName, args, phase);
  }

  const normalizedSql = sql ? normalizeWhitespace(sql) : null;

  if (normalizedSql) {
    const intent = inferSqlIntent(normalizedSql, domain, question);
    if (phase === "running") {
      return { domain: intent.domain, message: intent.running };
    }

    const isAggregate = /\b(sum|count|avg|min|max)\s*\(/i.test(normalizedSql);
    if (isAggregate) {
      const suffix = rowCount === 0 ? "no data found" : null;
      return {
        domain: intent.domain,
        message: suffix ? `${intent.doneBase} — ${suffix}` : intent.doneBase,
      };
    }

    const suffix = humanizeRowSuffix(rowCount);
    if (suffix) {
      return {
        domain: intent.domain,
        message: `${intent.doneBase} — ${suffix}`,
      };
    }
    return { domain: intent.domain, message: intent.doneBase };
  }

  if (phase === "running") {
    return { domain, message: `Checking ${domain.toLowerCase()}` };
  }

  const suffix = humanizeRowSuffix(rowCount);
  if (suffix) {
    return {
      domain,
      message: `Reviewed ${domain.toLowerCase()} — ${suffix}`,
    };
  }

  return { domain, message: `Reviewed ${domain.toLowerCase()}` };
}

function looksLikeSql(value) {
  const text = normalizeWhitespace(value);
  return /^(select|with|insert|update|delete|pragma)\b/i.test(text);
}

function parseRowCountFromDetail(detail) {
  const match = String(detail || "").match(/(\d+)\s+rows?\s+returned/i);
  return match ? Number(match[1]) : null;
}

export function humanizeLegacyAgentStep(step) {
  if (!step || step.type !== "tool") return null;

  const toolName = getToolNameFromTitle(step.title);
  if (!toolName) {
    return {
      domain: "Shop data",
      message: normalizeWhitespace(step.detail || step.title),
    };
  }

  const phase = step.title?.startsWith("Completed")
    ? "done"
    : step.title?.startsWith("Failed")
      ? "error"
      : "running";

  const sql = looksLikeSql(step.detail) ? step.detail : null;
  const rowCount = phase === "done" ? parseRowCountFromDetail(step.detail) : null;

  const humanized = humanizeAgentStepPayload({
    toolName,
    phase,
    sql,
    rowCount,
    error: phase === "error" ? step.detail : null,
  });

  return humanized;
}

function friendlyIdentifier(value) {
  const key = String(value || "").toLowerCase();
  if (IDENTIFIER_PHRASES[key]) return IDENTIFIER_PHRASES[key];
  if (TABLE_PHRASES[key]) return TABLE_PHRASES[key];
  return key.replace(/_/g, " ");
}

export function sanitizeUserFacingText(text) {
  if (!text || typeof text !== "string") return text;

  let result = text;

  const sentenceReplacements = [
    [/There is no sales data available in the system to calculate last month's sales\.\s*The [`']?daily_sales[`']?\s+table is currently empty\.?/gi, "There is no sales data available for last month yet."],
    [/The [`']?daily_sales[`']?\s+table is currently empty\.?/gi, "There is no sales data available yet."],
    [/The [`']?inventory[`']?\s+table is currently empty\.?/gi, "There is no inventory data available yet."],
    [/The [`']?customers[`']?\s+table is currently empty\.?/gi, "There is no customer data available yet."],
    [/[`']?daily_sales[`']?\s+table is currently empty\.?/gi, "There is no sales data available yet."],
  ];

  for (const [pattern, replacement] of sentenceReplacements) {
    result = result.replace(pattern, replacement);
  }

  result = result.replace(/```sql[\s\S]*?```/gi, "");
  result = result.replace(/```[\s\S]*?```/g, (block) => {
    if (/\b(select|from|where|join|group by)\b/i.test(block)) return "";
    return block;
  });

  result = result.replace(/`([^`]+)`/g, (_, raw) => friendlyIdentifier(raw));

  const emptyDataReplacements = [
    [/[`']?daily_sales[`']?\s+(?:table\s+)?is\s+(?:currently\s+)?empty/gi, "there is no sales data available yet"],
    [/[`']?inventory[`']?\s+(?:table\s+)?is\s+(?:currently\s+)?empty/gi, "there is no inventory data available yet"],
    [/[`']?customers[`']?\s+(?:table\s+)?is\s+(?:currently\s+)?empty/gi, "there is no customer data available yet"],
    [/the\s+[`']?daily_sales[`']?\s+table\s+is\s+(?:currently\s+)?empty/gi, "there is no sales data available yet"],
    [/the\s+[`']?inventory[`']?\s+table\s+is\s+(?:currently\s+)?empty/gi, "there is no inventory data available yet"],
    [/the\s+table\s+is\s+(?:currently\s+)?empty/gi, "there is no data available yet"],
    [/table\s+is\s+(?:currently\s+)?empty/gi, "there is no data available yet"],
  ];

  for (const [pattern, replacement] of emptyDataReplacements) {
    result = result.replace(pattern, replacement);
  }

  const orderedReplacements = [
    [/transaction_items/gi, "purchase line items"],
    [/daily_sales/gi, "sales records"],
    [/inventory_forecast/gi, "inventory forecasts"],
    [/inventory_suppliers/gi, "suppliers"],
    [/inventory_purchase_orders/gi, "purchase orders"],
    [/inventory_goods_received/gi, "goods received"],
    [/inventory_purchase_returns/gi, "purchase returns"],
    [/inventory_stock_counts/gi, "stock counts"],
    [/inventory_movements/gi, "inventory movement ledger"],
    [/inventory_product_variants/gi, "product variants"],
    [/checkout_invoice_sequences/gi, "checkout invoice sequence"],
    [/checkout_audit_records/gi, "checkout audit records"],
    [/shop_terminals/gi, "register terminals"],
    [/member_shifts/gi, "register shifts"],
    [/register_cash_movements/gi, "cash movements"],
    [/shop_meta/gi, "shop profile"],
    [/restock_suggestion/gi, "restock recommendation"],
    [/reorder_threshold/gi, "reorder threshold"],
    [/cost_price/gi, "cost price"],
    [/quantity_delta/gi, "stock change"],
    [/quantity_after/gi, "stock after change"],
    [/inventory_code/gi, "product code"],
    [/payment_method/gi, "payment method"],
    [/idempotency_key/gi, "checkout retry key"],
    [/invoice_number/gi, "invoice number"],
    [/invoice_sequence/gi, "invoice sequence"],
    [/subtotal_cents/gi, "subtotal"],
    [/discount_cents/gi, "discount"],
    [/tax_cents/gi, "tax"],
    [/surcharge_cents/gi, "surcharge"],
    [/redemption_cents/gi, "points redemption"],
    [/total_cents/gi, "total"],
    [/terminal_id/gi, "terminal ID"],
    [/served_by_member_id/gi, "cashier ID"],
    [/served_by_display_name/gi, "cashier"],
    [/opening_float_cents/gi, "opening float"],
    [/cash_paid_in_cents/gi, "cash paid in"],
    [/cash_paid_out_cents/gi, "cash paid out"],
    [/expected_cash_cents/gi, "expected cash"],
    [/actual_closing_cash_cents/gi, "actual closing cash"],
    [/variance_cents/gi, "variance"],
    [/closing_notes/gi, "closing notes"],
    [/manager_approval_status/gi, "manager approval"],
    [/movement_type/gi, "cash movement type"],
    [/customer_id/gi, "customer ID"],
    [/item_id/gi, "product ID"],
    [/transactions_count/gi, "order count"],
    [/total_sales/gi, "total sales"],
    [/\btransactions\b/gi, "transactions"],
    [/\binventory\b/gi, "inventory"],
    [/\bcustomers\b/gi, "customers"],
    [/SQL query/gi, "lookup"],
    [/sql query/gi, "lookup"],
    [/rows returned/gi, "results"],
    [/row returned/gi, "result"],
    [/\btable\b/gi, "records"],
    [/\bcolumn\b/gi, "field"],
    [/query_inventory_operations/gi, "inventory operations lookup"],
    [/query_inventory/gi, "inventory lookup"],
    [/query_sales/gi, "sales lookup"],
    [/query_register_shifts/gi, "register shift lookup"],
    [/query_customers/gi, "customer lookup"],
    [/query_general/gi, "data lookup"],
    [/get_schema/gi, "record structure"],
  ];

  for (const [pattern, replacement] of orderedReplacements) {
    result = result.replace(pattern, replacement);
  }

  result = result.replace(/\s{2,}/g, " ");
  result = result.replace(/\n{3,}/g, "\n\n");

  return result.trim();
}

export function buildUserFacingPromptRules() {
  return `User-facing language rules:
- Never mention SQL, queries, tables, columns, schemas, tool names, internal keys, or database jargon in the final answer.
- Use plain business language only: inventory, sales, customers, receipts, products, orders, payment methods.
- Do not wrap internal identifiers in backticks.
- Example: say "There is no sales data for last month yet" instead of "The daily_sales table is empty."`;
}
