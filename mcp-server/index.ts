import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  queryShopDatabase,
  queryShopDatabaseWithSearch,
  getShopSchema,
  getShopSampleData,
  compactSearchQueryResult,
} from './shop-database-reader.js';

type QueryResult = Array<Record<string, unknown>>;

const toSuccessContent = (result: QueryResult | Record<string, unknown>) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
});

const toErrorContent = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
  return {
    content: [{ type: 'text' as const, text: `Error: ${message}` }],
    isError: true,
  };
};

const inventoryQuerySchema = {
  shopId: z.string().describe('The shop ID'),
  query: z.string().describe('SQL query to execute on inventory product tables'),
};

const inventoryOperationsQuerySchema = {
  shopId: z.string().describe('The shop ID'),
  query: z
    .string()
    .describe(
      'SQL query to execute on inventory lifecycle tables such as suppliers, purchase orders, goods received, returns, stock counts, movements, adjustment reasons, and variants',
    ),
};

const salesQuerySchema = {
  shopId: z.string().describe('The shop ID'),
  query: z.string().describe('SQL query to execute on sales, checkout, invoice and audit tables'),
};

const registerShiftsQuerySchema = {
  shopId: z.string().describe('The shop ID'),
  query: z
    .string()
    .describe(
      'SQL query to execute on cash-register shift, cash movement, terminal and related cash transaction tables',
    ),
};

const customersQuerySchema = {
  shopId: z.string().describe('The shop ID'),
  query: z.string().describe('SQL query to execute on customers table'),
};

const schemaRequestSchema = {
  shopId: z.string().describe('The shop ID'),
};

const sampleDataSchema = {
  shopId: z.string().describe('The shop ID'),
  table: z.string().describe('Table name'),
  limit: z.number().optional().describe('Number of rows to return'),
};

const server = new McpServer({
  name: 'ceypos-mcp-server',
  version: '1.0.0',
});
const registerTool = server.registerTool.bind(server) as any;

// Tool to query inventory
registerTool(
  'query_inventory',
  {
    description:
      'Query inventory products, including cost price, stock, reorder thresholds, units, pack sizes, barcode and supplier preference fields',
    inputSchema: inventoryQuerySchema,
  },
  async ({ shopId, query }) => {
    try {
      const result = await queryShopDatabaseWithSearch(shopId, query, 'query_inventory');
      return toSuccessContent(compactSearchQueryResult(result));
    } catch (error) {
      return toErrorContent(error);
    }
  }
);

registerTool(
  'query_inventory_operations',
  {
    description:
      'Query inventory lifecycle records: suppliers, purchase orders, goods received, purchase returns, stock-count sessions, adjustment reasons, damaged/expired/missing/promotional movements, movement ledger, and variants',
    inputSchema: inventoryOperationsQuerySchema,
  },
  async ({ shopId, query }) => {
    try {
      const result = await queryShopDatabaseWithSearch(shopId, query, 'query_inventory_operations');
      return toSuccessContent(compactSearchQueryResult(result));
    } catch (error) {
      return toErrorContent(error);
    }
  }
);

// Tool to query sales
registerTool(
  'query_sales',
  {
    description:
      'Query sales and checkout tables: transactions, transaction_items, daily_sales, checkout invoice sequence and checkout audit records, including invoice numbers, idempotency keys, cents totals, discounts, taxes, surcharges and terminal/cashier attribution',
    inputSchema: salesQuerySchema,
  },
  async ({ shopId, query }) => {
    try {
      const result = await queryShopDatabase(shopId, query);
      return toSuccessContent(compactSearchQueryResult(result));
    } catch (error) {
      return toErrorContent(error);
    }
  }
);

registerTool(
  'query_register_shifts',
  {
    description:
      'Query cash-register reconciliation records: register opening, opening float, cash paid in/out, expected cash, actual closing cash, variance, closing notes, manager approval, per-terminal shift history and end-of-day reports',
    inputSchema: registerShiftsQuerySchema,
  },
  async ({ shopId, query }) => {
    try {
      const result = await queryShopDatabase(shopId, query);
      return toSuccessContent(compactSearchQueryResult(result));
    } catch (error) {
      return toErrorContent(error);
    }
  }
);

// Tool to query customers
registerTool(
  'query_customers',
  {
    description: 'Query the customers table',
    inputSchema: customersQuerySchema,
  },
  async ({ shopId, query }) => {
    try {
      const result = await queryShopDatabaseWithSearch(shopId, query, 'query_customers');
      return toSuccessContent(compactSearchQueryResult(result));
    } catch (error) {
      return toErrorContent(error);
    }
  }
);

// Tool to get schema
registerTool(
  'get_schema',
  {
    description: 'Get the database schema for a shop',
    inputSchema: schemaRequestSchema,
  },
  async ({ shopId }) => {
    try {
      const result = await getShopSchema(shopId);
      return toSuccessContent(result);
    } catch (error) {
      return toErrorContent(error);
    }
  }
);

// Tool to get sample data
registerTool(
  'get_sample_data',
  {
    description: 'Get sample data from a table',
    inputSchema: sampleDataSchema,
  },
  async ({ shopId, table, limit = 5 }) => {
    try {
      const result = await getShopSampleData(shopId, table, limit);
      return toSuccessContent(compactSearchQueryResult(result));
    } catch (error) {
      return toErrorContent(error);
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log('CeyPos MCP server running...');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
