/*
 api-config.js
 Tells the front end where the RETHREAD PHP API lives, and gives it one small helper for calling it.
 Load it before any page script:  <script src="api-config.js"></script>

 - Running locally (php -S) or on any PHP host: leave REMOTE_API_BASE empty. Requests go to
   api/<name> on the same server.
 - Served from GitHub Pages: Pages can't run PHP, so set REMOTE_API_BASE to wherever the API is
   hosted (and add the Pages origin to ALLOWED_ORIGINS in config.php, already done for astran20.github.io).

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
(function () {
  const REMOTE_API_BASE = "https://rethread.charliegray.co/";

  const onGitHubPages = window.location.hostname.endsWith("github.io");
  const base = onGitHubPages ? REMOTE_API_BASE : "";
  const VISITOR_KEY = "rethread-visitor-token";

  window.RETHREAD_API = {
    base,
    available: !onGitHubPages || REMOTE_API_BASE !== "",

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
      if (!this.available) {
        const err = new Error("The RETHREAD API isn't connected on this copy of the site.");
        err.errors = [{ error_code: "API_UNAVAILABLE", field: null, message: err.message }];
        throw err;
      }
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
})();
