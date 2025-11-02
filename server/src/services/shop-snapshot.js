import { openDb } from "../utils/db.js";

const MAX_TRANSACTIONS = 200;

function getShopSnapshot(shopId) {
  const db = openDb(shopId);
  try {
    const inventory = db
      .prepare("SELECT * FROM inventory ORDER BY name COLLATE NOCASE")
      .all();

    const customers = db
      .prepare(
        "SELECT * FROM customers ORDER BY COALESCE(last_visit, created_at) DESC"
      )
      .all();

    const transactions = db
      .prepare(
        `SELECT * FROM transactions ORDER BY datetime(created_at) DESC LIMIT ?`
      )
      .all(MAX_TRANSACTIONS);

    const transactionIds = transactions.map((t) => t.transaction_id);
    let transactionItems = [];
    if (transactionIds.length) {
      const placeholders = transactionIds.map(() => "?").join(",");
      transactionItems = db
        .prepare(
          `SELECT * FROM transaction_items WHERE transaction_id IN (${placeholders})`
        )
        .all(...transactionIds);
    }

    const dailySales = db
      .prepare("SELECT * FROM daily_sales ORDER BY date DESC")
      .all();

    const paymentMethods = db
      .prepare("SELECT method FROM shop_payment_methods WHERE shop_id = ?")
      .all(shopId)
      .map((row) => row.method);

    return {
      shopId,
      inventory,
      customers,
      transactions,
      transactionItems,
      dailySales,
      paymentMethods,
    };
  } finally {
    db.close();
  }
}

export { getShopSnapshot };
