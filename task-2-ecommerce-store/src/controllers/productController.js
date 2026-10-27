const products = require("../data/products");
const HttpError = require("../utils/HttpError");

exports.list = (req, res) => {
  const q = String(req.query.q || "").toLowerCase();
  const category = String(req.query.category || "").toLowerCase();
  res.json(products.filter(p =>
    (!q || p.name.toLowerCase().includes(q)) &&
    (!category || p.category.toLowerCase() === category)));
};

exports.get = (req, res, next) => {
  const product = products.find(p => p.id === Number(req.params.id));
  if (!product) return next(new HttpError(404, "Product not found."));
  res.json(product);
};
