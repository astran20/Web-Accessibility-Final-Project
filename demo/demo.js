// RETHREAD demo console: a shopper view and a store admin portal on one page.
// Talks to the PHP API in ../api/. Needs the PHP server running (see README).

const API = "../api/";
const DEMO_CODES = {
  "second-story": "SecondStory-demo-2026",
  "juniper-thread": "JuniperThread-demo-2026",
  "north-loop": "NorthLoop-demo-2026",
};

let store = null; // { id, code, name } once signed in

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
// "2026-11-13" -> "Fri, Nov 13"
const shortDate = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const img = (path) => (/^(https?:|data:)/.test(path) ? path : "../" + path);

function say(message, isError = false) {
  const el = $("#status");
  // A single sentence reads as a label, so it drops its final period
  el.textContent = /^[^.]*\.$/.test(message) ? message.slice(0, -1) : message;
  el.classList.toggle("is-error", isError);
}

async function call(endpoint, { method = "GET", body = null, query = null, auth = false } = {}) {
  let url = API + endpoint;
  if (query) url += "?" + new URLSearchParams(query);
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (auth && store) {
    headers["X-Store-Id"] = store.id;
    headers["X-Auth-Code"] = store.code;
  }
  let response;
  try {
    response = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw Object.assign(new Error("Can't reach the API. Is the PHP server running?"), { errors: [] });
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(data.errors?.[0]?.message || "Request failed."), { errors: data.errors || [] });
  }
  return data;
}

// ---------- Shop view ----------

async function loadShop() {
  try {
    const catalog = await call("items", { query: { sort: $("#shop-sort").value } });
    $("#shop-count").textContent = `${plural(catalog.count, "piece")} listed`;
    $("#shop-list").innerHTML = catalog.items.map((item) => `
      <li>
        <img src="${esc(img(item.image))}" alt="${esc(item.image_alt)}">
        <div>
          <strong>${esc(item.title)}</strong>${item.pinned ? '<span class="flag">Pinned</span>' : ""}${item.status !== "available" ? `<span class="flag ${esc(item.status)}">${esc(item.status_label)}</span>` : ""}
          <div class="meta">${esc(item.price_display)} · Size ${esc(item.size)} · ${esc(item.condition)}</div>
          <div class="meta muted">${esc(item.store.name)}</div>
        </div>
      </li>`).join("");
  } catch (err) {
    say(err.message, true);
  }
}

// ---------- Store admin ----------

async function loadDashboard() {
  const [inventory, bookings] = await Promise.all([
    call("store-items", { auth: true }),
    call("store-bookings", { auth: true }),
  ]);

  $("#inventory").innerHTML = inventory.items.map((item) => `
    <tr>
      <td><strong>${esc(item.title)}</strong><div class="sub">${esc(item.item_id)} · Size ${esc(item.size)} · ${plural(item.favorites_count, "save")}</div></td>
      <td class="num">${esc(item.price_display)}</td>
      <td>
        <label class="visually-hidden" for="status-${esc(item.item_id)}">Status for ${esc(item.title)}</label>
        <select id="status-${esc(item.item_id)}" data-status="${esc(item.item_id)}">
          ${["available", "held", "sold"].map((s) => `<option value="${s}" ${s === item.status ? "selected" : ""}>${s === "held" ? "on hold" : s}</option>`).join("")}
        </select>
      </td>
      <td><button type="button" class="secondary" data-pin="${esc(item.item_id)}" data-pinned="${item.pinned}" aria-pressed="${item.pinned}"
            aria-label="${item.pinned ? "Unpin" : "Pin"} ${esc(item.title)}" ${item.status === "sold" ? "disabled" : ""}>${item.pinned ? "Pinned" : "Pin"}</button></td>
    </tr>`).join("");

  $("#no-bookings").hidden = bookings.count > 0;
  $("#bookings").innerHTML = bookings.bookings.map((b) => `
    <tr>
      <td class="nowrap">${esc(shortDate(b.date))}<div class="sub">${esc(b.time_label)}</div></td>
      <td>${esc(b.name)}<div class="sub">${esc(b.email)}</div></td>
      <td>${esc(b.item.title)}</td>
      <td>${esc(b.status_label)}${b.cancel_message ? `<div class="sub">${esc(b.cancel_message)}</div>` : ""}</td>
      <td>${b.status === "confirmed" ? `<div class="actions">
        <button type="button" class="secondary" data-booking="${b.booking_id}" data-action="completed">Completed</button>
        <button type="button" class="secondary" data-booking="${b.booking_id}" data-action="sold">Completed and sold</button>
        <button type="button" class="secondary" data-booking="${b.booking_id}" data-action="no_show">No-show</button>
        <button type="button" class="secondary" data-booking="${b.booking_id}" data-action="cancelled">Cancel</button></div>` : ""}
      </td>
    </tr>`).join("");
}

