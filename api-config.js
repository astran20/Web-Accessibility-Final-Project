/*
 api-config.js
 Tells the front end where the RETHREAD PHP API lives, and gives it one small helper for calling it.
 Load it before any page script:  <script src="api-config.js"></script>

 - Running locally (php -S) or on any PHP host: leave REMOTE_API_BASE empty. Requests go to
   api/<name> on the same server.
 - Served from GitHub Pages with REMOTE_API_BASE set: requests go to that server instead (the Pages
   origin is already in ALLOWED_ORIGINS in config.php).
 - Served from GitHub Pages with REMOTE_API_BASE empty: Pages can't run PHP, so the site runs in
   static mode. Catalog reads come from the snapshot in static-api/ (rebuild it with
   `php tools/export-static-api.php`), and favorites are kept in this browser's localStorage.
   Anything that would write to the server, like bookings, answers with API_UNAVAILABLE.

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
(function () {
  const REMOTE_API_BASE = ""; // for example "https://rethread-api.example.edu/"

  const onGitHubPages = window.location.hostname.endsWith("github.io");
  const staticMode = onGitHubPages && REMOTE_API_BASE === "";
  const base = onGitHubPages ? REMOTE_API_BASE : "";
  const VISITOR_KEY = "rethread-visitor-token";

  window.RETHREAD_API = {
    base,
    available: true,
    staticMode,

    // Returns the saved guest token, creating one the first time.
    async visitorToken() {
      let token = null;
      try { token = localStorage.getItem(VISITOR_KEY); } catch (e) { /* storage blocked */ }
      if (!token) {
        const data = await this.request("create-visitor", { method: "POST" });
        token = data.visitor_token;
        try { localStorage.setItem(VISITOR_KEY, token); } catch (e) { /* storage blocked */ }
      }
      return token;
    },

    // request("items", { query: { sort: "featured" } })
    // request("create-booking", { method: "POST", body: { booking: {...} }, visitor: true })
    // On failure, throws an Error whose .errors is the API's errors array (each with error_code, field, message).
    async request(endpoint, { method = "GET", query = null, body = null, visitor = false, headers = {} } = {}) {
      if (staticMode) return staticRequest(endpoint, query || {}, body || {});
      let url = base + "api/" + endpoint;
      if (query) {
        const params = new URLSearchParams();
        Object.entries(query).forEach(([k, v]) => { if (v !== null && v !== undefined && v !== "") params.set(k, v); });
        if ([...params].length) url += "?" + params.toString();
      }
      const allHeaders = { ...headers };
      if (body !== null) allHeaders["Content-Type"] = "application/json";
      if (visitor) allHeaders["X-Visitor-Token"] = await this.visitorToken();

      const response = await fetch(url, { method, headers: allHeaders, body: body !== null ? JSON.stringify(body) : undefined });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const err = new Error(data.errors?.[0]?.message || "Request failed.");
        err.status = response.status;
        err.errors = data.errors || [];
        throw err;
      }
      return data;
    },
  };

  // ---------- Static mode (GitHub Pages without a PHP server) ----------
  // Mirrors the response shapes in docs/api.md for the read endpoints the pages use.

  const FAVORITES_KEY = "rethread-static-favorites";
  let catalogPromise = null;

  function apiError(status, code, message, field = null) {
    const err = new Error(message);
    err.status = status;
    err.errors = [{ error_code: code, field, message }];
    return err;
  }

  async function staticJSON(path) {
    const response = await fetch("static-api/" + path);
    if (!response.ok) throw apiError(response.status, "NOT_FOUND", "That isn't in the static snapshot.");
    return response.json();
  }

  function catalog() {
    if (!catalogPromise) {
      catalogPromise = staticJSON("items.json").catch((e) => { catalogPromise = null; throw e; });
    }
    return catalogPromise;
  }

  // Saved favorites as [{ item_id, saved_at }], newest first
  function readFavorites() {
    try { return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || []; } catch (e) { return []; }
  }
  function writeFavorites(list) {
    try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(list)); } catch (e) { /* storage blocked */ }
  }
  function withFavoriteFlag(item) {
    return { ...item, is_favorite: readFavorites().some((f) => f.item_id === item.item_id) };
  }

  function filterItems(data, query) {
    const statuses = (query.status || "available,held").split(",").map((s) => s.trim());
    let items = data.items.filter((i) => statuses.includes(i.status));
    if (query.store_id) items = items.filter((i) => i.store.store_id === query.store_id);
    if (query.category) items = items.filter((i) => i.category === query.category);
    if (query.size) items = items.filter((i) => i.size === query.size);

    let min = query.price_min, max = query.price_max;
    const range = String(query.price || "").match(/^(\d+)(?:-(\d+)|\+)$/);
    if (range) [min, max] = [range[1], range[2]];
    if (min !== undefined && min !== null && min !== "") items = items.filter((i) => i.price_cents >= min * 100);
    if (max !== undefined && max !== null && max !== "") items = items.filter((i) => i.price_cents < max * 100);

    if (query.q) {
      const q = String(query.q).toLowerCase();
      items = items.filter((i) =>
        [i.title, i.description, i.category, i.material, i.store.name].some((f) => (f || "").toLowerCase().includes(q)));
    }

    const sort = query.sort || "featured";
    const byId = (a, b) => (a.item_id < b.item_id ? -1 : 1);
    if (sort === "price-low") items.sort((a, b) => a.price_cents - b.price_cents || byId(a, b));
    else if (sort === "price-high") items.sort((a, b) => b.price_cents - a.price_cents || byId(a, b));
    else if (sort === "recent") items.sort((a, b) => (b.listed_at || "").localeCompare(a.listed_at || "") || byId(a, b));
    else {
      const order = data.featured_order || [];
      items.sort((a, b) => order.indexOf(a.item_id) - order.indexOf(b.item_id));
    }
    return { count: items.length, sort, generated_at: data.generated_at, items: items.map(withFavoriteFlag) };
  }

  async function findItem(itemId) {
    if (!itemId) throw apiError(400, "ITEM_ID_REQUIRED", "An item_id is required.", "item_id");
    const item = (await catalog()).items.find((i) => i.item_id === itemId);
    if (!item) throw apiError(404, "ITEM_NOT_FOUND", "We couldn't find that piece. It may have been removed.", "item_id");
    return item;
  }

  async function staticRequest(endpoint, query, body) {
    switch (endpoint) {
      case "create-visitor":
        return { success: true, visitor_token: "v_static", message: "Static mode: favorites stay in this browser." };

      case "items":
        return filterItems(await catalog(), query);

      case "item": {
        await findItem(query.item_id);
        const data = await staticJSON("item/" + encodeURIComponent(query.item_id) + ".json");
        return { item: withFavoriteFlag(data.item) };
      }

      case "favorites": {
        const items = (await catalog()).items;
        const list = readFavorites()
          .map((f) => {
            const item = items.find((i) => i.item_id === f.item_id);
            return item && { ...item, is_favorite: true, saved_at: f.saved_at };
          })
          .filter(Boolean);
        return { count: list.length, items: list };
      }

      case "add-favorite": {
        const item = await findItem(body.item_id);
        if (item.status === "sold") throw apiError(409, "ITEM_SOLD", "This piece has already sold, so it can't be saved.", "item_id");
        const list = readFavorites();
        const already = list.some((f) => f.item_id === item.item_id);
        if (!already) writeFavorites([{ item_id: item.item_id, saved_at: new Date().toISOString() }, ...list]);
        return { success: true, item_id: item.item_id, is_favorite: true, already_saved: already, message: item.title + " saved to Favorites." };
      }

      case "remove-favorite": {
        const itemId = body.item_id || query.item_id;
        if (!itemId) throw apiError(400, "ITEM_ID_REQUIRED", "An item_id is required.", "item_id");
        const list = readFavorites();
        const kept = list.filter((f) => f.item_id !== itemId);
        writeFavorites(kept);
        return { success: true, item_id: itemId, is_favorite: false, removed: kept.length < list.length, message: "Removed from Favorites." };
      }

      case "filter-options":
      case "stores":
        return staticJSON(endpoint + ".json");

      default:
        throw apiError(503, "API_UNAVAILABLE", "This copy of the site is a static demo, so it can't save that. Run it locally with PHP to use the full API.");
    }
  }
})();
