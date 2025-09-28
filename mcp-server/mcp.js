import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are an AI assistant for CeyPoS, a point-of-sale system. You help users analyze their shop data.

You have access to the following database tables:
- shop_meta: shop information (shop_id, shop_name, owner_name, etc.)
- inventory: products (item_id, name, category, price, stock, etc.)
- customers: customer data (customer_id, name, email, total_spent, etc.)
- transactions: sales transactions (transaction_id, total, payment_method, created_at, etc.)
- transaction_items: items in transactions (transaction_id, item_id, quantity, etc.)
- daily_sales: daily sales summary (date, total_sales, transactions_count, etc.)
- inventory_forecast: stock predictions (item_id, recommended_stock, etc.)

When a user asks a question, use the available tools to query the database and provide accurate, context-aware answers.

For data visualization requests, use the chart generation tools to create interactive previews. You can generate:
- KPI cards for metrics
- Bar charts for comparisons
- Line charts for trends over time
- Pie charts for proportions

Always use the tools to fetch real data - do not make up information.
When showing charts or cards, provide a brief explanation of what the visualization shows.`;

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'query_inventory',
      description: 'Query the inventory table for product information',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'SQL query to execute on inventory table'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'query_sales',
      description: 'Query sales-related tables (transactions, transaction_items, daily_sales)',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'SQL query to execute on sales tables'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'query_customers',
      description: 'Query the customers table',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'SQL query to execute on customers table'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'query_general',
      description: 'Execute a general SQL query on the database',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'SQL query to execute'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_kpi_card',
      description: 'Generate a KPI card preview with title, value, and optional subtitle',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'The title of the KPI card'
          },
          value: {
            type: 'string',
            description: 'The main value to display'
          },
          subtitle: {
            type: 'string',
            description: 'Optional subtitle or additional context'
          }
        },
        required: ['title', 'value']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_bar_chart',
      description: 'Generate a bar chart preview with data points',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Chart title'
          },
          data: {
            type: 'array',
            description: 'Array of data points with name and value',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                value: { type: 'number' }
              }
            }
          },
          xAxisKey: {
            type: 'string',
            description: 'Key for x-axis (usually "name")',
            default: 'name'
          },
          yAxisKey: {
            type: 'string',
            description: 'Key for y-axis (usually "value")',
            default: 'value'
          }
        },
        required: ['title', 'data']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_line_chart',
      description: 'Generate a line chart preview for trends over time',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Chart title'
          },
          data: {
            type: 'array',
            description: 'Array of data points with time and value',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                value: { type: 'number' }
              }
            }
          }
        },
        required: ['title', 'data']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_pie_chart',
      description: 'Generate a pie chart preview for proportions',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Chart title'
          },
          data: {
            type: 'array',
            description: 'Array of data points with name and value',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                value: { type: 'number' }
              }
            }
          }
        },
        required: ['title', 'data']
      }
    }
  }
];

async function processUserQuestion(question, shopId) {
  try {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: question }
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      tools: TOOLS,
      tool_choice: 'auto'
    });

    const message = response.choices[0].message;
    const visualizations = [];

    if (message.tool_calls) {
      messages.push(message);

      for (const toolCall of message.tool_calls) {
        const { name, arguments: args } = toolCall.function;
        let result;

        try {
          const parsedArgs = JSON.parse(args);
          result = await executeTool(name, parsedArgs, shopId);

          // Collect visualization data
          if (result && typeof result === 'object' && result.type) {
            visualizations.push(result);
          }
        } catch (error) {
          result = { error: `Failed to execute tool: ${error.message}` };
        }

        messages.push({
          role: 'tool',
          content: JSON.stringify(result),
          tool_call_id: toolCall.id
        });
      }

      const finalResponse = await openai.chat.completions.create({
        model: 'gpt-4',
        messages
      });

      const answer = finalResponse.choices[0].message.content || 'No response generated';

      // Return both text and visualizations
      return {
        answer,
        visualizations
      };
    } else {
      return {
        answer: message.content || 'No response generated',
        visualizations: []
      };
    }
  } catch (error) {
    console.error('Error processing question:', error);
    return {
      answer: `Error: ${error.message}`,
      visualizations: []
    };
  }
}

async function executeTool(name, args, shopId) {
  // Handle chart generation tools
  if (name === 'generate_kpi_card') {
    return {
      type: 'kpi_card',
      title: args.title,
      value: args.value,
      subtitle: args.subtitle
    };
  }

  if (name === 'generate_bar_chart') {
    return {
      type: 'bar_chart',
      title: args.title,
      data: args.data,
      xAxisKey: args.xAxisKey || 'name',
      yAxisKey: args.yAxisKey || 'value'
    };
  }

  if (name === 'generate_line_chart') {
    return {
      type: 'line_chart',
      title: args.title,
      data: args.data
    };
  }

  if (name === 'generate_pie_chart') {
    return {
      type: 'pie_chart',
      title: args.title,
      data: args.data
    };
  }

  // Handle database query tools
  const db = await import('../server/src/utils/db.js');
  const Database = (await import('better-sqlite3')).default;
  const path = await import('path');
  const fs = await import('fs');

  const dbPath = db.dbPathForShop(shopId);
  const connection = new Database(dbPath, { readonly: true });

  try {
    const result = connection.prepare(args.query).all();
    return result;
  } catch (error) {
    return { error: error.message };
  } finally {
    connection.close();
  }
}

export { processUserQuestion };