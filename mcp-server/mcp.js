import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import sqlite3 from 'sqlite3';
import dotenv from 'dotenv';
import { dbExists, dbPathForShop } from './db-path.js';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_DIR = path.join(__dirname, 'logs');
const MAX_LOG_STRING_LENGTH = 1000;
const MAX_LOG_ARRAY_ITEMS = 20;
const MAX_LOG_OBJECT_KEYS = 30;

function ensureLogDir() {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
  } catch (error) {
    console.error('Failed to prepare MCP log directory', error);
  }
}

function safeForLog(value, depth = 0) {
  if (depth > 3) {
    return '[depth truncated]';
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return value.length > MAX_LOG_STRING_LENGTH
      ? `${value.slice(0, MAX_LOG_STRING_LENGTH)}…`
      : value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    const sample = value.slice(0, MAX_LOG_ARRAY_ITEMS).map((item) =>
      safeForLog(item, depth + 1)
    );
    const summary = {
      length: value.length,
      sample,
    };
    if (value.length > MAX_LOG_ARRAY_ITEMS) {
      summary.truncated = value.length - MAX_LOG_ARRAY_ITEMS;
    }
    return summary;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value);
    const limited = entries.slice(0, MAX_LOG_OBJECT_KEYS);
    const result = {};
    for (const [key, val] of limited) {
      result[key] = safeForLog(val, depth + 1);
    }
    if (entries.length > MAX_LOG_OBJECT_KEYS) {
      result.__truncatedKeys__ = entries.length - MAX_LOG_OBJECT_KEYS;
    }
    return result;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return String(value);
  }
}

function createSessionLog(question, rawShopId, normalizedShopId) {
  return {
    id: randomUUID(),
    startedAt: new Date().toISOString(),
    rawShopId: rawShopId ?? null,
    shopId: normalizedShopId ?? null,
    question,
    toolCalls: [],
    errors: [],
    openAi: {},
    finalResponse: null,
    durationMs: null,
  };
}

function recordError(session, stage, error) {
  if (!session || !error) return;
  session.errors.push({
    stage,
    message: error?.message ? String(error.message) : String(error),
    stack: error?.stack ? String(error.stack).split('\n').slice(0, 10).join('\n') : undefined,
  });
}

function writeSessionLog(session) {
  if (!session) return;
  try {
    ensureLogDir();
    const timestampFragment = session.startedAt
      ? session.startedAt.replace(/[:.]/g, '-').replace(/Z$/, '')
      : Date.now().toString();
    const fileName = `${timestampFragment}_${session.id}.json`;
    const filePath = path.join(LOG_DIR, fileName);
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to write MCP session log', error);
  }
}

const normalizeShopId = (shopId) => {
  if (!shopId) return '';
  return String(shopId).replace(/^shop_/, '').replace(/\.db$/i, '').trim();
};

