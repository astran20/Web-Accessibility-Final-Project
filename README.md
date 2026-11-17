# RETHREAD

A web app for local secondhand clothing stores. Users browse clothes, save favorites, try items on virtually (simulated demo), and book a time to try them on in the store.

- **Emerging tech:** AI/AR virtual try-on. It does not have to be implemented, but it has to be researched, documented, and shown on the site.
- **Sustainability:** buying secondhand keeps clothes in use and out of landfill. This needs to be visible on the site, not just in the report.

The pages are plain HTML, CSS and JavaScript, backed by a small PHP API that keeps its data in SQLite.

Created for SCU CSEN 163.

## Requirements

This project requires PHP 8.0 or newer. 

You can check your PHP version by running `php -v`.

To install PHP on a Mac, run `brew install php`. On Windows, use the installer from [windows.php.net](https://windows.php.net/download/) or XAMPP.

## Running the Web App

From the project folder:

```bash
php -S localhost:8000 router.php
```

The site is at <http://localhost:8000> and the demo console is at <http://localhost:8000/demo/>. 

The database builds itself on the first request, using the sample stores, pieces, and bookings in `data/`.

## Live Copies

The full site, API included, runs at <https://ssl.students.engr.scu.edu/~cjgray/rethread/>. The GitHub Pages copy at <https://astran20.github.io/Web-Accessibility-Final-Project/> calls that same API.

## Running the Demo Console

`demo/` is a plain test page for API demonstrations. 

The following demo stores come pre-installed when using the demo console with the default database.

| Store | Auth code |
|-------|-----------|
| Second Story Vintage | `SecondStory-demo-2026` |
| Juniper & Thread | `JuniperThread-demo-2026` |
| North Loop Archive | `NorthLoop-demo-2026` |


## Docs

- [docs/api.md](docs/api.md): REST API documenteion
- [docs/backend.md](docs/backend.md): Configuration, testing, and development documentation on the PHP backend

## Credits
Jess (design), Boyang (HTML/CSS), Andrew (JavaScript), Ismael (AI/AR research) and Charlie (PHP API).
