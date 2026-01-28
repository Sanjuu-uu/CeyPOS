import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import sqlite3 from 'sqlite3';
import dotenv from 'dotenv';
import {
  shopDatabaseExists,
  getShopDatabasePath,
  sanitizeShopIdentifier,
} from './shop-database-paths.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, '../.env'),
];

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

const DEFAULT_GEMINI_MODEL = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
const GEMINI_API_KEY_ENV_PRIORITY = [
  'MCP_GEMINI_API_KEY',
  'GEMINI_API_KEY',
  'GOOGLE_GENERATIVE_AI_API_KEY',
  'GOOGLE_API_KEY',
];

const VIS_REQUEST_SERVER_RAW = (process.env.VIS_REQUEST_SERVER ?? '').trim();
const VIS_REQUEST_SERVER = VIS_REQUEST_SERVER_RAW.endsWith('/')
  ? VIS_REQUEST_SERVER_RAW.slice(0, -1)
  : VIS_REQUEST_SERVER_RAW;
const VIS_SERVICE_ID = (process.env.VIS_SERVICE_ID ?? '').trim();
const VIS_SERVICE_PATH = (process.env.VIS_SERVICE_PATH ?? '/v1/services/{serviceId}/invoke').trim();
const VIS_REQUEST_TIMEOUT_MS = (() => {
  const rawTimeout = process.env.VIS_REQUEST_TIMEOUT_MS ?? process.env.VIS_TIMEOUT_MS ?? '';
  const parsed = Number.parseInt(rawTimeout, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.min(parsed, 30000);
  }
  return 10000;
})();
const VIS_INCLUDE_RAW_RESPONSE = String(process.env.VIS_INCLUDE_RAW_RESPONSE ?? '').toLowerCase() === 'true';

const MAX_TOOL_ITERATIONS = (() => {
  const rawValue = Number.parseInt(process.env.MCP_GEMINI_MAX_TOOL_ITERATIONS ?? '', 10);
  if (Number.isFinite(rawValue)) {
    return Math.min(Math.max(rawValue, 1), 12);
  }
  return 6;
})();

let geminiClient;

