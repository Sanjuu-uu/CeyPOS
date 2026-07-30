export interface AgentStepLike {
  id: string;
  type: string;
  title: string;
  detail?: string;
  status: 'running' | 'done' | 'error';
  domain?: string;
  at?: string;
}

export interface HumanizedAgentStep {
  domain: string;
  message: string;
}

const TOOL_DOMAIN: Record<string, string> = {
  query_inventory: 'Inventory',
  query_inventory_operations: 'Inventory operations',
  query_sales: 'Sales',
  query_customers: 'Customers',
  query_general: 'Shop data',
  get_schema: 'Shop records',
  generate_kpi_card: 'KPI',
  generate_bar_chart: 'Chart',
  generate_line_chart: 'Chart',
  generate_pie_chart: 'Chart',
};

const IDENTIFIER_PHRASES: Record<string, string> = {
  daily_sales: 'sales records',
  transaction_items: 'purchase line items',
  transactions: 'transactions',
  inventory_forecast: 'inventory forecasts',
  inventory: 'inventory',
  inventory_suppliers: 'suppliers',
  inventory_purchase_orders: 'purchase orders',
  inventory_goods_received: 'goods received',
  inventory_purchase_returns: 'purchase returns',
  inventory_stock_counts: 'stock counts',
  inventory_movements: 'inventory movement ledger',
  inventory_product_variants: 'product variants',
  shop_meta: 'shop profile',
  item_id: 'product ID',
  inventory_code: 'product code',
  barcode_id: 'barcode',
  restock_suggestion: 'restock recommendation',
  cost_price: 'cost price',
  reorder_threshold: 'reorder threshold',
  unit_name: 'unit',
  pack_size: 'pack size',
  quantity_delta: 'stock change',
  quantity_after: 'stock after change',
  customer_id: 'customer ID',
  payment_method: 'payment method',
  total_sales: 'total sales',
  transactions_count: 'order count',
  created_at: 'date',
  updated_at: 'last updated',
  query_inventory: 'inventory lookup',
  query_inventory_operations: 'inventory operations lookup',
  query_sales: 'sales lookup',
  query_customers: 'customer lookup',
  query_general: 'data lookup',
  get_schema: 'record structure',
};

const normalizeWhitespace = (value: string) => String(value || '').replace(/\s+/g, ' ').trim();

const getToolNameFromTitle = (title: string) => {
  const match = String(title || '').match(/^(?:Running|Completed|Failed)\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
};

const getToolDomain = (toolName: string) => TOOL_DOMAIN[toolName] || 'Shop data';

const extractPrimarySearchTerm = (sql: string) => {
  const normalized = normalizeWhitespace(sql);
  const patterns = [
    /where\s+(?:[\w.]+\.)?name\s*(?:=|like)\s*'([^']+)'/i,
    /where\s+(?:[\w.]+\.)?(?:item_id|inventory_code|barcode_id|sku|receipt_id|transaction_code)\s*(?:=|like)\s*'([^']+)'/i,
    /where\s+(?:[\w.]+\.)?(?:email|phone)\s*(?:=|like)\s*'([^']+)'/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) return match[1].replace(/%/g, '').trim();
  }
  return null;
};

