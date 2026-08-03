import express from "express";
import multer from "multer";
import ExcelJS from "exceljs";
import { openShopDatabase, shopDatabaseExists } from "../utils/shop-database.js";
import {
  upsertProducts,
  deleteProducts,
  getInventoryOperations,
  upsertSupplier,
  createPurchaseOrder,
  receiveGoods,
  createPurchaseReturn,
  adjustInventoryStock,
  createStockCount,
  upsertVariant,
} from "../services/inventory-service.js";
import { requireClerkSession } from "../middleware/clerk-auth.js";
import {
  requireShopBody,
  loadShopAuth,
  requireScope,
} from "../middleware/shop-auth.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // Accept only Excel files
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/octet-stream', // fallback for some browsers
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.xlsx?$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
  },
});

const REQUIRED_COLUMNS = [
  "inventory_code",
  "barcode_id",
  "name",
  "category",
  "sku",
  "price",
  "stock",
];

router.post("/upload", requireClerkSession, (req, res, next) => {
  upload.single("file")(req, res, function (err) {
    if (err) {
      let msg = "File upload error";
      if (err.code === 'LIMIT_FILE_SIZE') msg = "File too large. Max 10MB allowed.";
      if (err.message && err.message.includes('Excel')) msg = err.message;
      console.error(`[INVENTORY UPLOAD ERROR]`, {
        time: new Date().toISOString(),
        shopId: req.query.shopId || req.body.shopId,
        file: req.file?.originalname,
        error: msg,
        details: err
      });
      return res.status(400).json({ error: msg });
    }
    next();
  });
}, requireShopBody, loadShopAuth, requireScope("inventory"), async (req, res) => {
  let db = null;
  const releaseDb = () => {
    if (db) {
      try {
        db.close();
      } catch (closeErr) {
        console.warn("Failed to close inventory DB", closeErr);
      }
      db = null;
    }
  };
  try {
    const shopId = req.query.shopId || req.body.shopId;
    if (!shopId) {
      console.error(`[INVENTORY UPLOAD ERROR] Missing shopId`, { time: new Date().toISOString(), file: req.file?.originalname });
      return res.status(400).json({ error: "Shop ID is required. Please select a shop before importing." });
    }
    if (!req.file) {
      console.error(`[INVENTORY UPLOAD ERROR] Missing file`, { time: new Date().toISOString(), shopId });
      return res.status(400).json({ error: "Excel file is required. Please upload a valid .xlsx or .xls file." });
    }
    if (!req.file.originalname.match(/\.xlsx?$/i)) {
      console.error(`[INVENTORY UPLOAD ERROR] Wrong file type`, { time: new Date().toISOString(), shopId, file: req.file?.originalname });
      return res.status(400).json({ error: "Uploaded file is not an Excel file (.xlsx/.xls). Please check the file format." });
    }

    if (!shopDatabaseExists(shopId)) {
      console.error(`[INVENTORY UPLOAD ERROR] Missing database`, { time: new Date().toISOString(), shopId });
      return res.status(404).json({ error: "Shop database not found. Please complete shop setup." });
    }

    try {
      db = openShopDatabase(shopId);
    } catch (dbErr) {
      console.error(`[INVENTORY UPLOAD ERROR] DB open failed`, { time: new Date().toISOString(), shopId, error: dbErr });
      return res.status(500).json({ error: "Could not open shop database.", detail: String(dbErr.message || dbErr) });
    }

    // Use exceljs to read the uploaded Excel file
    let workbook;
    try {
      workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
    } catch (excelErr) {
      console.error(`[INVENTORY UPLOAD ERROR] Excel read failed`, { time: new Date().toISOString(), shopId, file: req.file?.originalname, error: excelErr });
      return res.status(400).json({ error: "Failed to read Excel file. Please check the file contents.", detail: String(excelErr.message || excelErr) });
    }
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      console.error(`[INVENTORY UPLOAD ERROR] No worksheet found`, { time: new Date().toISOString(), shopId, file: req.file?.originalname });
      return res.status(400).json({ error: "No worksheet found in Excel. Please check the file structure." });
    }

    // Parse rows
    const rowsRaw = [];
    let headers;
    try {
      const headerRow = worksheet.getRow(1);
      headers = headerRow.values.slice(1).map(h => String(h).trim());
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // skip header
        const obj = {};
        headers.forEach((header, i) => {
          obj[header] = row.getCell(i + 1).value;
        });
        rowsRaw.push(obj);
      });
    } catch (parseErr) {
      console.error(`[INVENTORY UPLOAD ERROR] Excel row parse failed`, { time: new Date().toISOString(), shopId, file: req.file?.originalname, error: parseErr });
      return res.status(400).json({ error: "Failed to parse Excel rows. Please check the file format and headers.", detail: String(parseErr.message || parseErr) });
    }
    if (!rowsRaw.length) {
      console.error(`[INVENTORY UPLOAD ERROR] No rows found`, { time: new Date().toISOString(), shopId, file: req.file?.originalname });
      return res.status(400).json({ error: "No rows found in Excel. Please check the file contents." });
    }

    // Validate columns
    const cols = Object.keys(rowsRaw[0]).map((c) => c.trim());
    const missing = REQUIRED_COLUMNS.filter((c) => !cols.includes(c));
    if (missing.length) {
      console.error(`[INVENTORY UPLOAD ERROR] Missing columns`, { time: new Date().toISOString(), shopId, file: req.file?.originalname, missing });
      return res.status(400).json({ error: `Missing required columns: ${missing.join(", ")}. Please use the provided template.` });
    }

    // Map and sanitize
    const now = new Date().toISOString();
    // Validation logic
    const validationIssues = [];
    const validRows = [];
    // Check for duplicate barcode_id in Excel file
    const barcodeIdCount = {};
    rowsRaw.forEach((r, idx) => {
      if (r.barcode_id) {
        const val = String(r.barcode_id).trim();
        barcodeIdCount[val] = (barcodeIdCount[val] || 0) + 1;
      }
    });
    rowsRaw.forEach((r, idx) => {
      const rowNum = idx + 2; // Excel row number (header is row 1)
      // Required fields
      if (!r.inventory_code || String(r.inventory_code).trim() === "") {
        validationIssues.push({ row: rowNum, field: "inventory_code", value: r.inventory_code, issue: "Inventory code is required", type: "error" });
      }
      if (!r.name || String(r.name).trim() === "") {
        validationIssues.push({ row: rowNum, field: "name", value: r.name, issue: "Name is required", type: "error" });
      }
      if (r.price !== undefined && r.price !== null && Number(r.price) < 0) {
        validationIssues.push({ row: rowNum, field: "price", value: r.price, issue: "Price cannot be negative", type: "error" });
      }
      if (r.stock !== undefined && r.stock !== null && Number(r.stock) < 0) {
        validationIssues.push({ row: rowNum, field: "stock", value: r.stock, issue: "Stock cannot be negative", type: "error" });
      }
      // Duplicate barcode_id in Excel
      if (r.barcode_id && barcodeIdCount[String(r.barcode_id).trim()] > 1) {
        validationIssues.push({ row: rowNum, field: "barcode_id", value: r.barcode_id, issue: "Duplicate barcode_id in uploaded file", type: "error" });
      }
      // Warnings
      if (r.category && typeof r.category === "string" && r.category.toLowerCase() === "misc") {
        validationIssues.push({ row: rowNum, field: "category", value: r.category, issue: "Category not in standard list", type: "warning" });
      }
      if (r.stock === 0) {
        validationIssues.push({ row: rowNum, field: "stock", value: r.stock, issue: "Stock is zero", type: "warning" });
      }
      // Only push valid rows
      if (
        r.inventory_code && String(r.inventory_code).trim() !== "" &&
        r.name && String(r.name).trim() !== "" &&
        !(r.price !== undefined && r.price !== null && Number(r.price) < 0) &&
        !(r.stock !== undefined && r.stock !== null && Number(r.stock) < 0) &&
        !(r.barcode_id && barcodeIdCount[String(r.barcode_id).trim()] > 1)
      ) {
        validRows.push({
          inventory_code: String(r.inventory_code || "").trim() || null,
          barcode_id: String(r.barcode_id || "").trim() || null,
          name: String(r.name || "").trim(),
          category: String(r.category || "").trim() || null,
          sku: String(r.sku || "").trim() || null,
          price: r.price === "" || r.price === null ? null : Number(r.price),
          cost_price: r.cost_price === "" || r.cost_price === null ? 0 : Number(r.cost_price || 0),
          stock: r.stock === "" || r.stock === null ? 0 : Number(r.stock),
          stock_last_month: r.stock_last_month === "" || r.stock_last_month === null ? 0 : Number(r.stock_last_month || 0),
          restock_suggestion: r.restock_suggestion === "" || r.restock_suggestion === null ? 0 : Number(r.restock_suggestion || 0),
          reorder_threshold: r.reorder_threshold === "" || r.reorder_threshold === null ? 0 : Number(r.reorder_threshold || 0),
          unit_name: String(r.unit_name || "unit").trim() || "unit",
          pack_size: r.pack_size === "" || r.pack_size === null ? 1 : Number(r.pack_size || 1),
          image_url: r.image_url || r.imageUrl || null,
          created_at: now,
          updated_at: now,
        });
      }
    });
    // Reconcile barcode_id against the DB. Re-importing the SAME product (same
    // inventory_code) is an update and must be allowed; only reject a barcode
    // that already belongs to a DIFFERENT inventory_code (a genuine clash).
    // Previously every existing barcode was rejected, so any re-import failed
    // with "No valid rows".
    if (validRows.length) {
      const dbBarcodeToCode = new Map();
      try {
        const stmt = db.prepare(
          'SELECT inventory_code, barcode_id FROM inventory WHERE deleted_at IS NULL AND barcode_id IS NOT NULL'
        );
        for (const row of stmt.iterate()) {
          if (row.barcode_id) {
            dbBarcodeToCode.set(
              String(row.barcode_id).trim(),
              String(row.inventory_code)
            );
          }
        }
      } catch (dbErr) {
        console.error('[INVENTORY UPLOAD ERROR] Failed to query barcode_id from DB', dbErr);
      }
      const rowsToInsert = [];
      validRows.forEach((r, idx) => {
        const barcode = r.barcode_id ? String(r.barcode_id).trim() : '';
        const owner = barcode ? dbBarcodeToCode.get(barcode) : undefined;
        if (owner && owner !== String(r.inventory_code)) {
          validationIssues.push({ row: idx + 2, field: 'barcode_id', value: r.barcode_id, issue: 'Barcode already used by a different product', type: 'error' });
        } else {
          rowsToInsert.push(r);
        }
      });
      validRows.length = 0;
      validRows.push(...rowsToInsert);
    }

    if (!validRows.length) {
      console.error(`[INVENTORY UPLOAD ERROR] No valid rows`, { time: new Date().toISOString(), shopId, file: req.file?.originalname, validationIssues });
      releaseDb();
      return res.status(400).json({ error: "No valid rows after parsing. Please fix errors in your file and try again.", validationIssues });
    }

    try {
      releaseDb();
      upsertProducts(shopId, validRows, {
        metadata: { source: "inventory-upload" },
        actor: req.user?.id || null,
      });
    } catch (dbInsertErr) {
      console.error(`[INVENTORY UPLOAD ERROR] DB insert failed`, { time: new Date().toISOString(), shopId, file: req.file?.originalname, error: dbInsertErr });
      return res.status(500).json({ error: "Failed to insert inventory rows into database.", detail: String(dbInsertErr.message || dbInsertErr) });
    }
    // Count errors/warnings
    const errors = validationIssues.filter(i => i.type === "error").length;
    const warnings = validationIssues.filter(i => i.type === "warning").length;
    res.json({
      ok: true,
      inserted: validRows.length,
      total: rowsRaw.length,
      successful: validRows.length,
      errors,
      warnings,
      validationIssues
    });
  } catch (err) {
    console.error(`[INVENTORY UPLOAD ERROR] Unexpected server error`, { time: new Date().toISOString(), error: err });
    res.status(500).json({ error: "Unexpected server error during inventory import.", detail: String(err.message || err) });
  } finally {
    // Always release the DB handle — including on the early validation returns
    // above. Previously those paths leaked SQLite handles, locking the file and
    // making subsequent uploads fail even for valid files.
    releaseDb();
  }
});

