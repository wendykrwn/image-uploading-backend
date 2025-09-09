const express = require("express");
const app = express();
const PORT = 5173;

app.get("/", (req, res) => {
  res.send("Hello Express 🚀");
});

app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
