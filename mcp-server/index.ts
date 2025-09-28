import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { queryDatabase, getSchema, getSampleData } from './database.js';

const server = new McpServer({
  name: 'ceypos-mcp-server',
  version: '1.0.0',
});

// Tool to query inventory
server.tool(
  'query_inventory',
  'Query the inventory table for product information',
  {
    shopId: z.string().describe('The shop ID'),
    query: z.string().describe('SQL query to execute on inventory table')
  },
  async ({ shopId, query }) => {
    try {
      const result = await queryDatabase(shopId, query);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

// Tool to query sales
server.tool(
  'query_sales',
  'Query sales-related tables (transactions, transaction_items, daily_sales)',
  {
    shopId: z.string().describe('The shop ID'),
    query: z.string().describe('SQL query to execute on sales tables')
  },
  async ({ shopId, query }) => {
    try {
      const result = await queryDatabase(shopId, query);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

// Tool to query customers
server.tool(
  'query_customers',
  'Query the customers table',
  {
    shopId: z.string().describe('The shop ID'),
    query: z.string().describe('SQL query to execute on customers table')
  },
  async ({ shopId, query }) => {
    try {
      const result = await queryDatabase(shopId, query);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

// Tool to get schema
server.tool(
  'get_schema',
  'Get the database schema for a shop',
  {
    shopId: z.string().describe('The shop ID')
  },
  async ({ shopId }) => {
    try {
      const result = await getSchema(shopId);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

// Tool to get sample data
server.tool(
  'get_sample_data',
  'Get sample data from a table',
  {
    shopId: z.string().describe('The shop ID'),
    table: z.string().describe('Table name'),
    limit: z.number().optional().describe('Number of rows to return')
  },
  async ({ shopId, table, limit = 5 }) => {
    try {
      const result = await getSampleData(shopId, table, limit);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('CeyPoS MCP server is running...');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});