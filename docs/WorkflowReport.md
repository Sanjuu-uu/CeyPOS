CeyPOS App State Flow, Barcode Integration & Lifecycle Report
🔐 1. User Authentication & Entry State
➕ New User Registration
- Frontend: User signs up via email or so
- Backend:
- Creates a user record
- Triggers createShopDatabase() if shop is registered during onboarding
- Result:
- Redirect to Shop Creation Wizard
- LocalStorage/session stores user token

🏪 2. Shop Creation State
🧭 Flow:
- User completes Shop Creation Wizard
- Backend:
- Creates a row in shop_meta
- Generates new DB: /data/shops/shop_{shop_id}.sqlite
- Initializes all tables (inventory, transactions, customers, etc.)

🧠 System Changes:
- DB created and namespaced
- Shop settings stored
- App now routes user to /dashboard

📦 3. Inventory Upload State
🔁 Trigger: Upload Excel Template
- Frontend:
- Displays validation, preview grid, edit-in-place
- Backend:
- Parses with SheetJS
- Validates required fields: SKU, name, stock, price, etc.
- Inserts into inventory table

💾 DB Updates:
- New or updated rows in inventory
- Duplicates rejected

🔄 Side Effects:
- Inventory list UI updated live
- Triggers AI job to estimate restock_suggestion

📱 3B. Inventory Sync via Mobile Barcode Scanner
Trigger: Mobile ceypos.com/mobile in "Inventory Mode"
- Mobile: Camera scans product barcode
- Backend:
- Checks if barcode_id exists in inventory
- If not found, prompts user to enter product name, price, stock, etc.
- A Unique Barcode is Created and Sends data to: POST /api/inventory/add

DB Write: Inserts product into the shop’s inventory table
Web POS UI: Inventory table updates live via socket or refresh

🛒 4. POS Checkout State
Trigger: Sell Items via POS Screen or Mobile Scanner
- Frontend: POS screen shows cart, discount, customer input
- Mobile (Add-to-Cart Mode):
- User scans product barcode → app queries backend
- Backend looks up inventory via barcode_id
- If found, app sends: POST /api/cart/add

Backend:
- Creates transactions row with receipt_id
- Inserts into transaction_items
- Decrements inventory.stock
- Updates customers.total_spent & visit_count

📄 DB Tables Modified:
- transactions
- transaction_items
- inventory
- customers

🔁 Triggers:
- Realtime receipt display
- Email/WhatsApp invoice (if enabled)
- AI triggers to update customer & sales analytics

🤖 5. AI Analytics State
Trigger: Owner asks question (MCP API)
- Backend:
- Loads shop_{shop_id}.sqlite
- Extracts schema + sample data
- Sends to AI (e.g., Gemini, GPT-4)

AI Output:
- Natural Response
- Insight
- Optional chart config

Changes:
- No DB write (read-only unless command specifies)
- Optional caching to analytics_cache
📈 6. Analytics & Reporting Dashboard
Trigger: Navigate to /analytics
- Loads:
- Revenue trends from daily_sales
- Top products from transaction_items
- Premium customers from customers

Frontend: Uses chart structure: { x: [], y: [], label }
Backend: Can pre-cache with cron jobs or pull real-time
🔄 7. Scheduled Updates & CRON
Nightly Tasks:
- Summarize daily sales into daily_sales
- Update inventory_forecast
- Clean expired/old sessions or receipts
📋 8. Admin/Settings State
Trigger: Open /settings
- Edit shop name, logo, invoice preferences
- Toggle WhatsApp/email receipt sending

Effects:
- Updates shop_meta table
- Alters invoice behavior in POS flow
🧩 9. Developer Note: State Sync Mechanism
State Layers:
1. Frontend State (React): via Context API or Redux
2. SQLite DB (per shop): written in real-time
3. AI Context: generated per prompt by Model Context Protocol server
4. WebSocket Sessions: used for mobile-to-web sync (cart/inventory)
📱 10. Mobile Sessions State
🔁 Trigger: Start Session from Desktop /sessions module
- Desktop:
- User selects session type (Cashier/Barcode/Checkout)
- Generates QR code with session data + 5min expiration
- Creates WebSocket connection endpoint
- Mobile:
- Navigate to ceypos.com/mobilesessions
- Auto-opens camera for QR scanning
- Validates session and connects via WebSocket

🧠 Session Types:
1. **Cashier Device**: Full POS interface on mobile
2. **Barcode Sync**: Mobile inventory scanning + real-time sync
3. **Checkout Session**: Mobile cart + payment processing

📱 Mobile Barcode Workflow:
- Camera opens automatically after QR auth
- Scan product barcode → backend lookup
- If found: Show edit form + sync to desktop
- If not found: Show "Add Product" form
- Real-time inventory sync via WebSocket

💾 DB Operations:
- Desktop: localStorage session management
- Mobile: API calls for inventory/cart operations
- Sync: WebSocket bidirectional data flow

🔄 Side Effects:
- Real-time desktop inventory updates
- Mobile cart sync with desktop POS
- Session cleanup after 30min inactivity
✅ Summary: System Reactions by Trigger
| Trigger                  | UI Update | DB Write                                   | AI Trigger | Chart Update |
|--------------------------|-----------|--------------------------------------------|------------|---------------|
| Register                 | ✅        | ✅ (users)                                  | ❌         | ❌            |
| Create Shop              | ✅        | ✅ (shop_meta, schema init)                 | ❌         | ❌            |
| Upload Inventory (Excel) | ✅        | ✅ (inventory)                              | ✅         | ❌            |
| Mobile Inventory Scan    | ✅        | ✅ (inventory)                              | ❌         | ❌            |
| POS Checkout             | ✅        | ✅ (transactions, items, inventory)         | ✅         | ✅            |
| Mobile Add to Cart       | ✅        | ❌ (until checkout)                         | ❌         | ✅ (cart view) |
| Start Mobile Session     | ✅        | ✅ (session storage)                        | ❌         | ❌            |
| Mobile Barcode Scan      | ✅        | ✅ (inventory sync)                         | ❌         | ✅ (inventory) |
| Mobile Checkout          | ✅        | ✅ (transactions via sync)                  | ✅         | ✅            |
| Ask AI                   | ✅        | ❌                                          | ✅         | ✅ (optional) |
| View Analytics           | ✅        | ❌ or pre-cached                            | ❌         | ✅            |
| Cron Task                | ❌        | ✅ (daily_sales, inventory_forecast)        | ✅         | ✅            |

Updated: May 2025 — Author: Ceynode
