# Back end notes

How the PHP side is put together. For the endpoints themselves, see [api.md](api.md).

## Settings

Everything you might change is in `config.php`:

| Setting | What it does |
|---------|--------------|
| `DATABASE_FILE_PATH` | Where the SQLite file lives (`data/rethread.db`). |
| `RESET_DATABASE` | Lets `php server-reset.php` wipe the data. Turn it off on a shared server. |
| `LOAD_SAMPLE_DATA` | Loads the sample pieces, favorites and bookings when the database is created. Stores load either way. |
| `ALLOWED_ORIGINS` | Other sites allowed to call the API (CORS). Pages on the same server don't need to be listed. |
| `ITEM_CATEGORIES`, `ITEM_SIZES`, `ITEM_CONDITIONS` | The allowed values for listings. |
| `FEATURED_WEIGHTS` | How the Featured sort scores pieces. |
| `BOOKING_WINDOW_DAYS` | How far ahead shoppers can book (30 days). |
| `IMPACT_ESTIMATES` | Rough CO2 and water figures per sold piece, by category. Placeholders for the class demo, so cite real numbers on the Learn page. |

## Data

The API creates `data/rethread.db` the first time it gets a request and fills it from `data/sample-*.json`. To change the sample data, edit those files and run `php server-reset.php`.

Store auth codes live in `data/sample-store-auth.json` and are hashed when they're loaded. Listing photos uploaded through the store portal go to `uploads/items/`. Neither the database nor the uploads are committed.

The front end can load `api-config.js` for a small `RETHREAD_API.request()` helper. It finds the API, keeps the shopper's guest token, and throws the API's `errors` array when a request fails.

## Deploying

GitHub Pages only serves static files and can't run PHP. A Pages copy of the site shows the HTML, CSS and images, but nothing under `api/` works there, and the `.php` files are served as plain text, so nothing secret should go in this repo. To give a Pages copy a working API, host the PHP code somewhere that runs PHP and put that address in `REMOTE_API_BASE` in `api-config.js`. `https://astran20.github.io` is already in `ALLOWED_ORIGINS`.

Any host with PHP 8.1+ runs the whole site, pages and API together. On Apache, the `.htaccess` files take over from `router.php` (`mod_rewrite` has to be on). The web server needs write access to `data/` and `uploads/items/`. Before putting it anywhere public, turn off `RESET_DATABASE`, change the demo auth codes, and add the site's address to `ALLOWED_ORIGINS` if the pages and API are on different domains.

## Files

```
router.php            Routes /api/<name> to api/<name>.php when using php -S, and blocks internal files
.htaccess             The same rules for Apache
config.php            Settings
server-reset.php      Wipes and reloads the database (command line only)
api-config.js         Optional fetch helper for the front end
api/helpers.php       Error objects, auth checks, input validation, JSON responses
api/database.php      Schema, first-run setup and seeding
api/models.php        Featured scoring, time slots, inventory rules, photo uploads, impact numbers
api/<endpoint>.php    One file per endpoint, 32 in all
data/                 Sample data and the database file
uploads/items/        Photos uploaded through the store portal
demo/                 Demo console (shop view and store admin portal)
tests/run-tests.php   End-to-end API tests
```
