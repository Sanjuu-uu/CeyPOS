
# CeyPoS Database Design & Workflow

## Workflow Overview
1. **User Login & Shop Creation**: When a user logs in (e.g., via Gmail), a unique `shopID` is generated. A new SQLite `.db` file is created for this shop in the `C:/Users/Sanjula/OneDrive/Desktop/CeyPoS/database` folder, named after the `shopID` (e.g., `shop_1234.db`).
2. **Shop Wizard Completion**: After the user completes the shop wizard, all initial shop and user data is saved to the `.db` file.
3. **Inventory Import**: The user uploads an inventory Excel file, which is parsed (e.g., using [sqlitebiter](https://github.com/thombashi/sqlitebiter)) and stored in the `inventory` table. This table is updated in real time as inventory changes occur.
4. **Real-Time Updates**: All shop-related data (users, products, sales, etc.) is updated in the `.db` file in real time as changes happen in the app.


Database Tables (per shop):

shop_meta: Shop info (name, owner, location, created_at)
inventory: Products (item_id, name, category, barcode, sku, price, stock, restock_suggestion, etc.)
customers: Customer details (customer_id, name, email, phone, total_spent, visit_count, last_visit)
transactions: Sales/receipts (transaction_id, receipt_id, customer_id, subtotal, discount, tax, total, payment_method, created_at)
transaction_items: Items in each transaction (id, transaction_id, item_id, quantity, unit_price, subtotal)
daily_sales: Daily summary (date, total_sales, transactions_count, top_item)
inventory_forecast: Stock prediction (item_id, item_name, avg_daily_sales, recommended_stock, suggested_restock_date)
What to Preview in Frontend Pages:

POS/ProductGrid/ShoppingCart: Show products from inventory (name, price, stock, barcode, category, image, etc.)
Inventory: List/manage products from inventory (all columns), allow add/edit via backend
Dashboard: Show stats from transactions, daily_sales, and customers (total sales, revenue, top items, customer count)
Reports: Generate sales, inventory, and customer reports using transactions, transaction_items, inventory, customers, daily_sales
Receipts: Show transaction details from transactions and transaction_items
Payments: Show payment history from transactions
Analytics: Use daily_sales, inventory_forecast for charts and predictions
Implementation Instructions:

For each page, fetch actual data from the related table via backend API (no mock logic).
Use endpoints like /api/inventory, /api/sales, /api/customers, /api/transactions, etc.
