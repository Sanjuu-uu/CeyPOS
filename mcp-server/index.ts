import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  queryShopDatabase,
  getShopSchema,
  getShopSampleData,
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
  } as const;
};

const inventoryQuerySchema = z
  .object({
    shopId: z.string().describe('The shop ID'),
    query: z.string().describe('SQL query to execute on inventory table'),
  })
  .strict();

const salesQuerySchema = z
  .object({
    shopId: z.string().describe('The shop ID'),
    query: z.string().describe('SQL query to execute on sales tables'),
  })
  .strict();

const customersQuerySchema = z
  .object({
    shopId: z.string().describe('The shop ID'),
    query: z.string().describe('SQL query to execute on customers table'),
  })
  .strict();

const schemaRequestSchema = z
  .object({
    shopId: z.string().describe('The shop ID'),
  })
  .strict();

const sampleDataSchema = z
  .object({
    shopId: z.string().describe('The shop ID'),
    table: z.string().describe('Table name'),
    limit: z.number().optional().describe('Number of rows to return'),
  })
  .strict();

const server = new McpServer({
  name: 'ceypos-mcp-server',
  version: '1.0.0',
});

// Tool to query inventory
server.registerTool(
  'query_inventory',
  {
    description: 'Query the inventory table for product information',
    inputSchema: inventoryQuerySchema,
  },
  async ({ shopId, query }) => {
    try {
      const result = await queryShopDatabase(shopId, query);
      return toSuccessContent(result);
    } catch (error) {
      return toErrorContent(error);
    }
  }
);

// Tool to query sales
server.registerTool(
  'query_sales',
  {
    description: 'Query sales-related tables (transactions, transaction_items, daily_sales)',
    inputSchema: salesQuerySchema,
  },
  async ({ shopId, query }) => {
    try {
      const result = await queryShopDatabase(shopId, query);
      return toSuccessContent(result);
    } catch (error) {
      return toErrorContent(error);
    }
  }
);

// Tool to query customers
server.registerTool(
  'query_customers',
  {
    description: 'Query the customers table',
    inputSchema: customersQuerySchema,
  },
  async ({ shopId, query }) => {
    try {
      const result = await queryShopDatabase(shopId, query);
      return toSuccessContent(result);
    } catch (error) {
      return toErrorContent(error);
    }
  }
);

// Tool to get schema
server.registerTool(
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
server.registerTool(
  'get_sample_data',
  {
    description: 'Get sample data from a table',
    inputSchema: sampleDataSchema,
  },
  async ({ shopId, table, limit = 5 }) => {
    try {
      const result = await getShopSampleData(shopId, table, limit);
      return toSuccessContent(result);
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