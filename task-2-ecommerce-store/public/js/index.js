const list = document.getElementById("products");
const search = document.getElementById("search");
const category = document.getElementById("category");
let timer;

async function load() {
  const params = new URLSearchParams();
  if (search.value.trim()) params.set("q", search.value.trim());
  if (category.value) params.set("category", category.value);
  try {
    const products = await api("/api/products?" + params);
    if (!products.length) { list.innerHTML = '<p class="empty">No products match. Try another search.</p>'; return; }
    list.innerHTML = products.map(p => `
      <article class="card">
        <a class="thumb" style="background:${p.color}" href="product.html?id=${p.id}" aria-label="View ${esc(p.name)}">${p.emoji}</a>
        <div class="body">
          <span class="cat">${esc(p.category)}</span>
          <h3><a href="product.html?id=${p.id}">${esc(p.name)}</a></h3>
          <div class="row">
            <span class="price">${money(p.price)}</span>
            <button class="btn small" data-id="${p.id}">Add to cart</button>
          </div>
        </div>
      </article>`).join("");
    list.querySelectorAll("button[data-id]").forEach(btn => {
      btn.addEventListener("click", () => {
        Cart.add(products.find(p => p.id === Number(btn.dataset.id)));
        btn.textContent = "Added";
        setTimeout(() => btn.textContent = "Add to cart", 1000);
      });
    });
  } catch (e) { list.innerHTML = '<p class="empty">' + esc(e.message) + '</p>'; }
}
search.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(load, 250); });
category.addEventListener("change", load);
load();
