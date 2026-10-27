const crypto = require("crypto");
const config = require("../config");
const HttpError = require("../utils/HttpError");

module.exports = (req, res, next) => {
  if (!config.adminKey) return next(new HttpError(503, "Admin is disabled. Set ADMIN_KEY in the .env file."));
  const given = Buffer.from(String(req.get("x-admin-key") || ""));
  const real = Buffer.from(config.adminKey);
  if (given.length === real.length && crypto.timingSafeEqual(given, real)) return next();
  next(new HttpError(401, "Wrong admin key."));
};