function resolveGeminiApiKey() {
  for (const envVar of GEMINI_API_KEY_ENV_PRIORITY) {
    const value = process.env[envVar];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function getGeminiClient() {
  if (!geminiClient) {
    const apiKey = resolveGeminiApiKey();
    if (!apiKey) {
      throw new Error(`Missing Gemini API key. Set one of: ${GEMINI_API_KEY_ENV_PRIORITY.join(', ')}`);
    }
    geminiClient = new GoogleGenerativeAI(apiKey);
  }
  return geminiClient;
}

function buildGeminiModel(options = {}) {
  const { model = DEFAULT_GEMINI_MODEL, tools = GEMINI_TOOLS } = options;
  return getGeminiClient().getGenerativeModel({
    model,
    tools,
    systemInstruction: SYSTEM_PROMPT,
  });
}

const SYSTEM_PROMPT = `You are an AI assistant for CeyPoS, a point-of-sale system. You help users analyze their shop data.

The complete shop schema you can query contains these tables:
- shop_meta: shop_id, shop_name, owner_name, owner_email, phone, shop_type, address, city, state, zip_code, country, business_license, tax_id, registration_number, currency, timezone, created_at
- shop_operating_hours: shop_id, day, open, close, closed
- shop_payment_methods: shop_id, method
- inventory: item_id, inventory_code, barcode_id, name, category, sku, price, stock, stock_last_month, restock_suggestion, image_url, created_at, updated_at
- customers: customer_id, name, email, phone, total_spent, visit_count, last_visit, points_balance, created_at
- transactions: transaction_id, receipt_id, transaction_code, customer_id, subtotal, discount, tax, total, payment_method, created_at
- transaction_items: id, transaction_id, item_id, inventory_code, quantity, unit_price, subtotal
- daily_sales: id, shop_id, date, total_sales, transactions_count, top_item
- inventory_forecast: item_id, item_name, avg_daily_sales, recommended_stock, suggested_restock_date
- business_rules_loyalty: shop_id, enabled, earn_rate, redeem_rate, min_points
- business_rules_discounts: id, shop_id, name, type, value
- business_rules_taxes: id, shop_id, name, rate, is_default
- business_rules_surcharges: id, shop_id, min_amount, type, value

When a user asks what data you can access, first call the get_schema tool to refresh the live schema and base your answer on the returned table definitions so nothing is omitted.

For any analytical question, use the SQL tools to fetch real data before answering. Never fabricate results.

For data visualization requests, prefer the chart generation tools to create interactive previews. You can generate:
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
            description: 'SQL query to execute on inventory table',
          },
        },
        required: ['query'],
      },
    },
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
            description: 'SQL query to execute on sales tables',
          },
        },
        required: ['query'],
      },
    },
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
            description: 'SQL query to execute on customers table',
          },
        },
        required: ['query'],
      },
    },
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
            description: 'SQL query to execute',
          },
        },
        required: ['query'],
      },
    },
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
            description: 'The title of the KPI card',
          },
          value: {
            type: 'string',
            description: 'The main value to display',
          },
          subtitle: {
            type: 'string',
            description: 'Optional subtitle or additional context',
          },
        },
        required: ['title', 'value'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_bar_chart',
      description: 'Generate a bar chart by requesting the external AntV visualization service',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Chart title',
          },
          data: {
            type: 'array',
            description: 'Array of data points with name and value',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                value: { type: 'number' },
              },
            },
          },
          xAxisKey: {
            type: 'string',
            description: 'Key for x-axis (usually "name")',
            default: 'name',
          },
          yAxisKey: {
            type: 'string',
            description: 'Key for y-axis (usually "value")',
            default: 'value',
          },
        },
        required: ['title', 'data'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_line_chart',
      description: 'Generate a line chart by requesting the external AntV visualization service',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Chart title',
          },
          data: {
            type: 'array',
            description: 'Array of data points with time and value',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                value: { type: 'number' },
              },
            },
          },
        },
        required: ['title', 'data'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_pie_chart',
      description: 'Generate a pie chart by requesting the external AntV visualization service',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Chart title',
          },
          data: {
            type: 'array',
            description: 'Array of data points with name and value',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                value: { type: 'number' },
              },
            },
          },
        },
        required: ['title', 'data'],
      },
    },
  },
];

const GEMINI_TOOLS = [
  {
    functionDeclarations: TOOLS.map((tool) => {
      const fn = tool.function;
      return {
        name: fn.name,
        description: fn.description,
        parameters: fn.parameters,
      };
    }),
  },
];

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

const CHART_TOOL_TYPE_MAP = {
  generate_bar_chart: 'bar',
  generate_line_chart: 'line',
  generate_pie_chart: 'pie',
};

const SQL_TOOL_NAMES = new Set([
  'query_inventory',
  'query_sales',
  'query_customers',
  'query_general',
]);

function hasVisualizationConfiguration() {
  if (!VIS_REQUEST_SERVER) {
    return false;
  }
  if (VIS_SERVICE_PATH.includes('{serviceId}')) {
    return Boolean(VIS_SERVICE_ID);
  }
  return true;
}

function buildVisualizationEndpoint() {
  if (!VIS_REQUEST_SERVER) {
    return null;
  }

  let pathTemplate = VIS_SERVICE_PATH || '/v1/services/{serviceId}/invoke';
  if (pathTemplate.includes('{serviceId}')) {
    if (!VIS_SERVICE_ID) {
      return null;
    }
    pathTemplate = pathTemplate.replace('{serviceId}', encodeURIComponent(VIS_SERVICE_ID));
  }

  if (pathTemplate && !pathTemplate.startsWith('/')) {
    pathTemplate = `/${pathTemplate}`;
  }

  return `${VIS_REQUEST_SERVER}${pathTemplate}`;
}

function sanitizeChartData(data) {
  if (!Array.isArray(data)) {
    return [];
  }
  return data
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({ ...item }));
}

function extractVisualizationAsset(responseData) {
  if (!responseData) {
    return {
      assetUrl: null,
      requestId: null,
      expiresAt: null,
    };
  }

  if (typeof responseData === 'string') {
    return {
      assetUrl: responseData,
      requestId: null,
      expiresAt: null,
    };
  }

  const assetUrl =
    responseData.assetUrl ??
    responseData.url ??
    responseData.imageUrl ??
    responseData.chartUrl ??
    responseData.result?.assetUrl ??
    responseData.result?.url ??
    responseData.result?.imageUrl ??
    null;

  const requestId = responseData.requestId ?? responseData.result?.requestId ?? null;
  const expiresAt = responseData.expiresAt ?? responseData.result?.expiresAt ?? null;

  return {
    assetUrl,
    requestId,
    expiresAt,
  };
}

function buildVisualizationPayload(toolName, args, chartType, title) {
  return {
    serviceId: VIS_SERVICE_ID || undefined,
    chartType,
    title,
    data: sanitizeChartData(args?.data),
    encoding: {
      x: args?.xAxisKey ?? 'name',
      y: args?.yAxisKey ?? 'value',
    },
    meta: {
      source: 'ceypos-mcp',
      toolName,
      generatedAt: new Date().toISOString(),
    },
    options: {
      subtitle: args?.subtitle ?? null,
      description: args?.description ?? null,
    },
  };
}

async function requestVisualizationFromAntv(toolName, args = {}) {
  const chartType = CHART_TOOL_TYPE_MAP[toolName] ?? (toolName.replace(/^generate_/, '') || 'chart');
  const title = typeof args?.title === 'string' && args.title.trim() ? args.title.trim() : 'Untitled chart';

  if (!hasVisualizationConfiguration()) {
    return {
      type: 'visualization_error',
      provider: 'antv',
      chartType,
      title,
      status: 'not_configured',
      message: 'Visualization service not configured. Set VIS_REQUEST_SERVER and VIS_SERVICE_ID environment variables.',
      modelSummary: `Unable to generate a ${chartType} chart titled "${title}" because the AntV visualization service is not configured.`,
    };
  }

  const endpoint = buildVisualizationEndpoint();
  if (!endpoint) {
    return {
      type: 'visualization_error',
      provider: 'antv',
      chartType,
      title,
      status: 'not_configured',
      message: 'Visualization service endpoint could not be resolved. Check VIS_SERVICE_PATH configuration.',
      modelSummary: `Unable to generate a ${chartType} chart titled "${title}" because the visualization endpoint could not be resolved.`,
    };
  }

  const payload = buildVisualizationPayload(toolName, args, chartType, title);

  try {
    const { data: responseData } = await axios.post(endpoint, payload, {
      timeout: VIS_REQUEST_TIMEOUT_MS,
      headers: { 'Content-Type': 'application/json' },
    });

    const { assetUrl, requestId, expiresAt } = extractVisualizationAsset(responseData);
    const result = {
      type: 'remote_chart',
      provider: 'antv',
      chartType,
      title,
      status: assetUrl ? 'ready' : 'requested',
      assetUrl: assetUrl ?? null,
      requestId: requestId ?? null,
      expiresAt: expiresAt ?? null,
    };

    if (VIS_INCLUDE_RAW_RESPONSE) {
      result.debug = safeForLog(responseData);
    }

    result.modelSummary = assetUrl
      ? `AntV visualization service generated a ${chartType} chart titled "${title}".`
      : `AntV visualization service accepted the ${chartType} chart request titled "${title}"; awaiting the hosted asset.`;

    return result;
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      'Visualization service error';

    const result = {
      type: 'visualization_error',
      provider: 'antv',
      chartType,
      title,
      status: 'failed',
      message,
    };

    if (VIS_INCLUDE_RAW_RESPONSE) {
      result.debug = safeForLog(error?.response?.data ?? null);
    }

    result.modelSummary = `AntV visualization service failed to generate a ${chartType} chart titled "${title}": ${message}.`;

    return result;
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
    model: {
      provider: null,
      name: null,
      interactions: [],
    },
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
  const core = String(shopId).replace(/^shop_/, '').replace(/\.db$/i, '').trim();
  return sanitizeShopIdentifier(core);
};

function runSqlQuery(shopId, query) {
  return new Promise((resolve, reject) => {
    const normalizedShopId = normalizeShopId(shopId);
    if (!normalizedShopId || !shopDatabaseExists(normalizedShopId)) {
      reject(new Error(`Shop database not found for ${shopId}`));
      return;
    }

    const dbPath = getShopDatabasePath(normalizedShopId);
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

function formatToolResultForModelPayload(result) {
  if (Array.isArray(result)) {
    return { rows: result };
  }

  if (result && typeof result === 'object') {
    if (typeof result.modelSummary === 'string') {
      const { modelSummary, ...data } = result;
      const payload = { summary: modelSummary };
      if (Object.keys(data).length > 0) {
        payload.data = data;
      }
      return payload;
    }
    return result;
  }

  return { result: result ?? null };
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

  if (!shopDatabaseExists(effectiveShopId)) {
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
    const model = buildGeminiModel();
    const contents = [
      {
        role: 'user',
        parts: [{ text: question }],
      },
    ];

    const visualizations = [];
    let answerText = '';

    session.model.provider = 'google-generative-ai';
    session.model.name = session.model.name ?? DEFAULT_GEMINI_MODEL;

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration += 1) {
      let generation;

      try {
        generation = await model.generateContent({ contents });
      } catch (generationError) {
        recordError(session, 'generation', generationError);
        throw generationError;
      }

      const { response } = generation;
      if (response?.model) {
        session.model.name = response.model;
      }

      const candidate = response?.candidates?.[0];
      const stageLabel = iteration === 0 ? 'initial' : `loop_${iteration}`;

      session.model.interactions.push({
        stage: stageLabel,
        timestamp: new Date().toISOString(),
        data: safeForLog({
          finishReason: candidate?.finishReason ?? null,
          safetyRatings: candidate?.safetyRatings ?? null,
          usage: response?.usageMetadata ?? null,
        }),
      });

      if (!candidate?.content?.parts?.length) {
        answerText = 'No response generated';
        break;
      }

      const candidateParts = candidate.content.parts;
      const functionCalls = candidateParts
        .map((part) => part.functionCall)
        .filter(Boolean);

      if (functionCalls.length === 0) {
        const text = candidateParts
          .map((part) => (typeof part.text === 'string' ? part.text : ''))
          .join('')
          .trim();
        answerText = text || 'No response generated';
        contents.push(candidate.content);
        break;
      }

      contents.push(candidate.content);

      for (let index = 0; index < functionCalls.length; index += 1) {
        const call = functionCalls[index];
        const toolStart = Date.now();
        const toolName = call.name ?? 'unknown';
        const toolCallId = call.id || `${toolName || 'tool'}-${iteration}-${index}`;

        const toolRecord = {
          id: toolCallId,
          tool: toolName,
          rawArguments: call.args ?? null,
          startedAt: new Date().toISOString(),
        };

        const rawArgs = call?.args ?? call?.arguments ?? {};
        let parsedArgs = {};

        try {
          if (typeof rawArgs === 'string') {
            parsedArgs = rawArgs ? JSON.parse(rawArgs) : {};
          } else if (rawArgs && typeof rawArgs === 'object') {
            parsedArgs = rawArgs;
          }
        } catch (parseError) {
          recordError(session, `tool:${toolName}`, parseError);
          const failure = { error: `Failed to parse tool arguments: ${parseError.message}` };
          toolRecord.arguments = safeForLog(rawArgs);
          toolRecord.result = safeForLog(failure);
          toolRecord.durationMs = Date.now() - toolStart;
          session.toolCalls.push(toolRecord);
          contents.push({
            role: 'function',
            parts: [
              {
                functionResponse: {
                  name: toolName,
                  response: failure,
                },
              },
            ],
          });
          continue;
        }

        toolRecord.arguments = safeForLog(parsedArgs);

        try {
          const result = await executeTool(toolName, parsedArgs, effectiveShopId);
          toolRecord.result = safeForLog(result);

          if (result && typeof result === 'object' && result.type) {
            const { modelSummary, ...visualPayload } = result;
            visualizations.push(modelSummary ? visualPayload : result);
          }

          contents.push({
            role: 'function',
            parts: [
              {
                functionResponse: {
                  name: toolName,
                  response: formatToolResultForModelPayload(result),
                },
              },
            ],
          });
        } catch (toolError) {
          recordError(session, `tool:${toolName}`, toolError);
          const failure = { error: `Failed to execute tool: ${toolError.message}` };
          toolRecord.result = safeForLog(failure);
          contents.push({
            role: 'function',
            parts: [
              {
                functionResponse: {
                  name: toolName,
                  response: failure,
                },
              },
            ],
          });
        } finally {
          toolRecord.durationMs = Date.now() - toolStart;
          session.toolCalls.push(toolRecord);
        }
      }
    }

    if (!answerText) {
      answerText = 'Tool iterations exhausted without final response.';
      recordError(
        session,
        'generation',
        new Error('Reached maximum tool iterations without obtaining final response'),
      );
    }

    responsePayload = {
      answer: answerText,
      visualizations,
    };
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
    const title = typeof args?.title === 'string' ? args.title : 'KPI';
    const value = typeof args?.value === 'string' ? args.value : String(args?.value ?? '');
    const subtitle = typeof args?.subtitle === 'string' && args.subtitle.trim() ? args.subtitle : null;
    return {
      type: 'kpi_card',
      title,
      value,
      subtitle,
      modelSummary: `Prepared KPI card titled "${title}" with value ${value}.`,
    };
  }

  if (CHART_TOOL_TYPE_MAP[name]) {
    return requestVisualizationFromAntv(name, args);
  }

  if (!effectiveShopId) {
    return { error: 'Missing shop identifier for analytics query' };
  }

  if (SQL_TOOL_NAMES.has(name)) {
    if (!args || typeof args.query !== 'string' || !args.query.trim()) {
      return { error: 'SQL query is required for this tool' };
    }

    if (!shopDatabaseExists(effectiveShopId)) {
      return { error: `Shop database not found for ${effectiveShopId}` };
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

export {
  processUserQuestion,
  buildGeminiModel,
  GEMINI_TOOLS,
  MAX_TOOL_ITERATIONS,
  DEFAULT_GEMINI_MODEL,
};