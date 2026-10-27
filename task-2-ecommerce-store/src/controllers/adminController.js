const path = require("path");
const config = require("../config");
const service = require("../services/orderService");
const HttpError = require("../utils/HttpError");

exports.list = (req, res) => res.json(service.listOrders());

exports.review = (req, res, next) => {
  try { res.json(service.setStatus(req.params.id, req.body.status)); }
  catch (err) { next(err); }
};

exports.screenshot = (req, res, next) => {
  const order = service.getOrder(req.params.id);
  if (!order) return next(new HttpError(404, "Order not found."));
  res.sendFile(path.join(config.uploadDir, path.basename(order.payment.screenshot)));
};
