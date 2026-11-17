# Back End Notes

## Settings
Configuration for the backend is in `config.php`.

| Setting                                            | What it does                                                        |
|----------------------------------------------------|---------------------------------------------------------------------|
| DATABASE_FILE_PATH                                 | Where the SQLite file lives. Defaults to `data/rethread.db`.        |
| RESET_DATABASE                                     | Lets `php server-reset.php` wipe the data. Turn it off on a shared server. |
| LOAD_SAMPLE_DATA                                   | Loads the sample pieces, favorites and bookings on first run. The stores load either way. |
| APP_TIMEZONE                                       | Timezone for every date and time slot. Set to America/Los_Angeles.  |
| ALLOWED_ORIGINS                                    | Other sites allowed to call the API. Pages on the same server don't need to be listed. |
| ITEM_CATEGORIES, ITEM_SIZES, ITEM_CONDITIONS       | The allowed values for listings.                                    |
| MAX_IMAGE_BYTES                                    | Largest photo a store can upload (5 MB).                            |
| MAX_PINNED_PER_STORE                               | How many pieces each store can pin to Featured (2).                 |
| FEATURED_WEIGHTS                                   | How the Featured sort scores pieces.                                |
| BOOKING_WINDOW_DAYS                                | How far ahead shoppers can book (30 days).                          |
| IMPACT_ESTIMATES                                   | CO2 and water saved per sold piece, by category.                    |

The impact numbers are rough placeholders for the demo. If the Learn page quotes them, swap in real figures with a source first.

## Data
The API builds `data/rethread.db` on its first request and fills it from the `data/sample-*.json` files. To change the sample data, edit those files and reset the database.

Store auth codes come from `data/sample-store-auth.json` and get hashed when they load. Photos uploaded through the store portal go to `uploads/items/`. The database and the uploads are both in `.gitignore`.

## Resetting the Database
```bash
php server-reset.php
```

This deletes the database and any uploaded photos, then reloads the samples. It only runs from the command line.

## Tests
```bash
php tests/run-tests.php
```

The tests start their own server on a copy of the database, so your data stays as it is. If anything fails, the output names the check.

## Front End Helper
Pages can load `api-config.js` to get `RETHREAD_API.request()`. It finds the API, keeps the shopper's visitor token, and throws the API's "errors" array when a request fails.

## Deploying
Any host with PHP 8.1 or newer can run the whole site, pages and API together. On Apache, the `.htaccess` files do the job `router.php` does locally, as long as `mod_rewrite` is on. The web server needs write access to `data/` and `uploads/items/`.

Before putting it anywhere public, turn off RESET_DATABASE and change the demo auth codes. If the pages and the API end up on different domains, add the pages' address to ALLOWED_ORIGINS.

GitHub Pages can't run PHP, and it serves the `.php` files as plain text, which is why nothing secret goes in this repo. When `api-config.js` sees it's on github.io with REMOTE_API_BASE empty, it switches to static mode: the catalog, item and store reads come from the JSON snapshot in `static-api/`, favorites live in the browser's localStorage, and anything that writes (bookings, the store portal) returns API_UNAVAILABLE. The live copy is at <https://astran20.github.io/Web-Accessibility-Final-Project/>.

The snapshot doesn't update itself. After changing the sample data or the response format, rebuild it and commit the result:

```bash
php tools/export-static-api.php
```

To give a Pages copy the full API instead, host the PHP somewhere else and put that address in REMOTE_API_BASE. `https://astran20.github.io` is already in ALLOWED_ORIGINS.

## Files
```
router.php            Routes /api/<name> to api/<name>.php under php -S and blocks internal files
.htaccess             The same rules for Apache
config.php            Settings
server-reset.php      Wipes and reloads the database (command line only)
api-config.js         Fetch helper for the front end, with the static fallback for GitHub Pages
static-api/           Read-only API snapshot used on GitHub Pages
tools/export-static-api.php  Rebuilds static-api/ from the sample data
api/helpers.php       Error objects, auth checks, input validation, JSON responses
api/database.php      Schema, first-run setup and sample data
api/models.php        Featured scoring, time slots, inventory rules, photo uploads, impact numbers
api/<endpoint>.php    One file per endpoint, 32 in all
data/                 Sample data and the database file
uploads/items/        Photos uploaded through the store portal
demo/                 Demo console (shop view and store admin portal)
tests/run-tests.php   End-to-end API tests
```