router.get("/template", async (req, res) => {
  // Generate an actual Excel (.xlsx) template with required columns and sample rows
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('inventory');

    const header = [
      'inventory_code',
      'barcode_id',
      'name',
      'category',
      'sku',
      'price',
      'cost_price',
      'stock',
      'stock_last_month',
      'restock_suggestion',
      'reorder_threshold',
      'unit_name',
      'pack_size',
      'image_url'
    ];

    sheet.addRow(header);

    // Add couple of sample rows
    sheet.addRow(['INV-001', 'BAR-001', 'Sample Item A', 'Beverages', 'SKU-001', 199.99, 120.00, 20, 15, 5, 8, 'bottle', 1, 'https://example.com/image-a.jpg']);
    sheet.addRow(['INV-002', 'BAR-002', 'Sample Item B', 'Snacks', 'SKU-002', 59.50, 35.00, 100, 80, 50, 25, 'pack', 12, 'https://example.com/image-b.jpg']);

    // Apply basic styling for header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Adjust column widths
    const colWidths = [20, 20, 30, 20, 18, 12, 12, 10, 14, 18, 18, 14, 12, 40];
    sheet.columns.forEach((col, idx) => {
      col.width = colWidths[idx] || 15;
    });

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=inventory_template.xlsx');
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Failed to generate inventory template', err);
    res.status(500).json({ error: 'Failed to generate Excel template' });
  }
});

