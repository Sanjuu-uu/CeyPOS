# AI Architecture (Gemini)

## Current Production Flow

1. Users chat in `src/components/modules/analytics/ChatSidebar.tsx`.
2. The UI sends requests to:
   - `POST /api/analytics/chat`
   - `POST /api/analytics/chat/stream`
3. `server/main-server.js` validates payloads, builds attachment context, and forwards the request to `processUserQuestion` in `mcp-server/mcp.js`.
4. `mcp-server/mcp.js` runs Gemini (`@google/generative-ai`) with function tools for:
   - SQL analytics reads
   - KPI cards
   - Remote chart generation
5. The UI renders text + visualization payloads and persists conversation history per user and shop.

## Provider and Model

- Provider: `Google Gemini`
- Primary key envs:
  - `GEMINI_API_KEY`
  - `MCP_GEMINI_API_KEY`
- Model env:
  - `GEMINI_MODEL` (current default: `gemini-2.5-flash`)

## Data and Security Controls

- Shop data is read from per-shop SQLite files.
- SQL tools are read-only guarded and reject mutating statements.
- Chat history is saved in browser storage namespaced by shop and user.
- Active conversation id is persisted separately for reliable restore.

## Visualization Pipeline

- Chart tools call the remote visualization service via:
  - `VIS_REQUEST_SERVER`
  - `VIS_SERVICE_ID`
  - `VIS_SERVICE_PATH`
- If visualization envs are missing, text responses still work and UI shows setup state.

## Operations Notes

- Session logs are written under `mcp-server/logs/`.
- For Railway, use root `start:railway` script and keep `.env` values synced with Railway variables.
