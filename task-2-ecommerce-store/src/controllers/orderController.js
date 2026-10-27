const service = require("../services/orderService");
const HttpError = require("../utils/HttpError");

exports.create = (req, res, next) => {
  try {
    const { name, phone, address, reference, items } = req.body; // already validated + trimmed
    const order = service.placeOrder({
      name, phone, address, reference,
      items: JSON.parse(items).map(i => ({ id: i.id, qty: i.qty })),
      file: req.file
    });
    res.status(201).json({ id: order.id, status: order.status, total: order.total, items: order.items, customer: order.customer });
  } catch (err) { next(err); }
};

// Public tracking: no phone number, no screenshot.
exports.track = (req, res, next) => {
  const order = service.getOrder(req.params.id);
  if (!order) return next(new HttpError(404, "Order not found."));
  res.json({ id: order.id, status: order.status, total: order.total, items: order.items });
};
