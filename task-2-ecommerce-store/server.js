const app = require("./src/app");
const config = require("./src/config");

app.listen(config.port, () => {
  console.log(`Buna Market running at http://localhost:${config.port}`);
  if (!config.adminKey) console.warn("WARNING: ADMIN_KEY is not set. Copy .env.example to .env first.");
});
