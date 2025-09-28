// /opt/ceypos/server/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
const fs = require("fs");
const app = express();
const PORT = process.env.PORT || 8080;

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://ceypossolutions.com",
      "https://www.ceypossolutions.com",
    ],
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

// Routes
const inventoryRouter = require("./src/routes/inventory");
const shopRouter = require("./src/routes/shop");
const salesRoutes = require("./src/routes/sales");
const { processUserQuestion } = require("../mcp-server/mcp");

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
    res.json(result);
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.use("/api/inventory", inventoryRouter);
app.use("/api/shop", shopRouter);
app.use("/api/sales", salesRoutes);

// Serve static files from the dist directory (built frontend)
const distPath = path.join(__dirname, "../dist");
console.log("Looking for dist directory at:", distPath);

// Check if dist directory exists
if (fs.existsSync(distPath)) {
  console.log("✓ Found dist directory, serving static files");
  app.use(express.static(distPath));
} else {
  console.log("✗ Dist directory not found, static files will not be served");
}

// Handle client-side routing - serve index.html for all non-API routes
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

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// Create HTTP server and attach socket.io-based WS server
const server = http.createServer(app);
const ws = require("./src/ws-server");
ws.init(server, {
  corsOrigins: [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://ceypossolutions.com",
    "https://www.ceypossolutions.com",
  ],
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// Handle uncaught exceptions and unhandled rejections
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