const detectTimeScope = (sql: string) => {
  const lower = normalizeWhitespace(sql).toLowerCase();
  if (/\blast month\b/.test(lower)) return 'last month';
  if (/\bthis month\b/.test(lower)) return 'this month';
  if (/\btoday\b/.test(lower)) return 'today';
  if (/\byesterday\b/.test(lower)) return 'yesterday';
  if (/\blast week\b/.test(lower)) return 'last week';
  if (/\bthis week\b/.test(lower)) return 'this week';
  if (/\blast 7 days\b/.test(lower)) return 'the last 7 days';
  if (/\blast 30 days\b/.test(lower)) return 'the last 30 days';
  if (/strftime\s*\(\s*'%Y-%m'/.test(lower)) return 'the selected month';
  if (/\bdate\b/.test(lower) || /\bcreated_at\b/.test(lower)) return 'the selected period';
  return null;
};

const resolveTimeScope = (sql: string, question?: string | null) => {
  const questionScope = question ? detectTimeScope(question) : null;
  const sqlScope = sql ? detectTimeScope(sql) : null;
  if (questionScope) return questionScope;
  if (sqlScope && sqlScope !== 'the selected period') return sqlScope;
  return sqlScope;
};

const inferSqlIntent = (sql: string, domain: string, question?: string | null) => {
  const normalized = normalizeWhitespace(sql);
  const lower = normalized.toLowerCase();
  const searchTerm = extractPrimarySearchTerm(normalized);
  const timeScope = resolveTimeScope(normalized, question);

  if (searchTerm) {
    const domainLabel = domain === 'Customers' ? 'customers' : domain.toLowerCase();
    return {
      domain,
      running: `Searching ${domainLabel} for "${searchTerm}"`,
      doneBase: `Searched ${domainLabel} for "${searchTerm}"`,
    };
  }

  if (/\bpayment_method\b/.test(lower)) {
    return {
      domain: 'Sales',
      running: 'Comparing sales by payment method',
      doneBase: 'Compared sales by payment method',
    };
  }

  if (/\brestock|stock\b/.test(lower) && domain === 'Inventory') {
    return {
      domain: 'Inventory',
      running: 'Reviewing restock recommendations',
      doneBase: 'Reviewed restock recommendations',
    };
  }

  if (/\b(sum|count|avg|min|max)\s*\(/i.test(normalized)) {
    if (domain === 'Sales') {
      const scope = timeScope ? `${timeScope}'s sales` : 'sales totals';
      return {
        domain: 'Sales',
        running: `Calculating ${scope}`,
        doneBase: timeScope ? `Calculated ${timeScope}'s sales` : 'Calculated sales totals',
      };
    }
    if (domain === 'Inventory') {
      return {
        domain: 'Inventory',
        running: 'Calculating inventory figures',
        doneBase: 'Calculated inventory figures',
      };
    }
    if (domain === 'Customers') {
      return {
        domain: 'Customers',
        running: 'Calculating customer metrics',
        doneBase: 'Calculated customer metrics',
      };
    }
    return {
      domain,
      running: 'Calculating shop metrics',
      doneBase: 'Calculated shop metrics',
    };
  }

  if (/\bjoin\b/.test(lower)) {
    return {
      domain,
      running: 'Cross-checking related shop records',
      doneBase: 'Cross-checked related shop records',
    };
  }

  if (timeScope && domain === 'Sales') {
    return {
      domain: 'Sales',
      running: `Analyzing ${timeScope}'s sales`,
      doneBase: `Analyzed ${timeScope}'s sales`,
    };
  }

  if (domain === 'Sales') {
    return {
      domain: 'Sales',
      running: 'Analyzing sales records',
      doneBase: 'Reviewed sales records',
    };
  }

  if (domain === 'Inventory') {
    return {
      domain: 'Inventory',
      running: 'Reviewing inventory',
      doneBase: 'Reviewed inventory',
    };
  }

  if (domain === 'Customers') {
    return {
      domain: 'Customers',
      running: 'Reviewing customer records',
      doneBase: 'Reviewed customer records',
    };
  }

  return {
    domain,
    running: `Checking ${domain.toLowerCase()}`,
    doneBase: `Reviewed ${domain.toLowerCase()}`,
  };
};

const humanizeRowSuffix = (rowCount: number | null) => {
  if (rowCount === 0) return 'no data found';
  if (rowCount === 1) return 'found 1 matching record';
  if (typeof rowCount === 'number' && rowCount > 1) return `found ${rowCount} matching records`;
  return null;
};

const looksLikeSql = (value: string) => /^(select|with|insert|update|delete|pragma)\b/i.test(normalizeWhitespace(value));

const parseRowCountFromDetail = (detail: string) => {
  const match = String(detail || '').match(/(\d+)\s+rows?\s+returned/i);
  return match ? Number(match[1]) : null;
};

const humanizeAgentStepPayload = ({
  toolName,
  phase = 'running',
  sql = null,
  rowCount = null,
}: {
  toolName: string;
  phase?: 'running' | 'done' | 'error';
  sql?: string | null;
  rowCount?: number | null;
}): HumanizedAgentStep => {
  const domain = getToolDomain(toolName);

  if (phase === 'error') {
    return {
      domain,
      message: `Couldn't complete ${domain.toLowerCase()} check`,
    };
  }

  if (toolName === 'get_schema') {
    return {
      domain: 'Shop records',
      message:
        phase === 'running' ? 'Reading shop record structure' : 'Reviewed shop record structure',
    };
  }

  if (toolName.startsWith('generate_')) {
    return {
      domain: toolName === 'generate_kpi_card' ? 'KPI' : 'Chart',
      message:
        phase === 'running'
          ? toolName === 'generate_kpi_card'
            ? 'Preparing KPI card'
            : 'Building chart'
          : toolName === 'generate_kpi_card'
            ? 'Prepared KPI card'
            : 'Built chart',
    };
  }

  const normalizedSql = sql ? normalizeWhitespace(sql) : null;

  if (normalizedSql) {
    const intent = inferSqlIntent(normalizedSql, domain);
    if (phase === 'running') {
      return { domain: intent.domain, message: intent.running };
    }

    const isAggregate = /\b(sum|count|avg|min|max)\s*\(/i.test(normalizedSql);
    if (isAggregate) {
      const suffix = rowCount === 0 ? 'no data found' : null;
      return {
        domain: intent.domain,
        message: suffix ? `${intent.doneBase} — ${suffix}` : intent.doneBase,
      };
    }

    const suffix = humanizeRowSuffix(rowCount);
    return {
      domain: intent.domain,
      message: suffix ? `${intent.doneBase} — ${suffix}` : intent.doneBase,
    };
  }

  if (phase === 'running') {
    return { domain, message: `Checking ${domain.toLowerCase()}` };
  }

  const suffix = humanizeRowSuffix(rowCount);
  return {
    domain,
    message: suffix ? `Reviewed ${domain.toLowerCase()} — ${suffix}` : `Reviewed ${domain.toLowerCase()}`,
  };
};

export const humanizeAgentStep = (step: AgentStepLike): HumanizedAgentStep => {
  if (step.domain && step.detail && !looksLikeSql(step.detail)) {
    return {
      domain: step.domain,
      message: normalizeWhitespace(step.detail),
    };
  }

  if (step.type !== 'tool') {
    return {
      domain: 'Shop data',
      message: normalizeWhitespace(step.detail || step.title),
    };
  }

  const toolName = getToolNameFromTitle(step.title);
  if (!toolName) {
    return {
      domain: step.domain || 'Shop data',
      message: normalizeWhitespace(step.detail || step.title),
    };
  }

  const phase = step.title.startsWith('Completed')
    ? 'done'
    : step.title.startsWith('Failed')
      ? 'error'
      : 'running';

  const sql = step.detail && looksLikeSql(step.detail) ? step.detail : null;
  const rowCount = phase === 'done' ? parseRowCountFromDetail(step.detail || '') : null;

  return humanizeAgentStepPayload({
    toolName,
    phase,
    sql,
    rowCount,
  });
};

const friendlyIdentifier = (value: string) => {
  const key = String(value || '').toLowerCase();
  return IDENTIFIER_PHRASES[key] || key.replace(/_/g, ' ');
};

export const sanitizeUserFacingText = (text: string) => {
  if (!text || typeof text !== 'string') return text;

  let result = text;

  const sentenceReplacements: Array<[RegExp, string]> = [
    [/There is no sales data available in the system to calculate last month's sales\.\s*The [`']?daily_sales[`']?\s+table is currently empty\.?/gi, 'There is no sales data available for last month yet.'],
    [/The [`']?daily_sales[`']?\s+table is currently empty\.?/gi, 'There is no sales data available yet.'],
    [/The [`']?inventory[`']?\s+table is currently empty\.?/gi, 'There is no inventory data available yet.'],
    [/[`']?daily_sales[`']?\s+table is currently empty\.?/gi, 'There is no sales data available yet.'],
  ];

  for (const [pattern, replacement] of sentenceReplacements) {
    result = result.replace(pattern, replacement);
  }

  result = result.replace(/```sql[\s\S]*?```/gi, '');
  result = result.replace(/```[\s\S]*?```/g, (block) => {
    if (/\b(select|from|where|join|group by)\b/i.test(block)) return '';
    return block;
  });

  result = result.replace(/`([^`]+)`/g, (_, raw: string) => friendlyIdentifier(raw));

  const emptyDataReplacements: Array<[RegExp, string]> = [
    [/[`']?daily_sales[`']?\s+(?:table\s+)?is\s+(?:currently\s+)?empty/gi, 'there is no sales data available yet'],
    [/[`']?inventory[`']?\s+(?:table\s+)?is\s+(?:currently\s+)?empty/gi, 'there is no inventory data available yet'],
    [/the\s+[`']?daily_sales[`']?\s+table\s+is\s+(?:currently\s+)?empty/gi, 'there is no sales data available yet'],
    [/the\s+table\s+is\s+(?:currently\s+)?empty/gi, 'there is no data available yet'],
    [/table\s+is\s+(?:currently\s+)?empty/gi, 'there is no data available yet'],
  ];

  for (const [pattern, replacement] of emptyDataReplacements) {
    result = result.replace(pattern, replacement);
  }

  const orderedReplacements: Array<[RegExp, string]> = [
    [/transaction_items/gi, 'purchase line items'],
    [/daily_sales/gi, 'sales records'],
    [/inventory_forecast/gi, 'inventory forecasts'],
    [/inventory_suppliers/gi, 'suppliers'],
    [/inventory_purchase_orders/gi, 'purchase orders'],
    [/inventory_goods_received/gi, 'goods received'],
    [/inventory_purchase_returns/gi, 'purchase returns'],
    [/inventory_stock_counts/gi, 'stock counts'],
    [/inventory_movements/gi, 'inventory movement ledger'],
    [/inventory_product_variants/gi, 'product variants'],
    [/shop_meta/gi, 'shop profile'],
    [/restock_suggestion/gi, 'restock recommendation'],
    [/reorder_threshold/gi, 'reorder threshold'],
    [/cost_price/gi, 'cost price'],
    [/quantity_delta/gi, 'stock change'],
    [/quantity_after/gi, 'stock after change'],
    [/inventory_code/gi, 'product code'],
    [/payment_method/gi, 'payment method'],
    [/customer_id/gi, 'customer ID'],
    [/item_id/gi, 'product ID'],
    [/transactions_count/gi, 'order count'],
    [/total_sales/gi, 'total sales'],
    [/\btransactions\b/gi, 'transactions'],
    [/\binventory\b/gi, 'inventory'],
    [/\bcustomers\b/gi, 'customers'],
    [/SQL query/gi, 'lookup'],
    [/sql query/gi, 'lookup'],
    [/rows returned/gi, 'results'],
    [/row returned/gi, 'result'],
    [/\btable\b/gi, 'records'],
    [/\bcolumn\b/gi, 'field'],
    [/query_inventory_operations/gi, 'inventory operations lookup'],
    [/query_inventory/gi, 'inventory lookup'],
    [/query_sales/gi, 'sales lookup'],
    [/query_customers/gi, 'customer lookup'],
    [/query_general/gi, 'data lookup'],
    [/get_schema/gi, 'record structure'],
  ];

  for (const [pattern, replacement] of orderedReplacements) {
    result = result.replace(pattern, replacement);
  }

  result = result.replace(/\s{2,}/g, ' ');
  result = result.replace(/\n{3,}/g, '\n\n');

  return result.trim();
};