router.use("/:shopId", requireClerkSession, requireShopBody, loadShopAuth, requireScope("inventory"));

function requireShop(req, res) {
  const shopId = req.params.shopId || req.query.shopId || req.body?.shopId;
  if (!shopId) {
    res.status(400).json({ ok: false, error: "missing_shop_id" });
    return null;
  }
  if (!shopDatabaseExists(shopId)) {
    res.status(404).json({ ok: false, error: "shop_not_found" });
    return null;
  }
  return shopId;
}

router.get("/:shopId/operations", (req, res) => {
  const shopId = requireShop(req, res);
  if (!shopId) return;
  try {
    res.json({ ok: true, data: getInventoryOperations(shopId) });
  } catch (err) {
    console.error("[INVENTORY OPERATIONS LOAD ERROR]", err);
    res.status(500).json({ ok: false, error: "failed_to_load_inventory_operations" });
  }
});

router.post("/:shopId/suppliers", (req, res) => {
  const shopId = requireShop(req, res);
  if (!shopId) return;
  if (!String(req.body?.name || "").trim()) {
    return res.status(400).json({ ok: false, error: "supplier_name_required" });
  }
  try {
    res.json({ ok: true, data: upsertSupplier(shopId, req.body, { actor: req.user?.id || null }) });
  } catch (err) {
    console.error("[SUPPLIER UPSERT ERROR]", err);
    res.status(500).json({ ok: false, error: "failed_to_save_supplier" });
  }
});