function runSqlQuery(shopId, query) {
  return new Promise((resolve, reject) => {
    const dbPath = dbPathForShop(shopId);
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (openErr) => {
      if (openErr) {
        reject(openErr);
        return;
      }

      db.all(query, [], (err, rows) => {
        db.close();
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  });
}

async function processUserQuestion(question, shopId) {
  const effectiveShopId = normalizeShopId(shopId);
  const session = createSessionLog(question, shopId, effectiveShopId);
  const startedAt = Date.now();
  let responsePayload = {
    answer: 'Analytics assistant needs a valid shop before it can query data. Please finish shop setup and try again.',
    visualizations: [],
  };

  if (!effectiveShopId) {
    recordError(session, 'validation', new Error('Missing shop identifier'));
    session.durationMs = Date.now() - startedAt;
    session.finalResponse = safeForLog(responsePayload);
    writeSessionLog(session);
    return responsePayload;
  }

  if (!dbExists(effectiveShopId)) {
    const message = `Shop database not found for ${effectiveShopId}`;
    const error = new Error(message);
    recordError(session, 'validation', error);
    responsePayload = {
      answer: `Error: ${message}`,
      visualizations: [],
    };
    session.durationMs = Date.now() - startedAt;
    session.finalResponse = safeForLog(responsePayload);
    writeSessionLog(session);
    return responsePayload;
  }

  try {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: question }
    ];

    const initialCompletion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      tools: TOOLS,
      tool_choice: 'auto'
    });

    session.openAi.initialCompletion = safeForLog({
      id: initialCompletion.id,
      model: initialCompletion.model,
      usage: initialCompletion.usage ?? null,
      finishReason: initialCompletion.choices?.[0]?.finish_reason ?? null,
    });

    const assistantMessage = initialCompletion.choices[0].message;
    const visualizations = [];

    if (assistantMessage.tool_calls?.length) {
      messages.push(assistantMessage);

      for (const toolCall of assistantMessage.tool_calls) {
        const toolStart = Date.now();
        const toolRecord = {
          id: toolCall.id,
          tool: toolCall.function?.name ?? 'unknown',
          rawArguments: toolCall.function?.arguments ?? null,
          startedAt: new Date().toISOString(),
        };

        let parsedArgs;

        try {
          parsedArgs = JSON.parse(toolCall.function.arguments || '{}');
          toolRecord.arguments = safeForLog(parsedArgs);
        } catch (parseError) {
          recordError(session, `tool:${toolRecord.tool}`, parseError);
          const parseFailure = {
            error: `Failed to parse tool arguments: ${parseError.message}`,
          };
          toolRecord.result = safeForLog(parseFailure);
          toolRecord.durationMs = Date.now() - toolStart;
          session.toolCalls.push(toolRecord);
          messages.push({
            role: 'tool',
            content: JSON.stringify(parseFailure),
            tool_call_id: toolCall.id,
          });
          continue;
        }

        try {
          const result = await executeTool(toolRecord.tool, parsedArgs, effectiveShopId);
          toolRecord.result = safeForLog(result);

          if (result && typeof result === 'object' && result.type) {
            visualizations.push(result);
          }

          messages.push({
            role: 'tool',
            content: JSON.stringify(result),
            tool_call_id: toolCall.id,
          });
        } catch (toolError) {
          recordError(session, `tool:${toolRecord.tool}`, toolError);
          const failure = { error: `Failed to execute tool: ${toolError.message}` };
          toolRecord.result = safeForLog(failure);
          messages.push({
            role: 'tool',
            content: JSON.stringify(failure),
            tool_call_id: toolCall.id,
          });
        } finally {
          toolRecord.durationMs = Date.now() - toolStart;
          session.toolCalls.push(toolRecord);
        }
      }

      const finalCompletion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages,
      });

      session.openAi.finalCompletion = safeForLog({
        id: finalCompletion.id,
        model: finalCompletion.model,
        usage: finalCompletion.usage ?? null,
        finishReason: finalCompletion.choices?.[0]?.finish_reason ?? null,
      });

      const answer = finalCompletion.choices[0].message.content || 'No response generated';
      responsePayload = {
        answer,
        visualizations,
      };
    } else {
      responsePayload = {
        answer: assistantMessage.content || 'No response generated',
        visualizations: [],
      };
    }
  } catch (error) {
    console.error('Error processing question:', error);
    recordError(session, 'processing', error);
    responsePayload = {
      answer: `Error: ${error.message}`,
      visualizations: [],
    };
  } finally {
    session.durationMs = Date.now() - startedAt;
    session.finalResponse = safeForLog(responsePayload);
    writeSessionLog(session);
  }

  return responsePayload;
}

async function executeTool(name, args, shopId) {
  const effectiveShopId = normalizeShopId(shopId);

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

  if (!effectiveShopId) {
    return { error: 'Missing shop identifier for analytics query' };
  }

  const sqlTools = new Set([
    'query_inventory',
    'query_sales',
    'query_customers',
    'query_general',
  ]);

  if (sqlTools.has(name)) {
    if (!args || typeof args.query !== 'string' || !args.query.trim()) {
      return { error: 'SQL query is required for this tool' };
    }

    try {
      const rows = await runSqlQuery(effectiveShopId, args.query);
      return rows;
    } catch (error) {
      return { error: error.message };
    }
  }

  return { error: `Unknown tool: ${name}` };
}

export { processUserQuestion };