// CeyPoS Server
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { clerkMiddleware } from '@clerk/express';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load shared root env first, then let server/.env override it. This keeps
// backend-only secrets in server/.env while allowing non-secret local flags
// such as FITSMS_FORCE_DEV_OTP to live in the root dev env.
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });

const app = express();
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || "0.0.0.0";
const clerkSecretKey = String(process.env.CLERK_SECRET_KEY || "").trim();
const clerkPublishableKey = String(
  process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY || "",
).trim();

app.set("trust proxy", 1);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://ceypossolutions.com",
        "https://www.ceypossolutions.com",
      ];

      if (process.env.NODE_ENV === "production") {
        if (origin.includes("railway.app") || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
      } else {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

if (clerkSecretKey && clerkPublishableKey) {
  app.use(
    clerkMiddleware({
      secretKey: clerkSecretKey,
      publishableKey: clerkPublishableKey,
    }),
  );
} else if (process.env.NODE_ENV === "production") {
  console.warn(
    "Clerk auth disabled: missing CLERK_SECRET_KEY or CLERK_PUBLISHABLE_KEY; authenticated routes will return 503/401 as appropriate.",
  );
}

// API routes are mounted from one registry so route ownership stays visible.
import { registerApiRoutes } from "./src/routes/index.js";
import { API_HEALTH_PATH } from "./src/routes/paths.js";
import { ensureAllShopDatabasesSchema } from "./src/utils/shop-database.js";
import { SHOP_DATABASE_DIRECTORY } from "./src/utils/shop-database.js";
import { migrateLegacyReceiptTokensDb } from "./src/services/receipt-tokens.js";
import { openGlobalVerificationDatabase } from "./src/utils/global-verification-database.js";
import { openGlobalBarcodeDatabase } from "./src/utils/global-barcode-database.js";
import { startBackupScheduler } from "./src/services/admin-ops-service.js";

try {
  const initialized = ensureAllShopDatabasesSchema();
  if (initialized.length) {
    console.log(
      `shop-database: ensured schema on ${initialized.length} DB(s):`,
      initialized.join(", "),
    );
  }
} catch (err) {
  console.warn("shop-database schema bootstrap failed:", err?.message || err);
}

try {
  const result = migrateLegacyReceiptTokensDb();
  if (result.migrated || result.skipped) {
    console.log(
      `receipt-tokens: migrated ${result.migrated} row(s), skipped ${result.skipped}`,
    );
  }
} catch (err) {
  console.warn("receipt-tokens migration failed:", err?.message || err);
}

try {
  const verificationDb = openGlobalVerificationDatabase();
  verificationDb.close();
  const barcodeDb = openGlobalBarcodeDatabase();
  barcodeDb.close();
  console.log("global-databases: verification.db and import-catalog.db ready");
  console.log("shop database directory:", SHOP_DATABASE_DIRECTORY);
} catch (err) {
  console.warn("global-databases bootstrap failed:", err?.message || err);
}

app.get(API_HEALTH_PATH, (req, res) => {
  res.json({ status: "ok" });
});

registerApiRoutes(app);

// Serve static files from the dist directory (built frontend)
const distPath = path.join(process.cwd(), "../dist");
console.log("Looking for dist directory at:", distPath);

if (fs.existsSync(distPath)) {
  console.log("✓ Found dist directory, serving static files");
  app.use(express.static(distPath));
} else {
  console.log("✗ Dist directory not found, static files will not be served");
}

app.get(/^(?!\/api).*/, (req, res) => {
  const indexPath = path.join(distPath, "index.html");

  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error("Error serving index.html:", err);
        res.status(500).send("Internal Server Error");
      }
    });
  } else {
    console.error("index.html not found at:", indexPath);
    res
      .status(404)
      .send("Frontend not found - please ensure the application is built");
  }
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

const server = http.createServer(app);
import { init } from "./src/ws-server.js";
init(server, {
  corsOrigins: [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://ceypossolutions.com",
    "https://www.ceypossolutions.com",
  ],
});

server.listen(PORT, HOST, () => {
  console.log(`CeyPos Main server running on ${HOST}:${PORT}`);
  startBackupScheduler();
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
