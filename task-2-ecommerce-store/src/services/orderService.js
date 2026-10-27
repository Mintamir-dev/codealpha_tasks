const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const config = require("../config");
const products = require("../data/products");
const HttpError = require("../utils/HttpError");
const { STATUS } = require("../utils/constants");

// ---------- storage ----------
function readOrders() {
  try { return JSON.parse(fs.readFileSync(config.ordersFile, "utf8")); }
  catch { return []; }
}
function writeOrders(orders) {
  fs.mkdirSync(path.dirname(config.ordersFile), { recursive: true });
  const tmp = config.ordersFile + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(orders, null, 2));
  fs.renameSync(tmp, config.ordersFile); // atomic replace
}

// ---------- image check by real file bytes (not just the name) ----------
function detectImageExt(buf) {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return ".jpg";
  if (buf.length > 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return ".png";
  if (buf.length > 12 && buf.slice(0, 4).toString() === "RIFF" && buf.slice(8, 12).toString() === "WEBP") return ".webp";
  return null;
}

// ---------- business logic ----------
function placeOrder({ name, phone, address, reference, items, file }) {
  // 1. price + stock check, using SERVER prices only
  let total = 0;
  const lines = items.map(({ id, qty }) => {
    const product = products.find(p => p.id === id);
    if (!product) throw new HttpError(400, "One of the products no longer exists.", { items: "Invalid product in cart." });
    if (qty > product.stock)
      throw new HttpError(400, `Only ${product.stock} of "${product.name}" left in stock.`, { items: `Only ${product.stock} of "${product.name}" left.` });
    total += product.price * qty;
    return { id: product.id, name: product.name, price: product.price, qty };
  });

  // 2. screenshot must be a real image
  const ext = detectImageExt(file.buffer);
  if (!ext) throw new HttpError(400, "That file is not a valid image.", { screenshot: "That file is not a valid image." });

  // 3. save screenshot with a random name
  fs.mkdirSync(config.uploadDir, { recursive: true });
  const screenshot = crypto.randomBytes(16).toString("hex") + ext;
  fs.writeFileSync(path.join(config.uploadDir, screenshot), file.buffer);

  // 4. reserve stock + save order
  lines.forEach(l => { products.find(p => p.id === l.id).stock -= l.qty; });
  const orders = readOrders();
  const order = {
    id: "ORD-" + (1001 + orders.length),
    customer: { name, phone, address },
    items: lines,
    total,
    payment: { reference: reference || null, screenshot },
    status: STATUS.PENDING,
    createdAt: new Date().toISOString()
  };
  orders.push(order);
  writeOrders(orders);
  return order;
}

function getOrder(id) {
  return readOrders().find(o => o.id === id);
}

function listOrders() {
  return readOrders().reverse();
}

function setStatus(id, status) {
  const orders = readOrders();
  const order = orders.find(o => o.id === id);
  if (!order) throw new HttpError(404, "Order not found.");
  if (order.status !== STATUS.PENDING) throw new HttpError(409, "This order was already reviewed.");
  order.status = status;
  order.reviewedAt = new Date().toISOString();
  if (status === STATUS.REJECTED) // give the stock back
    order.items.forEach(i => { const p = products.find(x => x.id === i.id); if (p) p.stock += i.qty; });
  writeOrders(orders);
  return order;
}

module.exports = { placeOrder, getOrder, listOrders, setStatus };
