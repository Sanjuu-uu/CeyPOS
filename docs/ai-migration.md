# AI Migration Plan

## Current OpenAI-Powered Analytics Assistant

### High-level Flow
1. Users interact with the analytics chat UI in `src/components/modules/analytics/ChatSidebar.tsx`. The sidebar normalises the active shop ID, posts `{ question, shopId, shopLabel }` to `/api/analytics/chat`, and renders both textual answers and visualization payloads.
2. The Express handler in `server/main-server.js` receives the POST, validates inputs, and forwards the request to `processUserQuestion` in `mcp-server/mcp.js`.
3. `processUserQuestion` (Node ESM) initialises an OpenAI client with `OPENAI_API_KEY`, builds a system prompt describing the available datasets and visualisation affordances, and calls `openai.chat.completions.create` with `model: "gpt-4"` plus a function/tool schema.
4. Tool calls returned by GPT-4 are executed locally via `executeTool`. SQL-oriented tools open the correct SQLite file (resolved with `dbPathForShop`) in read-only mode, while visualization tools (`generate_kpi_card`, `generate_bar_chart`, etc.) simply return structured preview descriptors.
5. A final OpenAI completion incorporates tool responses into a natural-language answer. Both message text and visualization array are sent back to the browser for rendering in `ChatVisualization.tsx`.

### Supporting Components
- **Tool Surface:** `mcp-server/index.ts` exposes an MCP endpoint with the same tool schema for future agent integrations. All tools call `queryDatabase`, `getSchema`, or `getSampleData` from `mcp-server/database.ts`.
- **Data Access:** SQLite handles live data per shop. `runSqlQuery` opens connections in `OPEN_READONLY` mode to prevent unintended writes. Shop IDs are normalised so both UI and MCP layers share naming conventions.
- **Logging & Observability:** Every chat session writes a JSON log (`mcp-server/logs/<timestamp>_<sessionId>.json`) capturing tool calls, model usage, errors, and final payloads. Argument/result snapshots are truncated for safety.
- **Dependencies & Configuration:** The project installs `openai@^5.23.x` in both `package.json` files (root and `mcp-server/`). Secrets rely on `OPENAI_API_KEY`; dotenv loads `.env`. Requests currently target the chat completions API (legacy) rather than the newer Assistants or Responses endpoints.

### Known Constraints
- Tool execution assumes GPT-4 style function-calling (`tool_calls`). Gemini uses a different schema (`functionCalls`), so translation is required.
- Chart payloads are lightweight and expect `{ name, value }` series; future models must preserve this contract.
- The MCP runtime is aligned with OpenAI semantics; external agents using Gemini would need an adapter.

## Gemini Migration Tasks

### 1. Platform & Credential Readiness
- Select the Gemini API surface (Vertex AI, Google AI Studio REST, or `@google/generative-ai` SDK) and provision access keys/service accounts.
- Extend the deployment playbooks to distribute new credentials using `GEMINI_API_KEY`, and decide whether OpenAI keys remain for rollback.
- Update security documentation covering key rotation, regional endpoints, and billing alerts.
- Capture AntV chart service settings (`VIS_REQUEST_SERVER`, `VIS_SERVICE_ID`) alongside Gemini credentials so all services share the same configuration source.

### 2. SDK and Dependency Updates
- Remove or pin the `openai` dependency in both package manifests; add the chosen Gemini client libraries to root and `mcp-server` projects.
- Refactor shared request helpers so server and MCP layers reuse the same Gemini client instantiation (consider a lightweight wrapper that injects auth, model ID, and retry policy).
- Verify bundler/transpiler compatibility (ESM/CJS) for the Gemini SDK in the current Node runtime.
- Document and validate chart-service specific environment variables (endpoint, service ID) for local development and CI deployments.

### 3. Request/Response Translation
- Rewrite `processUserQuestion` to call the Gemini chat endpoint. Map `messages` into Gemini’s `contents` format and replicate the system prompt behaviour.
- Reimplement tool/function declarations using Gemini’s function-calling schema. Ensure arguments are serialized/deserialized identically to the existing OpenAI workflow.
- Adjust response parsing: replace references to `choices[0].message` and `tool_calls` with the Gemini equivalents (`functionCalls`, `candidates`). Preserve logging output shape as much as possible for continuity.

### 4. Visualization & SQL Tool Compatibility
- Confirm Gemini respects the existing SQL tool contract (single string arg). If Gemini demands explicit JSON schemas, auto-generate those from the existing `TOOLS` array.
- Harden `executeTool` against malformed Gemini outputs (e.g., missing arguments, partial results) and surface actionable errors to the chat UI.
- Implement unit tests or scripted prompts that exercise every tool type (SQL read, KPI card, bar/line/pie charts) to confirm parity.

### 5. Prompt & System Behaviour Review
- Evaluate whether the current system prompt needs adjustments for Gemini (model may require stricter instructions on tool usage and data privacy).
- Capture fallback messaging if Gemini rejects requests due to content filters or quota; expose actionable guidance to operators.
- Document any differences in token limits, latency, or streaming support that affect UI expectations.

### 6. Observability & Rollout
- Update session logging to include Gemini-specific metadata (model name, latency fields). Store provider identifiers so historical analysis distinguishes OpenAI vs Gemini runs.
- Extend health checks or `/api/analytics/chat` smoke tests to validate connectivity with the new provider.
- Plan a phased rollout: feature flag the Gemini path, gather acceptance feedback, and keep the OpenAI implementation ready for emergency fallback until confidence is established.

### 7. Compliance & Cost Controls
- Review data handling requirements (PII in prompts) against Google’s terms; adjust redaction pipelines if needed.
- Configure usage quotas, monitoring, and alerting within Google Cloud to prevent cost overruns during load tests and production usage.
- Update internal training and runbooks so support staff can triage Gemini-specific errors.
