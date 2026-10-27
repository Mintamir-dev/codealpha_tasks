const box = document.getElementById("detail");
const id = new URLSearchParams(location.search).get("id");

(async () => {
  try {
    const p = await api("/api/products/" + encodeURIComponent(id));
    document.title = p.name + " - Buna Market";
    let qty = 1;
    box.innerHTML = `
      <div class="detail">
        <div class="big" style="background:${p.color}">${p.emoji}</div>
        <div>
          <span class="cat">${esc(p.category)}</span>
          <h1>${esc(p.name)}</h1>
          <p>${esc(p.description)}</p>
          <div class="price">${money(p.price)}</div>
          <div class="stock">${p.stock > 0 ? p.stock + " in stock" : "Out of stock"}</div>
          <div class="buy">
            <div class="qty">
              <button id="minus" aria-label="Decrease quantity">−</button>
              <span id="qty">1</span>
              <button id="plus" aria-label="Increase quantity">+</button>
            </div>
            <button class="btn" id="add" ${p.stock < 1 ? "disabled" : ""}>Add to cart</button>
            <a class="btn alt" href="cart.html">Go to cart</a>
          </div>
        </div>
      </div>`;
    const qtyEl = document.getElementById("qty");
    document.getElementById("minus").onclick = () => { qty = Math.max(1, qty - 1); qtyEl.textContent = qty; };
    document.getElementById("plus").onclick = () => { qty = Math.min(p.stock, qty + 1); qtyEl.textContent = qty; };
    const add = document.getElementById("add");
    add.onclick = () => {
      Cart.add(p, qty);
      add.textContent = "Added to cart";
      setTimeout(() => add.textContent = "Add to cart", 1200);
    };
  } catch (e) {
    box.innerHTML = '<div class="empty"><p>' + esc(e.message) + '</p><a class="btn" href="index.html">Back to shop</a></div>';
  }
})();
