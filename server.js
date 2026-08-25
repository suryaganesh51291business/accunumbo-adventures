const express = require("express");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 10000;

// Serve files from the repository root
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(__dirname));

// Explicitly serve index.html at /
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Simple health check
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    app: "AccuNumbo Adventures"
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`AccuNumbo Adventures running on port ${PORT}`);
});
