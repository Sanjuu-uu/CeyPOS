import { openShopDatabase } from "../utils/shop-database.js";

const MAX_TRANSACTIONS = 200;

function getShopSnapshot(shopId) {
  const db = openShopDatabase(shopId);
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

    // Business Rules
    const loyalty = db
      .prepare("SELECT * FROM business_rules_loyalty WHERE shop_id = ?")
      .get(shopId) || { enabled: 0, earn_rate: 1.0, redeem_rate: 0.01, min_points: 0 };

    const discounts = db
      .prepare("SELECT * FROM business_rules_discounts WHERE shop_id = ?")
      .all(shopId);

    const taxes = db
      .prepare("SELECT * FROM business_rules_taxes WHERE shop_id = ?")
      .all(shopId);

    const surcharges = db
      .prepare("SELECT * FROM business_rules_surcharges WHERE shop_id = ?")
      .all(shopId);

    return {
      shopId,
      inventory,
      customers,
      transactions,
      transactionItems,
      dailySales,
      paymentMethods,
      businessRules: {
        loyalty,
        discounts,
        taxes,
        surcharges
      }
    };
  } finally {
    db.close();
  }
}

export { getShopSnapshot };