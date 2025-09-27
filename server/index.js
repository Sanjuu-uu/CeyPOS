// /opt/ceypos/server/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

/* CORS */
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

/* ✅ Serve React build (client/dist) */
const staticDir = path.join(__dirname, "../client/dist");
app.use(express.static(staticDir));

/* ---------- API ROUTES ---------- */
const inventoryRouter = require("./src/routes/inventory");
const shopRouter = require("./src/routes/shop");
const salesRoutes = require("./src/routes/sales");

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/inventory", inventoryRouter);
app.use("/api/shop", shopRouter);
app.use("/api/sales", salesRoutes);

/* ✅ SPA fallback AFTER API routes */
app.get("*", (req, res) => {
  res.sendFile(path.join(staticDir, "index.html"));
});

/* ---------- HTTP + WS ---------- */
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