async function refreshAll(message) {
  await loadDashboard();
  await loadShop();
  if (message) say(message);
}

$("#fill-code").addEventListener("click", () => {
  $("#login-code").value = DEMO_CODES[$("#login-store").value];
});

$("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  store = { id: $("#login-store").value, code: $("#login-code").value };
  try {
    const data = await call("store-login", { method: "POST", auth: true });
    store.name = data.store.name;
    $("#store-name").textContent = data.store.name;
    $("#login-form").hidden = true;
    $("#dashboard").hidden = false;
    $("#signed-in").hidden = false;
    await loadDashboard();
    say(data.message);
    $("#store-name").focus();
  } catch (err) {
    store = null;
    say(err.message, true);
  }
});

$("#sign-out").addEventListener("click", () => {
  store = null;
  $("#dashboard").hidden = true;
  $("#signed-in").hidden = true;
  $("#login-form").hidden = false;
  $("#login-code").value = "";
  $("#login-code").focus();
  say("Signed out");
});

$("#inventory").addEventListener("change", async (e) => {
  const itemId = e.target.dataset.status;
  if (!itemId) return;
  try {
    const data = await call("update-item-status", { method: "PUT", auth: true, body: { item_id: itemId, status: e.target.value } });
    await refreshAll(data.message);
  } catch (err) {
    say(err.message, true);
    await loadDashboard();
  }
});

$("#inventory").addEventListener("click", async (e) => {
  const button = e.target.closest("[data-pin]");
  if (!button) return;
  try {
    const data = await call("set-featured", { method: "PUT", auth: true, body: { item_id: button.dataset.pin, pinned: button.dataset.pinned !== "true" } });
    await refreshAll(data.message);
  } catch (err) {
    say(err.message, true);
  }
});

$("#bookings").addEventListener("click", async (e) => {
  const button = e.target.closest("[data-booking]");
  if (!button) return;
  const action = button.dataset.action;
  if (action === "cancelled" && !confirm("Cancel this booking? The shopper will see that the shop cancelled it.")) return;
  const body = { booking_id: Number(button.dataset.booking), status: action === "sold" ? "completed" : action };
  if (action === "sold") body.item_sold = true;
  try {
    const data = await call("update-booking-status", { method: "PUT", auth: true, body });
    await refreshAll(data.message);
  } catch (err) {
    say(err.message, true);
  }
});

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

$("#item-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  form.querySelectorAll("[data-error]").forEach((p) => (p.textContent = ""));
  form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));

  const f = form.elements; // form.title would be the form's title attribute, not the input
  const file = f.photo.files[0];
  const item = {
    title: f.title.value,
    category: f.category.value,
    size: f.size.value,
    condition: f.condition.value,
    price_cents: f.price.value ? Math.round(Number(f.price.value) * 100) : null,
    description: f.description.value,
    image_alt: f.image_alt.value,
    try_on_supported: f.try_on_supported.checked,
    image_b64: file ? await readFile(file) : null,
  };
  if (f.material.value.trim()) item.material = f.material.value;

  try {
    const data = await call("create-item", { method: "POST", auth: true, body: { item } });
    form.reset();
    await refreshAll(data.message);
  } catch (err) {
    // Put each error next to its field, the same way the booking form should
    const inputFor = { price_cents: "price", image_b64: "photo" };
    let first = null;
    for (const error of err.errors) {
      const slot = form.querySelector(`[data-error="${error.field}"]`);
      const input = form.elements[inputFor[error.field] || error.field];
      if (slot) slot.textContent = error.message;
      if (input) {
        input.setAttribute("aria-invalid", "true");
        first ??= input;
      }
    }
    say(err.errors.length > 1 ? `Fix ${err.errors.length} fields to add this listing.` : err.message, true);
    first?.focus();
  }
});

$("#refresh-shop").addEventListener("click", async () => {
  await loadShop();
  say("Catalog refreshed.");
});
$("#shop-sort").addEventListener("change", loadShop);

loadShop();
