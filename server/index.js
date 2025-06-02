// /opt/ceypos/server/index.js
require("dotenv").config();
const express = require("express");
const app = express();
const PORT = process.env.PORT || 4000;

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
