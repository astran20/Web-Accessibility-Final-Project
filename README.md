# RETHREAD

A web app for local secondhand clothing stores. Shoppers browse pieces from independent shops, save favorites, preview a simulated virtual try-on, and book a time to try a piece on in the store. Shops list new pieces, mark them sold, and manage their try-on appointments. Built for Santa Clara University's CSEN 163.

The front end is plain HTML, CSS and JavaScript. The back end is a PHP + SQLite JSON API in [`api/`](api/), documented in [`api/api.md`](api/api.md).

## Requirements

- **PHP 8.1 or newer** with the `pdo_sqlite`, `fileinfo` and `curl` extensions (all included in standard PHP installs, including Homebrew's).
- Nothing else: no database server, Composer or Node. SQLite is a single file.

Check your PHP:

```bash
php -v
```

```bash
php -m | grep -E "pdo_sqlite|fileinfo|curl"
```

Installing PHP: on a Mac, `brew install php`. On Windows, download it from [windows.php.net](https://windows.php.net/download/) or use XAMPP. On Linux, `sudo apt install php-cli php-sqlite3 php-curl`.

## Running the site locally

From the project folder, start PHP's built-in server with the router:

```bash
php -S localhost:8000 router.php
```

Then open <http://localhost:8000>. That one command serves both the pages and the API (for example <http://localhost:8000/api/items>). Stop it with `Ctrl+C`.

Always include `router.php`. It maps clean API URLs like `/api/items` to `api/items.php` and blocks internal files such as `config.php` and the database. Without it, the HTML pages still load but the API URLs won't.

**The database sets itself up.** The first API request creates `data/rethread.db` and fills it with the sample stores, pieces, favorites and bookings from `data/sample-*.json`. Dates in the sample data are relative to today, so the demo always looks current.

### Resetting the data

To wipe everything (including photos uploaded through the store dashboard) and reload the samples:

```bash
php server-reset.php
```

Resetting is allowed while `RESET_DATABASE` is `true` in `config.php`. Turn it off on a shared server. It only runs from the command line, never from a browser.

## Running the tests

```bash
php tests/run-tests.php
```

This starts its own server on a throwaway copy of the database, runs 145 checks against every endpoint (catalog filters, featured ordering, favorites, booking rules, the sold-item flow, store permissions, file protection and CORS), and cleans up after itself. Your real data isn't touched. It prints a ✓ or ✗ for each check and exits with code 0 when everything passes.

## Demo store logins

The store endpoints use the `X-Store-Id` and `X-Auth-Code` headers. The sample stores' codes are in `data/sample-store-auth.json`:

| Store | `X-Store-Id` | `X-Auth-Code` |
|-------|--------------|---------------|
| Second Story Vintage | `second-story` | `SecondStory-demo-2026` |
| Juniper & Thread | `juniper-thread` | `JuniperThread-demo-2026` |
| North Loop Archive | `north-loop` | `NorthLoop-demo-2026` |

These are classroom demo codes. Change them in `data/sample-store-auth.json` and run `php server-reset.php` before putting the site anywhere public.

Quick check from the terminal while the server is running:

```bash
curl -X POST http://localhost:8000/api/store-login -H "X-Store-Id: second-story" -H "X-Auth-Code: SecondStory-demo-2026"
```

## Connecting the front end

Load [`api-config.js`](api-config.js) before page scripts. It provides `RETHREAD_API.request()`, which builds the URL, attaches the guest visitor token when asked, parses the JSON and throws the API's `errors` array on failure:

```html
<script src="api-config.js"></script>
<script type="module">
  const { items, count } = await RETHREAD_API.request("items", {
    query: { category: "outerwear", sort: "featured" },
    visitor: true, // adds X-Visitor-Token so each item includes is_favorite
  });
</script>
```

Things to know when wiring up the pages:

- **Load data from the API on every page load.** Don't cache the catalog in `localStorage`. That's what makes a sold piece disappear when the page is refreshed.
- **Item links** should become `item.html?item_id=item-01` (every item object includes this as `url`), with the detail page built from `GET /api/item`. The current `item.html#item-01` anchors and the hardcoded Favorites and booking summary are static placeholders.
- **The Explore dropdown values already match the API**: `sort` uses `featured`, `price-low`, `price-high`, `recent`, and `price` uses `0-25`, `25-50`, `50-100`. `GET /api/filter-options` returns the full lists with counts if you'd rather build the dropdowns from data.
- **Booking times** come from `GET /api/availability?item_id=…&date=…`. Each slot has a ready-made `label` ("11:00 am, fully booked") and `available: false` for options that should be disabled. Times are sent back as 24-hour `HH:MM`.
- **Form errors** include a `field` that matches the booking form's `data-field` names (`name`, `email`, `date`, `time`, `notes`), so each message can go into its `[data-field-error]` with `aria-invalid="true"` on the control.

## Deploying

### GitHub Pages (front end only)

The site is published with GitHub Pages from the `main` branch. **GitHub Pages only serves static files: it can't run PHP**, so on Pages the HTML, CSS, images and JavaScript work, but `api/` requests don't. The `.php` files are served as plain text there, so never put real secrets in this repository.

To use the live API from the Pages copy, host the PHP back end somewhere that runs PHP (below), then set `REMOTE_API_BASE` in `api-config.js` to its URL. The Pages origin (`https://astran20.github.io`) is already allowed in `ALLOWED_ORIGINS` in `config.php`, so cross-origin requests work.

### A PHP host (full site)

Any host with PHP 8.1+ and SQLite runs the whole site, pages and API together. For Apache hosts, the included `.htaccess` files do the same job as `router.php` (clean API URLs and blocked internal files); `mod_rewrite` must be enabled. Make sure the web server can write to `data/` and `uploads/items/`. Before going live, set `RESET_DATABASE` to `false`, replace the demo store codes, and add your site's address to `ALLOWED_ORIGINS` if the pages and API are on different domains.

## Project structure

```
index.html, stores.html, item.html, …   Front-end pages
styles.css                              Shared styles
api-config.js                           API location and fetch helper for the front end
router.php                              Router for `php -S` (clean URLs, blocks internal files)
.htaccess                               The same rules for Apache
config.php                              Settings: paths, timezone, CORS, categories, featured weights, impact estimates
server-reset.php                        Wipes and reseeds the database (command line only)
api/
  api.md                                Full API documentation
  helpers.php                           Shared error objects, auth, validation, responses
  database.php                          SQLite schema, auto-setup and seeding
  models.php                            Formatting, featured ordering, availability, inventory rules
  <endpoint>.php                        One file per endpoint (32 in total)
data/
  sample-*.json                         Seed data (stores, auth codes, items, try-on, activity)
  rethread.db                           The database (created automatically, not committed)
uploads/items/                          Photos uploaded by stores (not committed)
tests/run-tests.php                     End-to-end API tests
```

## Credits

RETHREAD was designed by Jess (design), Ismael (AI/AR research), Boyang (HTML/CSS), Andrew (JavaScript) and Charlie (PHP API) for CSEN 163 at Santa Clara University. All store names, addresses, inventory and prices are fictional sample data. Product and shop photos are from [Unsplash](https://unsplash.com/license); see `HANDOFF.md` for sources.
