# RETHREAD

Our CSEN 163 group project: a site for local secondhand clothing stores. Shoppers browse pieces from nearby shops, save favorites, try clothes on in a simulated demo, and book a time to try something on in person. The pages are plain HTML, CSS and JavaScript, backed by a small PHP API that keeps its data in SQLite.

## What you need

PHP 8.1 or newer. The standard install already includes everything the API uses (`pdo_sqlite`, `fileinfo`, `curl`). There's no database server or package manager to set up.

```bash
php -v
```

If you don't have PHP: on a Mac run `brew install php`. On Windows, use the installer from [windows.php.net](https://windows.php.net/download/) or XAMPP.

## Run it

From the project folder:

```bash
php -S localhost:8000 router.php
```

The site is at <http://localhost:8000> and the demo console is at <http://localhost:8000/demo/>. Leave `router.php` in the command; without it the pages still load but every `/api/` request returns a 404.

The database builds itself on the first request, using the sample stores, pieces and bookings in `data/`.

## Demo console

`demo/` is a plain test page for showing the API working. The left side is the shop catalog. The right side is a store's admin portal, where you can sign in, mark pieces sold or on hold, pin pieces, handle try-on bookings and add a listing with a photo. Make a change on the right, refresh the left, and the catalog updates.

Sign in with one of the demo stores. The "Fill in the demo code" link does the typing for you.

| Store | Auth code |
|-------|-----------|
| Second Story Vintage | `SecondStory-demo-2026` |
| Juniper & Thread | `JuniperThread-demo-2026` |
| North Loop Archive | `NorthLoop-demo-2026` |

## Reset before a demo

Sample bookings are dated relative to the day the database was created, so a database from last week has its bookings in the past. Reset it right before presenting:

```bash
php server-reset.php
```

This wipes the data and any uploaded photos and reloads the samples.

## Tests

```bash
php tests/run-tests.php
```

The tests start their own server on a throwaway copy of the database, so they never touch your data. Every check should pass.

## Docs

- [docs/api.md](docs/api.md): every endpoint, with example requests and responses
- [docs/backend.md](docs/backend.md): settings, how the data works, deploying, and the file layout
- [docs/project-plan.md](docs/project-plan.md): roles, deadlines and assignment notes

Jess (design), Boyang (HTML/CSS), Andrew (JavaScript), Ismael (AI/AR research) and Charlie (PHP API). Store names, addresses, inventory and prices are made up. Photos are from [Unsplash](https://unsplash.com/license).
