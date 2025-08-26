// /opt/ceypos/server/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

// Routes
const inventoryRouter = require("./src/routes/inventory");
const shopRouter = require("./src/routes/shop");
const salesRoutes = require("./routes/sales");

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/inventory", inventoryRouter);
app.use("/api/shop", shopRouter);
app.use("/api/sales", salesRoutes);

// Create HTTP server and attach socket.io-based WS server
const server = http.createServer(app);
const ws = require("./src/ws-server");
ws.init(server, {
  corsOrigins: ["http://localhost:5173", "http://127.0.0.1:5173"],
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
