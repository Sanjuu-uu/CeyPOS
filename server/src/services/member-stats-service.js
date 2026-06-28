export function recordMemberSaleStats(db, shopId, memberId, { total, itemsSold, date }) {
  if (!memberId) return;

  const day = String(date || new Date().toISOString()).split("T")[0];
  db.prepare(
    `INSERT INTO member_daily_stats (shop_id, member_id, date, transactions_count, total_sales, items_sold)
     VALUES (?, ?, ?, 1, ?, ?)
     ON CONFLICT(shop_id, member_id, date) DO UPDATE SET
       transactions_count = COALESCE(transactions_count, 0) + 1,
       total_sales = COALESCE(total_sales, 0) + excluded.total_sales,
       items_sold = COALESCE(items_sold, 0) + excluded.items_sold`,
  ).run(shopId, memberId, day, Number(total) || 0, Number(itemsSold) || 0);
}

export function getMemberStats(db, shopId, { memberId, fromDate, toDate, limit = 30 }) {
  if (memberId) {
    return db
      .prepare(
        `SELECT s.*, m.display_name, m.role
         FROM member_daily_stats s
         JOIN shop_members m ON m.member_id = s.member_id
         WHERE s.shop_id = ? AND s.member_id = ?
           AND (? IS NULL OR s.date >= ?)
           AND (? IS NULL OR s.date <= ?)
         ORDER BY s.date DESC
         LIMIT ?`,
      )
      .all(shopId, memberId, fromDate, fromDate, toDate, toDate, limit);
  }

  return db
    .prepare(
      `SELECT s.member_id, m.display_name, m.role,
              SUM(s.transactions_count) AS transactions_count,
              SUM(s.total_sales) AS total_sales,
              SUM(s.items_sold) AS items_sold
       FROM member_daily_stats s
       JOIN shop_members m ON m.member_id = s.member_id
       WHERE s.shop_id = ?
         AND (? IS NULL OR s.date >= ?)
         AND (? IS NULL OR s.date <= ?)
       GROUP BY s.member_id
       ORDER BY total_sales DESC
       LIMIT ?`,
    )
    .all(shopId, fromDate, fromDate, toDate, toDate, limit);
}

export function getEmployeeOfMonth(db, shopId, monthPrefix) {
  const prefix = monthPrefix || new Date().toISOString().slice(0, 7);
  return db
    .prepare(
      `SELECT s.member_id, m.display_name, SUM(s.total_sales) AS total_sales, SUM(s.transactions_count) AS transactions_count
       FROM member_daily_stats s
       JOIN shop_members m ON m.member_id = s.member_id
       WHERE s.shop_id = ? AND s.date LIKE ?
       GROUP BY s.member_id
       ORDER BY total_sales DESC
       LIMIT 1`,
    )
    .get(shopId, `${prefix}%`);
}
