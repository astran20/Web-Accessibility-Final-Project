# RETHREAD API Documentation

The RETHREAD back end is a small PHP + SQLite API that speaks JSON. Each endpoint lives at `/api/<name>` (adding `.php` also works). Nothing is cached (`Cache-Control: no-store`), so a page refresh always shows the current catalog. To try the endpoints by hand, use the demo console at `/demo/`.

**Contents**

- [Conventions](#conventions)
- [Authentication](#authentication)
- [Objects](#objects)
- [Featured ordering](#featured-ordering)
- [Public endpoints](#public-endpoints): catalog, stores, favorites, booking, try-on, impact
- [Store endpoints](#store-endpoints): dashboard, listings, inventory, bookings, hours and closures
- [Error codes](#error-codes)

## Conventions

| Topic | Rule |
|-------|------|
| Reading | `GET` endpoints take **query parameters** only. Browsers' `fetch()` refuses to send a body with `GET`. |
| Writing | `POST`, `PUT` and `DELETE` take a JSON body. Endpoints that create or edit a whole record wrap it: `{"booking": {...}}`, `{"item": {...}}`, `{"store": {...}}`, `{"closure": {...}}`. Small actions use flat bodies such as `{"item_id": "item-03", "status": "sold"}`. |
| Status codes | `200` OK, `201` created, `204` CORS preflight, `400` invalid input, `401` auth missing or wrong, `404` not found, `405` wrong method, `409` conflict (slot taken, item sold, limit reached), `500` server error. |
| Money | Prices are integers in cents (`price_cents: 6800`). Every item also has `price_display: "$68"`. |
| Dates and times | Dates are `YYYY-MM-DD` and times are 24-hour `HH:MM`, both in the store's timezone (`America/Los_Angeles`). Timestamps such as `listed_at` are ISO 8601. Bookings also include `date_label` ("Friday, November 13") and `time_label` ("2:00 pm") for display. |
| IDs | Stores use slugs (`second-story`). Items use `item-01`, `item-02`, … Bookings and closures use numbers. |
| Links | Item objects include `url: "item.html?item_id=item-01"`, so pages can link to a detail view built from the API. |

## Authentication

There are no user accounts. Three kinds of credentials cover everything:

| Who | How | Used for |
|-----|-----|----------|
| **Visitor** (any shopper) | `X-Visitor-Token` header. Get one from `POST /api/create-visitor` and keep it in `localStorage`. | Favorites, My Appointments, and optionally viewing or cancelling bookings made with that token. |
| **Booking holder** | The `confirmation_code` returned by `create-booking` (for example `RT-7K2Q9M`). Works like a password for that one booking. Not case-sensitive. | Viewing, rescheduling or cancelling one booking, even from another device. |
| **Store** | `X-Store-Id` and `X-Auth-Code` headers on every store request. Auth codes are stored hashed. | Everything under [Store endpoints](#store-endpoints). |

Visitor and store credentials go in headers because `GET` requests can't carry a body.

## Objects

### Errors

A failed request returns an `errors` array. If an error belongs to a form field, `field` names it, so the page can show the message under that field, set `aria-invalid="true"` on the control and announce it in the live region. Messages are written for shoppers and can go on the page unchanged. Validation reports all the invalid fields at once.

| Field | Type | Description |
|-------|------|-------------|
| `error_code` | string | A no-spaces code for the error. See [Error codes](#error-codes). |
| `field` | string or null | The form field the error belongs to, or `null` when it isn't tied to one field. |
| `message` | string | A user-readable message explaining what to do. |

```json
{
    "errors": [
        {
            "error_code": "NAME_REQUIRED",
            "field": "name",
            "message": "Please enter your name."
        },
        {
            "error_code": "EMAIL_INVALID",
            "field": "email",
            "message": "Enter a valid email address, such as name@example.com."
        }
    ]
}
```

### Item Object

A piece of clothing listed by a store.

| Field | Type | Description |
|-------|------|-------------|
| `item_id` | string | Unique ID, such as `"item-01"`. Assigned by the server. |
| `title` | string | Name of the piece. |
| `store` | object | `{store_id, name, neighborhood}`. `GET /api/item` returns the full [Store Object](#store-object) here instead. |
| `category` | string | One of `outerwear`, `tops`, `knitwear`, `dresses`, `denim`, `bottoms`, `accessories`. |
| `size` | string | One of `XS`, `S`, `M`, `L`, `XL`. |
| `price_cents` | number | Price in cents. |
| `price_display` | string | Formatted price, such as `"$68"`. |
| `condition` | string | One of `Excellent`, `Very good`, `Good`, `Fair`. |
| `material` | string or null | Fiber or fabric, if known. |
| `description` | string | Description of the piece. |
| `image` | string | Relative path to the photo. |
| `image_alt` | string | Alt text for the photo. Required on every listing. |
| `try_on_supported` | boolean | Whether the piece works with the try-on demo. |
| `status` | string | `available`, `held`, `sold` or `removed`. See [Inventory statuses](#inventory-statuses). |
| `status_label` | string | Display text: `"Available"`, `"On hold"`, `"Sold"`, `"Removed"`. |
| `is_bookable` | boolean | `true` only when `status` is `available`. |
| `pinned` | boolean | Whether the store pinned it to the top of Featured. |
| `listed_at` | string | When it was listed (ISO 8601). |
| `sold_at` | string or null | When it sold (ISO 8601). |
| `url` | string | Link to its detail page: `"item.html?item_id=item-01"`. |
| `is_favorite` | boolean | Only present when a valid `X-Visitor-Token` was sent. Use it for the heart button's `aria-pressed`. |
| `featured_score` | object | Only present with `sort=featured&explain=1`. See [Featured ordering](#featured-ordering). |
| `favorites_count`, `upcoming_bookings` | number | Only present on store endpoints. |

```json
{
    "item_id": "item-01",
    "title": "Brown Leather Jacket",
    "store": {
        "store_id": "second-story",
        "name": "Second Story Vintage",
        "neighborhood": "Mission District"
    },
    "category": "outerwear",
    "size": "M",
    "price_cents": 6800,
    "price_display": "$68",
    "condition": "Good",
    "material": null,
    "description": "A brown jacket with a broad collar and an easy layered fit.",
    "image": "assets/images/brown-jacket.jpg",
    "image_alt": "Brown leather jacket worn over a dark shirt",
    "try_on_supported": true,
    "status": "available",
    "status_label": "Available",
    "is_bookable": true,
    "pinned": true,
    "listed_at": "2026-11-04T18:38:23-08:00",
    "sold_at": null,
    "url": "item.html?item_id=item-01",
    "is_favorite": false
}
```

#### Inventory statuses

| Status | Explore (`/api/items`) | Detail (`/api/item`) | Favorites | Can be booked | Notes |
|--------|------------------------|----------------------|-----------|---------------|-------|
| `available` | Listed | Yes | Yes | Yes | The normal state. |
| `held` | Listed, with "On hold" | Yes | Yes | No | The store set it aside. Existing bookings are kept. Ranks lower in Featured. |
| `sold` | Hidden unless `status=sold` | Yes, shows "Sold" | Kept, flagged sold | No | Upcoming bookings are cancelled with `ITEM_SOLD`. Counts toward the impact stat. |
| `removed` | Hidden | `404` | Hidden | No | Archived by the store. Upcoming bookings are cancelled with `ITEM_REMOVED`. Still visible in the store's inventory. |

### Store Object

| Field | Type | Description |
|-------|------|-------------|
| `store_id` | string | Unique slug, such as `"second-story"`. |
| `name` | string | Store name. |
| `neighborhood` | string | Neighborhood, such as `"Mission District"`. |
| `address`, `city` | string | Street address and city. |
| `description` | string | Short description of what the store carries. |
| `image`, `image_alt` | string | Store photo and its alt text. |
| `hours` | Hours Object | Opening hours per weekday. |
| `hours_display` | string | Readable summary, such as `"Mon–Sat 11 am–7 pm · Sun 12–6 pm"` or `"Tue–Sun 10 am–6 pm · Closed Mon"`. |
| `slot_minutes` | number | Length of each try-on slot. |
| `slot_capacity` | number | How many try-ons the store can host in one slot (fitting rooms). |
| `url` | string | Link to the store on the Stores page. |
| `item_count` | number | Pieces listed (available and held). Present on `/api/stores` and `/api/store`. |
| `items` | Item Object[] | Only on `GET /api/store`. |
| `closures` | Closure Object[] | Only on `GET /api/store`: upcoming closures. |

**Hours Object.** Keys `mon` through `sun`. Each is either `null` (closed) or `{"open": "HH:MM", "close": "HH:MM"}`.

```json
{
    "mon": null,
    "tue": {"open": "10:00", "close": "18:00"},
    "wed": {"open": "10:00", "close": "18:00"},
    "thu": {"open": "10:00", "close": "18:00"},
    "fri": {"open": "10:00", "close": "18:00"},
    "sat": {"open": "10:00", "close": "18:00"},
    "sun": {"open": "10:00", "close": "18:00"}
}
```

### Slot Object

One bookable time on one day, from `GET /api/availability`.

| Field | Type | Description |
|-------|------|-------------|
| `time` | string | Start time, `HH:MM`. Send this as `time` when booking. |
| `label` | string | Ready-to-display text, including why it's unavailable: `"2:00 pm"`, `"11:00 am, fully booked"`. |
| `available` | boolean | Whether it can be booked. Disable the `<option>` when `false`. |
| `reason` | string or null | `PAST`, `CLOSED`, `FULLY_BOOKED` or `ITEM_BOOKED` (this piece is already booked at that time). |
| `spots_remaining` | number | Open places left in the slot. |

```json
{
    "time": "14:00",
    "label": "2:00 pm, fully booked",
    "available": false,
    "reason": "FULLY_BOOKED",
    "spots_remaining": 0
}
```

### Booking Object

An in-store try-on appointment.

| Field | Type | Description |
|-------|------|-------------|
| `booking_id` | number | Unique ID. |
| `status` | string | `confirmed`, `completed`, `no_show` or `cancelled`. |
| `status_label` | string | `"Confirmed"`, `"Completed"`, `"Missed"`, `"Cancelled"`. |
| `is_upcoming` | boolean | Confirmed and today or later. |
| `can_cancel` | boolean | Whether `cancel-booking` will accept it. Use it to show or hide the Cancel button. |
| `cancel_reason` | string or null | `CUSTOMER_CANCELLED`, `ITEM_SOLD`, `ITEM_REMOVED` or `STORE_CANCELLED`. |
| `cancel_message` | string or null | Display text for the reason, such as "This piece sold before your visit, so the appointment was cancelled." |
| `store_message` | string or null | Optional note from the store. |
| `date`, `date_label` | string | `"2026-11-13"` and `"Friday, November 13"`. |
| `time`, `time_label` | string | `"14:00"` and `"2:00 pm"`. |
| `name`, `email` | string | The shopper's details. |
| `notes` | string or null | The shopper's note to the store. |
| `item` | object | `{item_id, title, image, image_alt, price_display, size, condition, status, url}`. |
| `store` | object | `{store_id, name, address, city, hours_display}`. |
| `created_at` | string | When it was booked (ISO 8601). |

```json
{
    "booking_id": 3,
    "status": "confirmed",
    "status_label": "Confirmed",
    "is_upcoming": true,
    "can_cancel": true,
    "cancel_reason": null,
    "cancel_message": null,
    "store_message": null,
    "date": "2026-11-13",
    "date_label": "Friday, November 13",
    "time": "12:00",
    "time_label": "12:00 pm",
    "name": "Test Shopper",
    "email": "test@example.com",
    "notes": "Checking the fit.",
    "item": {
        "item_id": "item-02",
        "title": "Cream Knit Sweater",
        "image": "assets/images/cream-knit-sweater.jpg",
        "image_alt": "Cream knit sweater hanging on a wooden hanger",
        "price_display": "$48",
        "size": "M",
        "condition": "Excellent",
        "status": "available",
        "url": "item.html?item_id=item-02"
    },
    "store": {
        "store_id": "juniper-thread",
        "name": "Juniper & Thread",
        "address": "1632 Haight Street",
        "city": "San Francisco, CA",
        "hours_display": "Daily 11 am–6 pm"
    },
    "created_at": "2026-11-10T18:40:02-08:00"
}
```

### Closure Object

A day, or part of a day, when a store isn't taking try-ons.

| Field | Type | Description |
|-------|------|-------------|
| `closure_id` | number | Unique ID. |
| `store_id` | string | The store. |
| `date`, `date_label` | string | `"2026-11-16"` and `"Monday, November 16"`. |
| `all_day` | boolean | `true` when there are no start and end times. |
| `start_time`, `end_time` | string or null | `HH:MM` range, or `null` for all day. |
| `reason` | string or null | Shown to shoppers, for example `"Holiday"`. |

## Featured ordering

`sort=featured` is the default and matches the "Featured" option in the Explore dropdown. Each piece gets a score from the signals below; the weights are in `FEATURED_WEIGHTS` in `config.php`.

| Signal | Points | Why |
|--------|--------|-----|
| `pinned` | +100 | The store pinned it (up to 2 per store). |
| `freshness` | 30, minus 2 for each day listed (never below 0) | New arrivals surface first. |
| `interest` | 10 × ln(1 + favorites) + 15 × ln(1 + bookings in the last 14 days) | Popular pieces rise. The log keeps one very popular piece from taking over. |
| `try_on` | +5 | Promotes the try-on demo. |
| `held` | −20 | Still visible, but ranks below pieces you can book. |
| `personal` | +8 | Only with a visitor token: the piece shares a size or category with something the visitor saved. |

After scoring:

1. Pinned pieces come first, highest score first.
2. The rest take turns by store. Each round takes the best remaining piece from every store and sorts that round by score, so the first row of Explore mixes shops instead of showing one store's whole rack.
3. Ties go by `item_id`, so the order doesn't shuffle between refreshes.

Add `explain=1` to see each piece's breakdown:

```json
"featured_score": {
    "total": 123,
    "pinned": 100,
    "freshness": 18,
    "interest": 0,
    "try_on": 5,
    "held": 0,
    "personal": 0,
    "favorites": 0,
    "recent_bookings": 0
}
```

# Public endpoints

## GET /api/items

Lists the catalog. All filters are optional and can be combined. Only `available` and `held` pieces come back by default, so a piece that sold is gone on the next refresh.

**Query parameters**

| Param | Example | Description |
|-------|---------|-------------|
| `store_id` | `north-loop` | Only this store's pieces. |
| `category` | `outerwear` | See the Item Object for values. |
| `size` | `M` | See the Item Object for values. |
| `price` | `25-50`, `100+` | Preset range in whole dollars, matching the Explore dropdown values. The bottom is inclusive and the top exclusive, so $25 lands in `25-50`. |
| `price_min`, `price_max` | `20`, `60` | Custom range in dollars. Ignored if `price` is sent. |
| `q` | `leather jacket` | Searches title, description, category, material and store name. |
| `sort` | `featured` | `featured` (default), `price-low`, `price-high` or `recent`. These match the Explore sort `<option>` values. |
| `status` | `available,held,sold` | Comma-separated. Defaults to `available,held`. `removed` is never public. |
| `explain` | `1` | With `sort=featured`, adds `featured_score` to every item. |

**Headers (optional):** `X-Visitor-Token` adds `is_favorite` to each item and turns on the `personal` featured signal.

**Response**

```json
{
    "count": 9,
    "sort": "featured",
    "generated_at": "2026-11-10T18:38:24-08:00",
    "items": [ /* Item Objects */ ]
}
```

**Errors:** `INVALID_STATUS`, `STORE_NOT_FOUND`, `INVALID_CATEGORY`, `INVALID_SIZE`, `INVALID_PRICE_RANGE`, `INVALID_SORT` (all `400`, all reported together).

## GET /api/item

One piece, with its full Store Object. Sold pieces are returned with `status: "sold"` so old links and favorites can say "This piece has sold" instead of breaking. Removed pieces return `404`.

**Query parameters:** `item_id` (required).
**Headers (optional):** `X-Visitor-Token` adds `is_favorite`.

**Response**

```json
{
    "item": { /* Item Object, with "store" as a full Store Object */ }
}
```

**Errors:** `ITEM_ID_REQUIRED` (400), `ITEM_NOT_FOUND` (404).

## GET /api/filter-options

The options for each Explore dropdown, with how many listed pieces match each one.

**Response**

```json
{
    "stores": [{"value": "juniper-thread", "label": "Juniper & Thread", "item_count": 2}],
    "categories": [{"value": "outerwear", "label": "Outerwear", "item_count": 5}],
    "sizes": [{"value": "M", "label": "Medium", "item_count": 4}],
    "conditions": [{"value": "Good", "label": "Good", "item_count": 5}],
    "price_ranges": [{"value": "0-25", "label": "Under $25", "item_count": 1}],
    "sorts": [{"value": "featured", "label": "Featured"}]
}
```

## GET /api/stores

All stores, each with `item_count`.

**Response**

```json
{
    "count": 3,
    "stores": [ /* Store Objects */ ]
}
```

## GET /api/store

One store with its listed pieces (`items`) and upcoming closures (`closures`).

**Query parameters:** `store_id` (required).

**Response**

```json
{
    "store": { /* Store Object with items and closures */ }
}
```

**Errors:** `STORE_ID_REQUIRED` (400), `STORE_NOT_FOUND` (404).

## POST /api/create-visitor

Creates a guest visitor and returns its token. Call it once, keep the token in `localStorage`, and send it as `X-Visitor-Token` after that. It doesn't ask for any personal details.

**Response (201)**

```json
{
    "success": true,
    "visitor_token": "v_3f9a1c0e8b7d4a2f9c6e1b0a7d3f5e2c",
    "message": "Visitor created. Send this token as the X-Visitor-Token header."
}
```

## GET /api/favorites

The visitor's saved pieces, newest first. Sold pieces stay in the list with `status: "sold"`. Each item has `is_favorite: true` and `saved_at`.

**Headers:** `X-Visitor-Token` (required).

**Response**

```json
{
    "count": 1,
    "items": [ /* Item Objects */ ]
}
```

**Errors:** `VISITOR_TOKEN_REQUIRED`, `VISITOR_TOKEN_INVALID` (401).

## POST /api/add-favorite

Saves a piece. Saving one that's already saved isn't an error.

**Headers:** `X-Visitor-Token` (required).

**Request Body**

```json
{
    "item_id": "item-03"
}
```

**Response**

```json
{
    "success": true,
    "item_id": "item-03",
    "is_favorite": true,
    "already_saved": false,
    "message": "Blue Denim Jacket saved to Favorites."
}
```

**Errors:** `ITEM_ID_REQUIRED` (400), visitor errors (401), `ITEM_NOT_FOUND` (404), `ITEM_SOLD` (409).

## DELETE /api/remove-favorite

Removes a saved piece. Removing one that isn't saved isn't an error.

**Headers:** `X-Visitor-Token` (required).

**Request Body:** `{"item_id": "item-03"}` (or `?item_id=` in the URL).

**Response**

```json
{
    "success": true,
    "item_id": "item-03",
    "is_favorite": false,
    "removed": true,
    "message": "Removed from Favorites."
}
```

## GET /api/availability

Bookable slots for one day. Use it to fill the time `<select>` on the booking page: `label` is the option text and `available: false` means `disabled`.

**Query parameters**

| Param | Required | Description |
|-------|----------|-------------|
| `date` | Yes | `YYYY-MM-DD`, from today up to 30 days ahead (`BOOKING_WINDOW_DAYS`). |
| `item_id` | One of these | The store comes from the piece, and slots where the piece is already booked are marked `ITEM_BOOKED`. Preferred on the booking page. |
| `store_id` | One of these | A store's general availability. |

**Response**

```json
{
    "store_id": "juniper-thread",
    "item_id": "item-02",
    "date": "2026-11-11",
    "date_label": "Wednesday, November 11",
    "closed": false,
    "closed_reason": null,
    "available_count": 6,
    "slots": [ /* Slot Objects */ ]
}
```

When the store is closed that day, `closed` is `true`, `closed_reason` explains why ("The shop is closed on Mondays." or a closure's reason) and `slots` is empty.

**Errors:** `STORE_ID_REQUIRED`, `DATE_REQUIRED`, `DATE_INVALID`, `DATE_IN_PAST`, `DATE_OUT_OF_RANGE` (400), `ITEM_NOT_FOUND`, `STORE_NOT_FOUND` (404).

## POST /api/create-booking

Books an in-store try-on. The field names match the booking form's `data-field` names. Show the returned confirmation code on the confirmation page, since the shopper needs it to change or cancel later. The slot check and the insert run in one locked transaction, so two shoppers can't grab the last spot at the same moment.

**Headers (optional):** `X-Visitor-Token` links the booking to the visitor so it appears in My Appointments.

**Request Body**

```json
{
    "booking": {
        "item_id": "item-02",
        "name": "Test Shopper",
        "email": "test@example.com",
        "date": "2026-11-13",
        "time": "12:00",
        "notes": "Checking the fit."
    }
}
```

| Field | Required | Rules |
|-------|----------|-------|
| `item_id` | Yes | Must be `available`. |
| `name` | Yes | Up to 100 characters. |
| `email` | Yes | A valid email address. |
| `date` | Yes | Today up to 30 days ahead, on a day the store is open. |
| `time` | Yes | One of the `time` values from `/api/availability` that's `available`. |
| `notes` | No | Up to 500 characters. |

**Response (201)**

```json
{
    "success": true,
    "message": "Your try-on is confirmed for Friday, November 13 at 12:00 pm.",
    "booking_id": 3,
    "confirmation_code": "RT-7K2Q9M",
    "booking": { /* Booking Object */ }
}
```

**Response (Error)**

```json
{
    "errors": [
        {
            "error_code": "SLOT_UNAVAILABLE",
            "field": "time",
            "message": "That time just filled up. Choose one of the other available times."
        }
    ]
}
```

**Errors:** field errors `NAME_REQUIRED`, `NAME_TOO_LONG`, `EMAIL_REQUIRED`, `EMAIL_INVALID`, `DATE_*`, `TIME_REQUIRED`, `TIME_INVALID`, `NOTES_TOO_LONG` (400, reported together). `ITEM_NOT_FOUND` (404). `ITEM_UNAVAILABLE` (the piece is held or sold), `STORE_CLOSED`, `SLOT_UNAVAILABLE` (409).

## GET /api/booking

One booking, for the confirmation page or a "manage my booking" link.

**Query parameters:** `booking_id` (required) and `confirmation_code`.
**Headers:** instead of the code, the `X-Visitor-Token` that made the booking also works.

**Response**

```json
{
    "booking": { /* Booking Object */ }
}
```

**Errors:** `BOOKING_ID_REQUIRED` (400), `BOOKING_AUTH_REQUIRED`, `AUTH_FAILURE` (401). A missing booking also returns `AUTH_FAILURE`, so booking IDs can't be probed.

## GET /api/bookings

My Appointments: every booking made with this visitor token. Cancelled bookings are included so shoppers can see why (for example, the piece sold).

**Headers:** `X-Visitor-Token` (required).

**Query parameters:** `scope`, which is `upcoming` (default: today onward, soonest first), `past` (most recent first) or `all`.

**Response**

```json
{
    "count": 1,
    "scope": "upcoming",
    "bookings": [ /* Booking Objects */ ]
}
```

## PUT /api/cancel-booking

Cancels an upcoming confirmed booking and frees its slot. The booking is kept with `status: "cancelled"` and `cancel_reason: "CUSTOMER_CANCELLED"`. Ask the shopper to confirm before calling this.

**Request Body** (with the confirmation code)

```json
{
    "auth": {
        "booking_id": 3,
        "confirmation_code": "RT-7K2Q9M"
    }
}
```

Or, with the visitor token in the `X-Visitor-Token` header:

```json
{
    "booking_id": 3
}
```

**Response**

```json
{
    "success": true,
    "booking_id": 3,
    "message": "Your appointment has been cancelled.",
    "booking": { /* Booking Object */ }
}
```

**Errors:** auth errors (401), `BOOKING_NOT_CANCELLABLE` (409).

## PUT /api/modify-booking

Reschedules an upcoming booking or updates its note. Send only what changes. A new date or time is checked against availability, ignoring the booking's own current slot.

**Request Body**

```json
{
    "auth": {
        "booking_id": 3,
        "confirmation_code": "RT-7K2Q9M"
    },
    "booking": {
        "date": "2026-11-14",
        "time": "15:00",
        "notes": "Bringing a friend."
    }
}
```

(With `X-Visitor-Token`, `auth` can be just `{"booking_id": 3}`.)

**Response**

```json
{
    "success": true,
    "booking_id": 3,
    "message": "Your appointment is now Saturday, November 14 at 3:00 pm.",
    "booking": { /* Booking Object */ }
}
```

**Errors:** `NO_CHANGES`, field errors (400), auth errors (401), `BOOKING_NOT_MODIFIABLE`, `ITEM_UNAVAILABLE`, `STORE_CLOSED`, `SLOT_UNAVAILABLE` (409).

## GET /api/try-on-options

Sample models and the pieces that work with the simulated try-on. Always `is_demo: true`.

**Response**

```json
{
    "is_demo": true,
    "notice": "Simulated try-on for a class demo. No camera, photo upload or AI processing is used.",
    "models": [
        {
            "model_id": "model-01",
            "label": "Sample model A",
            "description": "Example model for the try-on demo. Not a real customer.",
            "image": "assets/images/rust-floral-dress.jpg",
            "image_alt": "Model wearing a rust-colored floral dress"
        }
    ],
    "items": [ /* Item Objects with try_on_supported: true */ ]
}
```

## GET /api/try-on-result

The result for a model and a piece. If a composite image has been made for that pair (added to `try_on_results` through `data/sample-try-on.json`), `result_type` is `"composite"`. Otherwise the piece's own photo comes back as a `"styling_reference"`, with alt text saying it isn't a generated try-on.

**Query parameters:** `model_id`, `item_id` (both required).

**Response**

```json
{
    "is_demo": true,
    "result_type": "styling_reference",
    "image": "assets/images/brown-jacket.jpg",
    "image_alt": "Styling reference: Brown leather jacket worn over a dark shirt. Not a generated try-on.",
    "notice": "Simulated result for a class demo. It does not show how the piece would fit you.",
    "model": { /* model */ },
    "item": { /* Item Object */ }
}
```

**Errors:** `MODEL_ID_REQUIRED`, `ITEM_ID_REQUIRED`, `TRY_ON_UNSUPPORTED` (400), `MODEL_NOT_FOUND`, `ITEM_NOT_FOUND` (404).

## GET /api/impact

Sustainability numbers for the Home and Learn pages, recalculated on every request. Each sold piece counts as one garment kept in use. The CO₂ and water figures come from rough per-category estimates in `IMPACT_ESTIMATES` (`config.php`), and the response flags them as estimates.

**Response**

```json
{
    "pieces_rehomed": 1,
    "try_ons_booked": 2,
    "active_listings": 9,
    "stores": 3,
    "estimated_co2_kg_saved": 20,
    "estimated_water_liters_saved": 5000,
    "is_estimate": true,
    "methodology": "Each sold piece counts as one garment kept in use. CO2 and water figures are rough per-garment averages by category for a classroom demo, not measured values.",
    "generated_at": "2026-11-10T18:38:24-08:00"
}
```

# Store endpoints

Every store endpoint needs both headers:

```
X-Store-Id: second-story
X-Auth-Code: <the store's auth code>
```

Missing headers return `401 STORE_AUTH_REQUIRED` and wrong credentials return `401 AUTH_FAILURE`. A store can only see and change its own items, bookings and closures. Anything belonging to another store answers `404`, as if it didn't exist.

## POST /api/store-login

Checks the credentials and returns the store's profile. The server doesn't keep a session, so hold on to the two header values and send them with every store request.

**Response**

```json
{
    "success": true,
    "message": "Signed in as Second Story Vintage.",
    "store": { /* Store Object */ }
}
```

## GET /api/store-summary

Counts for the top of the dashboard.

**Response**

```json
{
    "store_id": "second-story",
    "listings": {"available": 3, "held": 1, "sold": 0, "removed": 0},
    "sold_last_7_days": 0,
    "bookings_today": 0,
    "upcoming_bookings": 0,
    "pinned_count": 1,
    "pinned_limit": 2,
    "generated_at": "2026-11-10T18:38:24-08:00"
}
```

## GET /api/store-items

The store's own inventory, newest first. Each item also has `favorites_count` and `upcoming_bookings`.

**Query parameters:** `status`, comma-separated. Defaults to `available,held,sold`. Add `removed` to see archived listings.

**Response**

```json
{
    "count": 4,
    "items": [ /* Item Objects with favorites_count and upcoming_bookings */ ]
}
```

## POST /api/create-item

Adds a listing. It's `available` and shows on Explore immediately. The photo is sent as a base64 data URL; the server checks the actual file contents (JPG, PNG or WEBP, up to 5 MB), saves it to `uploads/items/`, and stores only the path.

**Request Body**

```json
{
    "item": {
        "title": "Camel Wool Coat",
        "category": "outerwear",
        "size": "M",
        "price_cents": 8800,
        "condition": "Very good",
        "material": "Wool",
        "description": "A camel wool coat with a long straight cut.",
        "image_b64": "data:image/jpeg;base64,/9j/4AAQSkZJRgAB...",
        "image_alt": "Camel wool coat on a wooden hanger",
        "try_on_supported": false
    }
}
```

| Field | Required | Rules |
|-------|----------|-------|
| `title` | Yes | Up to 80 characters. |
| `category`, `size`, `condition` | Yes | One of the values listed in the Item Object. |
| `price_cents` | Yes | Whole number from 100 ($1) to 1,000,000 ($10,000). |
| `description` | Yes | 10 to 1,000 characters. |
| `image_b64` | Yes | `data:image/(jpeg\|png\|webp);base64,...`, up to 5 MB. |
| `image_alt` | Yes | 5 to 250 characters, and it shouldn't start with "Image of" or "Photo of" (screen readers already say it's an image). |
| `material` | No | Up to 80 characters. |
| `try_on_supported` | No | Boolean, default `false`. |

**Response (201)**

```json
{
    "success": true,
    "message": "Camel Wool Coat is now listed.",
    "item_id": "item-11",
    "item": { /* Item Object */ }
}
```

**Errors:** `TITLE_REQUIRED`, `TITLE_TOO_LONG`, `CATEGORY_INVALID`, `SIZE_INVALID`, `CONDITION_INVALID`, `PRICE_INVALID`, `DESCRIPTION_REQUIRED`, `DESCRIPTION_TOO_LONG`, `MATERIAL_TOO_LONG`, `IMAGE_REQUIRED`, `IMAGE_INVALID`, `IMAGE_TOO_LARGE`, `IMAGE_ALT_REQUIRED`, `IMAGE_ALT_LENGTH`, `IMAGE_ALT_REDUNDANT` (400, reported together).

## PUT /api/modify-item

Edits a listing. Send only the fields that change. A new `image_b64` must come with a new `image_alt`; the old photo file is deleted. Status can't be changed here (use `update-item-status`, which also updates bookings).

**Request Body**

```json
{
    "item_id": "item-11",
    "item": {
        "price_cents": 7900,
        "description": "A camel wool coat with a long straight cut. Small mark inside the left cuff."
    }
}
```

**Response**

```json
{
    "success": true,
    "message": "Listing updated.",
    "item_id": "item-11",
    "item": { /* Item Object */ }
}
```

**Errors:** `NO_CHANGES`, `USE_STATUS_ENDPOINT`, any `create-item` field error (400), `ITEM_NOT_FOUND` (404).

## PUT /api/update-item-status

Marks a piece `available`, `held` or `sold`, and applies the side effects in one transaction:

| New status | What also happens |
|------------|-------------------|
| `sold` | Records `sold_at`, unpins it, and cancels its upcoming confirmed bookings with `ITEM_SOLD`. Explore drops it on the next refresh; Favorites keep it, flagged sold; the impact stat goes up. |
| `held` | No new bookings can be made. Existing bookings are kept, since the hold may be for that shopper. |
| `available` | Bookable again. Clears `sold_at` if it had been marked sold by mistake. Also restores an archived (`removed`) listing. |

**Request Body**

```json
{
    "item_id": "item-03",
    "status": "sold"
}
```

**Response**

```json
{
    "success": true,
    "message": "Marked sold. It will drop off Explore on the next refresh. 1 upcoming booking(s) were cancelled.",
    "item_id": "item-03",
    "previous_status": "available",
    "status": "sold",
    "cancelled_bookings": [4],
    "item": { /* Item Object */ }
}
```

**Errors:** `INVALID_STATUS` (400), `ITEM_NOT_FOUND` (404).

## DELETE /api/delete-item

Archives a listing (`status: "removed"`). It disappears from the public site and its upcoming bookings are cancelled with `ITEM_REMOVED`, but the row is kept so booking history still makes sense. Restore it with `update-item-status`.

**Request Body:** `{"item_id": "item-11"}`

**Response**

```json
{
    "success": true,
    "message": "Listing archived.",
    "item_id": "item-11",
    "status": "removed",
    "cancelled_bookings": []
}
```

**Errors:** `ITEM_NOT_FOUND` (404), `ALREADY_REMOVED` (409).

## PUT /api/set-featured

Pins or unpins a piece. Pinned pieces lead the Featured sort. Each store can pin up to 2 (`MAX_PINNED_PER_STORE`). Selling or archiving a piece unpins it automatically.

**Request Body**

```json
{
    "item_id": "item-11",
    "pinned": true
}
```

**Response**

```json
{
    "success": true,
    "message": "Pinned to the top of Featured.",
    "item_id": "item-11",
    "pinned": true
}
```

**Errors:** `PINNED_REQUIRED` (400), `ITEM_NOT_FOUND` (404), `ITEM_NOT_PINNABLE`, `PIN_LIMIT_REACHED` (409).

## GET /api/store-bookings

The store's try-on appointments, including the shoppers' contact details.

**Query parameters**

| Param | Description |
|-------|-------------|
| `scope` | `upcoming` (default, soonest first), `past` or `all`. Defaults to `all` when `date` is sent. |
| `date` | Only this day, `YYYY-MM-DD`. |
| `status` | `confirmed`, `completed`, `no_show` or `cancelled`. |

**Response**

```json
{
    "count": 2,
    "scope": "upcoming",
    "bookings": [ /* Booking Objects */ ]
}
```

## PUT /api/update-booking-status

Records how an appointment went. `completed` with `"item_sold": true` also marks the piece sold, with the same side effects as `update-item-status`, so the visit and the sale go in together. `cancelled` sets `cancel_reason: "STORE_CANCELLED"`. A cancelled booking can't be set back to `confirmed`, since its slot may have been given away.

**Request Body**

```json
{
    "booking_id": 1,
    "status": "completed",
    "item_sold": true,
    "store_message": "Thanks for stopping by!"
}
```

**Response**

```json
{
    "success": true,
    "message": "Booking marked completed. The piece is now marked sold.",
    "booking": { /* Booking Object */ },
    "cancelled_bookings": []
}
```

`cancelled_bookings` lists other bookings for the same piece that were cancelled because it sold.

**Errors:** `BOOKING_ID_REQUIRED`, `INVALID_STATUS`, `MESSAGE_TOO_LONG`, `ITEM_SOLD_NEEDS_COMPLETED` (400), `BOOKING_NOT_FOUND` (404), `BOOKING_CANCELLED` (409).

## PUT /api/modify-store

Edits the store's public details, hours and booking slots. Send only what changes. Existing bookings are kept even if they now fall outside the new hours.

**Request Body**

```json
{
    "store": {
        "description": "Everyday staples and easy outerwear.",
        "hours": {
            "mon": null,
            "tue": {"open": "10:00", "close": "18:00"},
            "wed": {"open": "10:00", "close": "18:00"},
            "thu": {"open": "10:00", "close": "20:00"},
            "fri": {"open": "10:00", "close": "20:00"},
            "sat": {"open": "10:00", "close": "18:00"},
            "sun": {"open": "10:00", "close": "18:00"}
        },
        "slot_minutes": 30,
        "slot_capacity": 3
    }
}
```

Editable fields: `name`, `neighborhood`, `address`, `city`, `description`, `image_alt`, `hours` (all seven days), `slot_minutes` (15, 20, 30, 45, 60, 90 or 120), `slot_capacity` (1 to 20).

**Response**

```json
{
    "success": true,
    "message": "Store details updated. Existing bookings are kept even if they now fall outside your hours.",
    "store": { /* Store Object */ }
}
```

**Errors:** `NO_CHANGES`, `<FIELD>_INVALID`, `IMAGE_ALT_*`, `HOURS_INVALID`, `SLOT_MINUTES_INVALID`, `SLOT_CAPACITY_INVALID`, `UNKNOWN_FIELD` (400).

## GET /api/store-closures

The store's upcoming closures.

**Response**

```json
{
    "count": 1,
    "closures": [ /* Closure Objects */ ]
}
```

## POST /api/create-closure

Blocks off a whole day (leave out the times) or part of one. Those slots show as `CLOSED` in availability. Bookings already in that window stay booked. They come back in `conflicting_bookings` so the store can contact those shoppers.

**Request Body**

```json
{
    "closure": {
        "date": "2026-11-26",
        "start_time": "13:00",
        "end_time": "15:00",
        "reason": "Closed for Thanksgiving afternoon"
    }
}
```

**Response (201)**

```json
{
    "success": true,
    "message": "Closure added.",
    "closure": { /* Closure Object */ },
    "conflicting_bookings": []
}
```

**Errors:** `DATE_INVALID`, `DATE_IN_PAST`, `TIME_RANGE_INCOMPLETE`, `TIME_RANGE_INVALID`, `REASON_TOO_LONG` (400).

## DELETE /api/delete-closure

Removes a closure so those times can be booked again.

**Request Body:** `{"closure_id": 1}`

**Response**

```json
{
    "success": true,
    "message": "Closure removed.",
    "closure_id": 1
}
```

**Errors:** `CLOSURE_ID_REQUIRED` (400), `CLOSURE_NOT_FOUND` (404).

# Error codes

Codes shared across endpoints:

| Code | Status | Meaning |
|------|--------|---------|
| `METHOD_NOT_ALLOWED` | 405 | Wrong HTTP method for this endpoint. The `Allow` header lists the right one. |
| `INVALID_JSON` | 400 | The body isn't a JSON object. |
| `ENDPOINT_NOT_FOUND` | 404 | No endpoint at that path. |
| `FORBIDDEN` | 403 | An internal file was requested (config, database, tests). |
| `VISITOR_TOKEN_REQUIRED` / `VISITOR_TOKEN_INVALID` | 401 | Missing or unknown `X-Visitor-Token`. |
| `STORE_AUTH_REQUIRED` | 401 | Missing `X-Store-Id` or `X-Auth-Code`. |
| `AUTH_FAILURE` | 401 | Wrong store auth code, or wrong booking ID / confirmation code. |
| `BOOKING_AUTH_REQUIRED` | 401 | No confirmation code or visitor token sent for a booking. |
| `ITEM_NOT_FOUND` / `STORE_NOT_FOUND` | 404 | No such item or store (or it belongs to another store). |
| `ITEM_UNAVAILABLE` | 409 | The piece is held or sold, so it can't be booked. |
| `SLOT_UNAVAILABLE` | 409 | The chosen time is past, closed, full, or the piece is already booked then. |
| `STORE_CLOSED` | 409 | The store is closed on the chosen date. |
| `SERVER_ERROR` | 500 | Something unexpected happened. Details go to the PHP error log, never to the response. |
