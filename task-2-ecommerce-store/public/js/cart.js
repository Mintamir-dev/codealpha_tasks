const page = document.getElementById("page");
const PHONE = /^(?:\+251|251|0)?[79]\d{8}$/;
const MAX_BYTES = 5 * 1024 * 1024;
let products = [];
let payment = {};

function lines() {
  return Cart.get().map(i => ({ ...i, product: products.find(p => p.id === i.id) })).filter(l => l.product);
}

function field(id, label, input) {
  return `<div class="field"><label for="${id}">${label}</label>${input}<small class="err" id="err-${id}" role="alert"></small></div>`;
}

function render() {
  const items = lines();
  if (!items.length) {
    page.innerHTML = '<div class="empty"><h2>Your cart is empty</h2><p>Add something you like from the shop.</p><a class="btn" href="index.html">Browse products</a></div>';
    return;
  }
  const total = items.reduce((s, l) => s + l.product.price * l.qty, 0);
  page.innerHTML = `
    <h1>Your cart</h1>
    <div class="cart-layout">
      <section>
        ${items.map(l => `
          <div class="line">
            <div class="mini" style="background:${l.product.color}">${l.product.emoji}</div>
            <div><div class="name">${esc(l.product.name)}</div><div class="cat">${money(l.product.price)} each</div></div>
            <div class="qty">
              <button data-act="minus" data-id="${l.id}" aria-label="Decrease quantity">−</button>
              <span>${l.qty}</span>
              <button data-act="plus" data-id="${l.id}" aria-label="Increase quantity">+</button>
            </div>
            <button class="btn ghost small remove" data-act="remove" data-id="${l.id}">Remove</button>
          </div>`).join("")}
        <div class="total"><span>Total to pay</span><span>${money(total)}</span></div>
      </section>
      <section class="panel">
        <h2>Checkout</h2>
        <div class="msg" id="form-error" role="alert" hidden></div>
        ${field("name", "Full name", '<input id="name" autocomplete="name" maxlength="60">')}
        ${field("phone", "Phone number", '<input id="phone" type="tel" autocomplete="tel" placeholder="0911223344" maxlength="16">')}
        ${field("address", "Delivery address", '<textarea id="address" rows="3" maxlength="200"></textarea>')}

        <div class="pay-box">
          <h3>Pay first, then order</h3>
          <p>Send <strong>${money(total)}</strong> to one of these accounts:</p>
          <ul>
            <li>${esc(payment.bankName)}: <strong>${esc(payment.accountNumber)}</strong></li>
            <li>Telebirr: <strong>${esc(payment.telebirr)}</strong></li>
            <li>Account name: <strong>${esc(payment.accountName)}</strong></li>
          </ul>
          <p>Then upload a screenshot of the payment confirmation.</p>
        </div>
        ${field("screenshot", "Payment screenshot (JPG, PNG or WEBP, up to 5 MB)", '<input id="screenshot" type="file" accept="image/jpeg,image/png,image/webp">')}
        <img id="preview" class="preview" alt="Payment screenshot preview" hidden>
        ${field("reference", "Transaction reference (optional)", '<input id="reference" maxlength="30" placeholder="e.g. FT23abc123">')}

        <button class="btn" id="order" style="width:100%">Place order</button>
        <p class="cat" style="margin-top:8px">Your order is confirmed after we check your payment.</p>
      </section>
    </div>`;

  page.querySelectorAll("[data-act]").forEach(btn => btn.addEventListener("click", () => {
    const id = Number(btn.dataset.id);
    const line = items.find(l => l.id === id);
    if (btn.dataset.act === "plus") Cart.setQty(id, Math.min(line.qty + 1, line.product.stock));
    if (btn.dataset.act === "minus") Cart.setQty(id, line.qty - 1);
    if (btn.dataset.act === "remove") Cart.remove(id);
    render();
  }));
  document.getElementById("screenshot").addEventListener("change", showPreview);
  document.getElementById("order").addEventListener("click", placeOrder);
}

function showPreview(e) {
  const img = document.getElementById("preview");
  const file = e.target.files[0];
  if (!file) { img.hidden = true; return; }
  img.src = URL.createObjectURL(file);
  img.hidden = false;
}

function setErrors(fields) {
  ["name", "phone", "address", "screenshot", "reference"].forEach(k => {
    document.getElementById("err-" + k).textContent = (fields && fields[k]) || "";
  });
}

function checkForm(v, file) {
  const e = {};
  if (v.name.length < 2 || v.name.length > 60) e.name = "Name must be 2 to 60 characters.";
  else if (!/^[\p{L}\s.'-]+$/u.test(v.name)) e.name = "Name can only contain letters, spaces, . ' and -.";
  if (!PHONE.test(v.phone)) e.phone = "Enter a valid Ethiopian phone number, like 0911223344.";
  if (v.address.length < 5 || v.address.length > 200) e.address = "Address must be 5 to 200 characters.";
  if (v.reference && !/^[A-Za-z0-9-]{4,30}$/.test(v.reference)) e.reference = "Reference must be 4 to 30 letters or numbers.";
  if (!file) e.screenshot = "Upload a screenshot of your payment. You cannot order without paying.";
  else if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) e.screenshot = "Only JPG, PNG or WEBP images are allowed.";
  else if (file.size > MAX_BYTES) e.screenshot = "Screenshot is too large. Maximum is 5 MB.";
  return e;
}

async function placeOrder() {
  const val = id => document.getElementById(id).value.trim();
  const v = { name: val("name"), phone: val("phone"), address: val("address"), reference: val("reference") };
  const file = document.getElementById("screenshot").files[0];
  const box = document.getElementById("form-error");
  box.hidden = true;

  const errors = checkForm(v, file);
  setErrors(errors);
  if (Object.keys(errors).length) return;

  const fd = new FormData();
  Object.entries(v).forEach(([k, x]) => fd.append(k, x));
  fd.append("items", JSON.stringify(Cart.get().map(({ id, qty }) => ({ id, qty }))));
  fd.append("screenshot", file); // keep the file field last

  const btn = document.getElementById("order");
  btn.disabled = true; btn.textContent = "Sending order…";
  try {
    const res = await fetch("/api/orders", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) {
      setErrors(data.fields);
      box.textContent = data.error || "Could not place the order.";
      box.hidden = false;
      return;
    }
    Cart.clear();
    showSuccess(data);
  } catch {
    box.textContent = "Cannot reach the server. Check your connection and try again.";
    box.hidden = false;
  } finally {
    btn.disabled = false; btn.textContent = "Place order";
  }
}

function showSuccess(o) {
  page.innerHTML = `
    <div class="success panel">
      <div class="check">✅</div>
      <h1>Order received</h1>
      <p>Thank you, ${esc(o.customer.name)}. Your order number is <strong>${esc(o.id)}</strong>.</p>
      <p class="cat">Status: ${esc(o.status)}. We will check your payment and contact you on ${esc(o.customer.phone)}.</p>
      <ul class="receipt">
        ${o.items.map(i => `<li><span>${esc(i.name)} × ${i.qty}</span><span>${money(i.price * i.qty)}</span></li>`).join("")}
        <li><strong>Total paid</strong><strong>${money(o.total)}</strong></li>
      </ul>
      <a class="btn" style="margin-top:18px" href="index.html">Keep shopping</a>
    </div>`;
}

(async () => {
  try {
    [products, payment] = await Promise.all([api("/api/products"), api("/api/payment-info")]);
    render();
  } catch (e) { page.innerHTML = '<p class="empty">' + esc(e.message) + '</p>'; }
})();
