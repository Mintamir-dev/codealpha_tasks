const path = require("path");
const express = require("express");
const helmet = require("helmet");
const HttpError = require("./utils/HttpError");
const errorHandler = require("./middleware/errorHandler");

const app = express();
app.disable("x-powered-by");

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      "upgrade-insecure-requests": null // site runs on plain http locally
    }
  }
}));
app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

app.use("/api/products", require("./routes/products"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/payment-info", require("./routes/payment"));
app.use("/api/admin", require("./routes/admin"));

app.use("/api", (req, res, next) => next(new HttpError(404, "API route not found")));
app.use(errorHandler);

module.exports = app;
