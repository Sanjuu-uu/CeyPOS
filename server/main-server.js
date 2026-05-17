// CeyPoS Server
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { processUserQuestion } from '../mcp-server/mcp.js';

const app = express();
const PORT = process.env.PORT || 8080;

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

// Routes
import inventoryRouter from "./src/routes/inventory.js";
import shopRouter from "./src/routes/shop.js";
import salesRoutes from "./src/routes/sales.js";
import paymentMethodRoutes from "./src/routes/payment-methods.js";
import businessRulesRoutes from "./src/routes/business-rules.js"; // <--- ADDED
import mobileSessionRoutes from "./src/routes/mobile-sessions.js";

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/analytics/chat", async (req, res) => {
  try {
    const { question, shopId } = req.body;
    if (!question || !shopId) {
      return res.status(400).json({ error: "Missing question or shopId" });
    }
    const result = await processUserQuestion(question, shopId);
    const visServerRaw = (process.env.VIS_REQUEST_SERVER ?? '').trim();
    const visServer = visServerRaw.endsWith('/') ? visServerRaw.slice(0, -1) : visServerRaw;
    const visServiceId = (process.env.VIS_SERVICE_ID ?? '').trim();
    const visServicePath = (process.env.VIS_SERVICE_PATH ?? '/v1/services/{serviceId}/invoke').trim();
    const requiresServiceId = visServicePath.includes('{serviceId}');
    const visualizationConfigured = Boolean(visServer && (!requiresServiceId || visServiceId));
    const visualizationConfig = {
      provider: "antv",
      configured: visualizationConfigured,
      baseUrl: visualizationConfigured ? visServer : null,
      serviceId: visualizationConfigured && visServiceId ? visServiceId : null,
    };
    res.json({
      ...result,
      visualizationConfig,
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.use("/api/inventory", inventoryRouter);
app.use("/api/shop", shopRouter);
app.use("/api/sales", salesRoutes);
app.use("/api/payment-methods", paymentMethodRoutes);
app.use("/api/business-rules", businessRulesRoutes); // <--- REGISTERED
app.use("/api/mobile", mobileSessionRoutes);

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

server.listen(PORT, () => {
  console.log(`CeyPos Main server running on port ${PORT}`);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});