router.post("/:shopId/purchase-orders", (req, res) => {
  const shopId = requireShop(req, res);
  if (!shopId) return;
  if (!Array.isArray(req.body?.items) || !req.body.items.length) {
    return res.status(400).json({ ok: false, error: "purchase_order_items_required" });
  }
  try {
    res.json({ ok: true, data: createPurchaseOrder(shopId, req.body, { actor: req.user?.id || null }) });
  } catch (err) {
    console.error("[PO CREATE ERROR]", err);
    res.status(500).json({ ok: false, error: "failed_to_create_purchase_order" });
  }
});

router.post("/:shopId/goods-received", (req, res) => {
  const shopId = requireShop(req, res);
  if (!shopId) return;
  if (!Array.isArray(req.body?.items) || !req.body.items.length) {
    return res.status(400).json({ ok: false, error: "goods_received_items_required" });
  }
  try {
    res.json({ ok: true, data: receiveGoods(shopId, req.body, { actor: req.user?.id || null }) });
  } catch (err) {
    console.error("[GOODS RECEIVED ERROR]", err);
    res.status(500).json({ ok: false, error: "failed_to_receive_goods" });
  }
});

router.post("/:shopId/purchase-returns", (req, res) => {
  const shopId = requireShop(req, res);
  if (!shopId) return;
  if (!Array.isArray(req.body?.items) || !req.body.items.length) {
    return res.status(400).json({ ok: false, error: "purchase_return_items_required" });
  }
  try {
    res.json({ ok: true, data: createPurchaseReturn(shopId, req.body, { actor: req.user?.id || null }) });
  } catch (err) {
    console.error("[PURCHASE RETURN ERROR]", err);
    res.status(500).json({ ok: false, error: "failed_to_create_purchase_return" });
  }
});

