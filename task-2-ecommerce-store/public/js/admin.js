const list = document.getElementById("orders");
const tokenKey = "adminKey";

function adminFetch(url, options = {}) {
  return fetch(url, { ...options, headers: { ...(options.headers || {}), "x-admin-key": sessionStorage.getItem(tokenKey) || "" } });
}

async function load() {
  if (!sessionStorage.getItem(tokenKey)) {
    const key = prompt("Admin key");
    if (!key) { list.innerHTML = '<p class="empty">Admin key needed. Refresh to try again.</p>'; return; }
    sessionStorage.setItem(tokenKey, key);
  }
  const res = await adminFetch("/api/admin/orders");
  const data = await res.json();
  if (!res.ok) {
    sessionStorage.removeItem(tokenKey);
    list.innerHTML = `<p class="empty">${esc(data.error)} Refresh to try again.</p>`;
    return;
  }
  if (!data.length) { list.innerHTML = '<p class="empty">No orders yet.</p>'; return; }

  list.innerHTML = data.map(o => `
    <article class="panel order" data-id="${esc(o.id)}">
      <div>
        <h2>${esc(o.id)} · ${money(o.total)}</h2>
        <p class="cat">${esc(o.status)} · ${new Date(o.createdAt).toLocaleString()}</p>
        <p><strong>${esc(o.customer.name)}</strong> · ${esc(o.customer.phone)}<br>${esc(o.customer.address)}</p>
        <p>${o.items.map(i => esc(i.name) + " × " + i.qty).join(", ")}</p>
        <p class="cat">Reference: ${esc(o.payment.reference || "none")}</p>
        ${o.status === "Pending verification" ? `
          <button class="btn small" data-status="Payment confirmed">Confirm payment</button>
          <button class="btn small ghost" data-status="Payment rejected">Reject</button>` : ""}
      </div>
      <img class="shot" alt="Payment screenshot for ${esc(o.id)}" data-shot="${esc(o.id)}">
    </article>`).join("");

  list.querySelectorAll("img[data-shot]").forEach(async img => {
    const r = await adminFetch(`/api/admin/orders/${img.dataset.shot}/screenshot`);
    if (r.ok) img.src = URL.createObjectURL(await r.blob());
  });
  list.querySelectorAll("button[data-status]").forEach(btn => btn.addEventListener("click", async () => {
    const id = btn.closest("[data-id]").dataset.id;
    const r = await adminFetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: btn.dataset.status })
    });
    if (!r.ok) alert((await r.json()).error);
    load();
  }));
}
load();
