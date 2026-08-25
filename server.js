const express = require("express");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 10000;

// Serve files from the root directory
app.use(express.static(__dirname));

// Serve index.html for the home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Handle other HTML pages
app.get("/:page", (req, res) => {
  const page = req.params.page;

  if (page.endsWith(".html")) {
    res.sendFile(path.join(__dirname, page));
  } else {
    res.sendFile(path.join(__dirname, `${page}.html`));
  }
});

app.listen(PORT, () => {
  console.log(`AccuNumbo running on http://localhost:${PORT}`);
});
  