router.post("/:shopId/adjustments", (req, res) => {
  const shopId = requireShop(req, res);
  if (!shopId) return;
  try {
    res.json({ ok: true, data: adjustInventoryStock(shopId, req.body, { actor: req.user?.id || null }) });
  } catch (err) {
    console.error("[INVENTORY ADJUSTMENT ERROR]", err);
    res.status(500).json({ ok: false, error: "failed_to_adjust_inventory" });
  }
});

router.post("/:shopId/stock-counts", (req, res) => {
  const shopId = requireShop(req, res);
  if (!shopId) return;
  if (!Array.isArray(req.body?.items) || !req.body.items.length) {
    return res.status(400).json({ ok: false, error: "stock_count_items_required" });
  }
  try {
    res.json({ ok: true, data: createStockCount(shopId, req.body, { actor: req.user?.id || null }) });
  } catch (err) {
    console.error("[STOCK COUNT ERROR]", err);
    res.status(500).json({ ok: false, error: "failed_to_create_stock_count" });
  }
});

router.post("/:shopId/variants", (req, res) => {
  const shopId = requireShop(req, res);
  if (!shopId) return;
  if (!req.body?.parent_inventory_code && !req.body?.parentInventoryCode) {
    return res.status(400).json({ ok: false, error: "parent_inventory_code_required" });
  }
  try {
    res.json({ ok: true, data: upsertVariant(shopId, req.body, { actor: req.user?.id || null }) });
  } catch (err) {
    console.error("[VARIANT UPSERT ERROR]", err);
    res.status(500).json({ ok: false, error: "failed_to_save_variant" });
  }
});

router.delete("/:shopId/:inventoryCode", async (req, res) => {
  const { shopId, inventoryCode } = req.params;

  if (!shopId || !inventoryCode) {
    return res.status(400).json({ ok: false, error: "missing_parameters" });
  }

  if (!shopDatabaseExists(shopId)) {
    return res.status(404).json({ ok: false, error: "shop_not_found" });
  }

  try {
    const removed = deleteProducts(shopId, [inventoryCode], {
      actor: req.user?.id || null,
    });

    if (!removed.length) {
      return res.status(404).json({ ok: false, error: "product_not_found" });
    }

    res.json({ ok: true, codes: removed });
  } catch (err) {
    console.error("[INVENTORY DELETE ERROR]", {
      time: new Date().toISOString(),
      shopId,
      inventoryCode,
      error: err,
    });
    res.status(500).json({ ok: false, error: "failed_to_delete_product" });
  }
});

// Bulk delete — accepts { codes: string[] } so multi-select removal is a single
// round-trip and a single realtime broadcast.
router.post("/:shopId/bulk-delete", async (req, res) => {
  const { shopId } = req.params;
  const codes = Array.isArray(req.body?.codes) ? req.body.codes : [];

  if (!shopId) {
    return res.status(400).json({ ok: false, error: "missing_parameters" });
  }
  if (!codes.length) {
    return res.status(400).json({ ok: false, error: "no_codes_provided" });
  }
  if (!shopDatabaseExists(shopId)) {
    return res.status(404).json({ ok: false, error: "shop_not_found" });
  }

  try {
    const removed = deleteProducts(shopId, codes, {
      actor: req.user?.id || null,
    });
    res.json({ ok: true, codes: removed });
  } catch (err) {
    console.error("[INVENTORY BULK DELETE ERROR]", {
      time: new Date().toISOString(),
      shopId,
      error: err,
    });
    res.status(500).json({ ok: false, error: "failed_to_delete_products" });
  }
});

export default router;
