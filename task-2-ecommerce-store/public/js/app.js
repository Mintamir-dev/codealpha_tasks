// ---------- Cart (saved in the browser with localStorage) ----------
const Cart = {
  get() {
    try { return JSON.parse(localStorage.getItem("cart")) || []; }
    catch { return []; }
  },
  save(items) {
    localStorage.setItem("cart", JSON.stringify(items));
    Cart.updateBadge();
  },
  add(product, qty = 1) {
    const items = Cart.get();
    const found = items.find(i => i.id === product.id);
    if (found) found.qty = Math.min(found.qty + qty, product.stock);
    else items.push({ id: product.id, qty: Math.min(qty, product.stock) });
    Cart.save(items);
  },
  setQty(id, qty) {
    let items = Cart.get();
    if (qty < 1) items = items.filter(i => i.id !== id);
    else items.find(i => i.id === id).qty = qty;
    Cart.save(items);
  },
  remove(id) { Cart.save(Cart.get().filter(i => i.id !== id)); },
  clear() { Cart.save([]); },
  count() { return Cart.get().reduce((n, i) => n + i.qty, 0); },
  updateBadge() {
    const el = document.getElementById("cart-count");
    if (el) el.textContent = Cart.count();
  }
};

// ---------- helpers ----------
const money = n => "ETB " + Number(n).toLocaleString();
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
async function api(url, options) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}
document.addEventListener("DOMContentLoaded", Cart.updateBadge);
