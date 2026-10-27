const { validationResult } = require("express-validator");
const HttpError = require("../utils/HttpError");

module.exports = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const fields = {};
  result.array().forEach(e => { if (!fields[e.path]) fields[e.path] = e.msg; });
  next(new HttpError(400, Object.values(fields)[0], fields));
};
