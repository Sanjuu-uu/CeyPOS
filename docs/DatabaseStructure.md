# CeyPOS Database Structure and MCP API

Each shop gets its own SQLite database file. The server initializes and migrates the schema in `server/src/utils/shop-database.js`, and MCP tools query the selected shop database in read-only mode.

## Core Tables

### shop_meta

- `shop_id TEXT PRIMARY KEY`
- `shop_name`, `owner_name`, `owner_email`, `phone`, `shop_type`, address fields
- `currency`, `timezone`, plan/team/AI settings
- `created_at`

### inventory

- `item_id INTEGER PRIMARY KEY AUTOINCREMENT`
- `inventory_code TEXT UNIQUE`
- `barcode_id TEXT UNIQUE`
- `name TEXT NOT NULL`
- `category TEXT`
- `sku TEXT UNIQUE`
- `price DECIMAL(10,2)`
- `cost_price DECIMAL(10,2) DEFAULT 0`
- `stock INTEGER DEFAULT 0`
- `stock_last_month INTEGER DEFAULT 0`
- `restock_suggestion INTEGER DEFAULT 0`
- `reorder_threshold INTEGER DEFAULT 0`
- `unit_name TEXT DEFAULT 'unit'`
- `pack_size DECIMAL(10,3) DEFAULT 1`
- `preferred_supplier_id INTEGER`
- `image_url TEXT`
- `created_at`, `updated_at`

### Inventory Lifecycle

- `inventory_suppliers`: supplier records with contact, address, notes and status.
- `inventory_purchase_orders`: PO header records.
- `inventory_purchase_order_items`: ordered and received quantities by product.
- `inventory_goods_received`: goods received note headers.
- `inventory_goods_received_items`: received quantities and unit costs.
- `inventory_purchase_returns`: supplier return headers.
- `inventory_purchase_return_items`: returned quantities and unit costs.
- `inventory_stock_counts`: stock-count session headers.
- `inventory_stock_count_items`: expected, counted and variance rows.
- `inventory_adjustment_reasons`: active adjustment reason catalog.
- `inventory_movements`: audit ledger for sales, goods received, returns, stock counts, damaged, expired, missing, promotional and manual adjustments.
- `inventory_product_variants`: optional product variants with barcode, SKU, price, cost and attributes.

### Sales and Customers

- `customers`: customer identity, contact, spend, visit count and loyalty points.
- `transactions`: receipt/payment totals and cashier attribution fields.
- `transaction_items`: sold product rows linked by `inventory_code`.
- `daily_sales`: daily sales rollups.
- `business_rules_*`: loyalty, discounts, taxes and surcharges.

### Operations

- `mobile_sessions`, `mobile_scan_events`: QR/mobile barcode and checkout sessions.
- `shop_members`, `shop_terminals`, pairing and shift tables: team/register workflows.
- `notifications`, `notification_preferences`: in-app and email notification state.
- `analytics_conversations`, `analytics_messages`: AI chat history.
- `receipt_tokens`: public digital receipt snapshots and delivery state.

## MCP Tools

- `query_inventory`: read product catalog, stock, costing, valuation, reorder, unit, barcode and supplier preference fields.
- `query_inventory_operations`: read suppliers, purchase orders, goods received, returns, stock counts, adjustment reasons, variants and movement ledger data.
- `query_sales`: read transactions, transaction items and daily sales.
- `query_customers`: read customer records.
- `query_general`: read-only SQL across the selected shop database.
- `get_schema`: return the live SQLite schema.
- `get_sample_data`: return sample rows from a selected table.

## Valuation Rules

- Stock valuation at cost: `SUM(cost_price * stock)`.
- Retail stock value: `SUM(price * stock)`.
- Potential gross profit: `SUM((price - cost_price) * stock)`.
- Reorder checks should prefer `reorder_threshold`; `restock_suggestion` is a suggested quantity, not a boolean.

## Security

- MCP SQL is read-only: `SELECT`, `WITH`, and safe `PRAGMA` queries only.
- Shop IDs are normalized and resolved to the selected shop database.
- AI-generated SQL must not mutate data or read outside the selected shop database.
