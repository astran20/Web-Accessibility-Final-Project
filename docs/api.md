# API Documentation
All endpoints live at `/api/<name>` and return JSON. `GET` endpoints read from query parameters, and everything else reads a JSON body. Prices are in cents, dates are `YYYY-MM-DD` and times are 24-hour `HH:MM` in Pacific time. You can try any endpoint by hand from the demo console at `/demo/`.

## Objects
### Errors
An array of error objects returned when a request fails. Validation reports every bad field at once. The messages are written for shoppers, so the page can show them without changes.

**Error Fields**
| Field        | Type           | Description                                                        |
|--------------|----------------|--------------------------------------------------------------------|
| "error_code" | string         | A no-spaces code for the error. See [Error Codes](#error-codes).   |
| "field"      | string or null | The form field the error belongs to, or null if it isn't one field. |
| "message"    | string         | A user-readable message explaining what to fix.                    |

Use "field" to put the message under the right input and set `aria-invalid="true"` on it.

**Error Example**
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

### Auth
There are no user accounts. Three kinds of credentials cover every endpoint.

**Auth Types**
| Who            | How                                              | Used for                                         |
|----------------|--------------------------------------------------|--------------------------------------------------|
| Visitor        | "X-Visitor-Token" header from `POST /api/create-visitor` | Favorites and My Appointments                |
| Booking holder | "confirmation_code" from `POST /api/create-booking` | Viewing, changing or cancelling one booking   |
| Store          | "X-Store-Id" and "X-Auth-Code" headers           | Every store endpoint                             |

Visitor and store credentials go in headers because `GET` requests can't carry a body. Confirmation codes aren't case-sensitive.

**Booking Auth Object**
Sent as "auth" when changing or cancelling a booking. With a visitor token in the header, "confirmation_code" can be left out.

| Field               | Type   | Required | Description                                   |
|---------------------|--------|----------|-----------------------------------------------|
| "booking_id"        | number | Yes      | The booking being changed.                    |
| "confirmation_code" | string | See desc | The code from create-booking. Not needed when the visitor token that made the booking is sent. |

**Booking Auth Example**
```json
{
    "booking_id": 3,
    "confirmation_code": "RT-7K2Q9M"
}
```

### Item Object
A piece of clothing listed by a store.

**Item Fields**
| Field              | Type           | Description                                                        |
|--------------------|----------------|--------------------------------------------------------------------|
| "item_id"          | string         | Unique ID like "item-01". Read only; assigned by server.           |
| "title"            | string         | Name of the piece.                                                 |
| "store"            | object         | {store_id, name, neighborhood}. `GET /api/item` returns the full Store Object here. |
| "category"         | string         | outerwear, tops, knitwear, dresses, denim, bottoms or accessories. |
| "size"             | string         | XS, S, M, L or XL.                                                 |
| "price_cents"      | number         | Price in cents.                                                    |
| "price_display"    | string         | Formatted price, like "$68".                                       |
| "condition"        | string         | Excellent, Very good, Good or Fair.                                |
| "material"         | string or null | Fabric, if known.                                                  |
| "description"      | string         | Description of the piece.                                          |
| "image"            | string         | Relative path to the photo.                                        |
| "image_alt"        | string         | Alt text for the photo. Required on every listing.                 |
| "try_on_supported" | boolean        | Whether the piece works with the try-on demo.                      |
| "status"           | string         | available, held, sold or removed. See [Item Statuses](#item-statuses). |
| "status_label"     | string         | "Available", "On hold", "Sold" or "Removed".                       |
| "is_bookable"      | boolean        | True only when status is available.                                |
| "pinned"           | boolean        | Whether the store pinned it to the top of Featured.                |
| "listed_at"        | string         | When it was listed (ISO 8601).                                     |
| "sold_at"          | string or null | When it sold (ISO 8601).                                           |
| "url"              | string         | Link to its detail page, like "item.html?item_id=item-01".         |
| "is_favorite"      | boolean        | Only sent with a valid visitor token. Use it for the heart button's `aria-pressed`. |
| "featured_score"   | object         | Only sent with `sort=featured&explain=1`. See [Featured Sort](#featured-sort). |
| "favorites_count", "upcoming_bookings" | number | Only sent on store endpoints.                      |

**Item Example**
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

### Item Statuses
How each status shows up on the site.

| Status      | Explore                   | Detail page   | Favorites          | Bookable | Upcoming bookings          |
|-------------|---------------------------|---------------|--------------------|----------|----------------------------|
| "available" | Listed                    | Yes           | Yes                | Yes      | Kept                       |
| "held"      | Listed as "On hold"       | Yes           | Yes                | No       | Kept                       |
| "sold"      | Hidden unless status=sold | Shows "Sold"  | Kept, flagged sold | No       | Cancelled with ITEM_SOLD   |
| "removed"   | Hidden                    | 404           | Hidden             | No       | Cancelled with ITEM_REMOVED |

### Store Object
A thrift store and its booking settings.

**Store Fields**
| Field                  | Type             | Description                                                  |
|------------------------|------------------|--------------------------------------------------------------|
| "store_id"             | string           | Unique slug like "second-story".                             |
| "name"                 | string           | Store name.                                                  |
| "neighborhood"         | string           | Neighborhood, like "Mission District".                       |
| "address", "city"      | string           | Street address and city.                                     |
| "description"          | string           | What the store carries.                                      |
| "image", "image_alt"   | string           | Store photo and its alt text.                                |
| "hours"                | Hours Object     | Opening hours for each weekday.                              |
| "hours_display"        | string           | Readable summary, like "Tue–Sun 10 am–6 pm · Closed Mon".    |
| "slot_minutes"         | number           | Length of each try-on slot.                                  |
| "slot_capacity"        | number           | How many try-ons fit in one slot.                            |
| "url"                  | string           | Link to the store on the Stores page.                        |
| "item_count"           | number           | Available and held pieces. Sent by /api/stores and /api/store. |
| "items"                | Item Object[]    | Only sent by `GET /api/store`.                               |
| "closures"             | Closure Object[] | Upcoming closures. Only sent by `GET /api/store`.            |

**Hours Object**
Keys "mon" through "sun". Each is null when the store is closed, or an open and close time.

**Hours Example**
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

**Slot Fields**
| Field             | Type           | Description                                                      |
|-------------------|----------------|------------------------------------------------------------------|
| "time"            | string         | Start time. Send this as "time" when booking.                    |
| "label"           | string         | Option text, like "2:00 pm" or "11:00 am, fully booked".         |
| "available"       | boolean        | Whether it can be booked. Disable the `<option>` when false.     |
| "reason"          | string or null | PAST, CLOSED, FULLY_BOOKED or ITEM_BOOKED.                       |
| "spots_remaining" | number         | Open places left in the slot.                                    |

**Slot Example**
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

**Booking Fields**
| Field                  | Type           | Description                                                  |
|------------------------|----------------|--------------------------------------------------------------|
| "booking_id"           | number         | Unique ID. Read only; assigned by server.                    |
| "status"               | string         | confirmed, completed, no_show or cancelled.                  |
| "status_label"         | string         | "Confirmed", "Completed", "Missed" or "Cancelled".           |
| "is_upcoming"          | boolean        | Confirmed and today or later.                                |
| "can_cancel"           | boolean        | Whether cancel-booking will accept it. Use it to show or hide the Cancel button. |
| "cancel_reason"        | string or null | CUSTOMER_CANCELLED, ITEM_SOLD, ITEM_REMOVED or STORE_CANCELLED. |
| "cancel_message"       | string or null | Display text for the cancel reason.                          |
| "store_message"        | string or null | Optional note from the store.                                |
| "date", "date_label"   | string         | "2026-11-13" and "Friday, November 13".                      |
| "time", "time_label"   | string         | "14:00" and "2:00 pm".                                       |
| "name", "email"        | string         | The shopper's details.                                       |
| "notes"                | string or null | The shopper's note to the store.                             |
| "item"                 | object         | {item_id, title, image, image_alt, price_display, size, condition, status, url} |
| "store"                | object         | {store_id, name, address, city, hours_display}               |
| "created_at"           | string         | When it was booked (ISO 8601).                               |

**Booking Example**
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

**Closure Fields**
| Field                      | Type           | Description                                   |
|----------------------------|----------------|-----------------------------------------------|
| "closure_id"               | number         | Unique ID. Read only; assigned by server.     |
| "store_id"                 | string         | The store.                                    |
| "date", "date_label"       | string         | "2026-11-16" and "Monday, November 16".       |
| "all_day"                  | boolean        | True when there are no start and end times.   |
| "start_time", "end_time"   | string or null | Time range, or null for all day.              |
| "reason"                   | string or null | Shown to shoppers, like "Holiday".            |

**Closure Example**
```json
{
    "closure_id": 1,
    "store_id": "second-story",
    "date": "2026-11-26",
    "date_label": "Thursday, November 26",
    "all_day": false,
    "start_time": "13:00",
    "end_time": "15:00",
    "reason": "Closed for Thanksgiving afternoon"
}
```

## Featured Sort
`sort=featured` is the default on Explore. Each piece gets a score from these signals. The weights live in FEATURED_WEIGHTS in `config.php`.

| Signal      | Points                                                        |
|-------------|---------------------------------------------------------------|
| "pinned"    | +100 if the store pinned it (up to 2 per store)               |
| "freshness" | 30, minus 2 for each day it's been listed, never below 0      |
| "interest"  | 10 × ln(1 + favorites) + 15 × ln(1 + bookings in the last 14 days) |
| "try_on"    | +5 if it works with the try-on demo                           |
| "held"      | −20 if it's on hold                                           |
| "personal"  | +8 if it shares a size or category with something the visitor saved (visitor token only) |

Pinned pieces go first. The rest are dealt out one store at a time, best piece from each store per round, so the top row of Explore mixes shops. Ties go by "item_id" so the order stays put between refreshes. Add `explain=1` to get each piece's breakdown.

**Featured Score Example**
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

# Public Endpoints

## GET /api/items
Gets the catalog. Only available and held pieces come back unless you ask for others, so a sold piece drops off on the next refresh. A visitor token adds "is_favorite" to each item.

**Query Parameters**
| Param                    | Example               | Description                                                   |
|--------------------------|-----------------------|---------------------------------------------------------------|
| "store_id"               | north-loop            | Only this store's pieces.                                     |
| "category"               | outerwear             | Any category from the Item Object.                            |
| "size"                   | M                     | Any size from the Item Object.                                |
| "price"                  | 25-50, 100+           | Preset range in dollars. Bottom inclusive, top exclusive.     |
| "price_min", "price_max" | 20, 60                | Custom range in dollars. Ignored if "price" is sent.          |
| "q"                      | leather jacket        | Searches title, description, category, material and store name. |
| "sort"                   | featured              | featured (default), price-low, price-high or recent.          |
| "status"                 | available,held,sold   | Comma-separated. Defaults to available,held. removed is never public. |
| "explain"                | 1                     | Adds "featured_score" to every item.                          |

**Response**
```json
{
    "count": 9,
    "sort": "featured",
    "generated_at": "2026-11-10T18:38:24-08:00",
    "items": [ /* Item Objects */ ]
}
```

**Errors:** INVALID_STATUS, STORE_NOT_FOUND, INVALID_CATEGORY, INVALID_SIZE, INVALID_PRICE_RANGE, INVALID_SORT (400)

## GET /api/item
Gets one piece with its full Store Object. Takes `item_id` as a query parameter. Sold pieces still come back so old links can say the piece sold. Removed pieces return 404.

**Response**
```json
{
    "item": { /* Item Object */ }
}
```

**Errors:** ITEM_ID_REQUIRED (400), ITEM_NOT_FOUND (404)

## GET /api/filter-options
Gets the choices for each Explore dropdown and how many listed pieces match each one.

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
Gets every store as a Store Object.

**Response**
```json
{
    "count": 3,
    "stores": [ /* Store Objects */ ]
}
```

## GET /api/store
Gets one store with its listed pieces and upcoming closures. Takes `store_id` as a query parameter.

**Response**
```json
{
    "store": { /* Store Object with items and closures */ }
}
```

**Errors:** STORE_ID_REQUIRED (400), STORE_NOT_FOUND (404)

## POST /api/create-visitor
Creates a guest visitor and returns its token. Call it once, save the token in `localStorage`, and send it as "X-Visitor-Token" from then on. It doesn't take a body.

**Response**
```json
{
    "success": true,
    "visitor_token": "v_3f9a1c0e8b7d4a2f9c6e1b0a7d3f5e2c",
    "message": "Visitor created. Send this token as the X-Visitor-Token header."
}
```

## GET /api/favorites
Gets the visitor's saved pieces, newest first. Needs a visitor token. Sold pieces stay in the list with status "sold".

**Response**
```json
{
    "count": 1,
    "items": [ /* Item Objects with "saved_at" */ ]
}
```

**Errors:** VISITOR_TOKEN_REQUIRED, VISITOR_TOKEN_INVALID (401)

## POST /api/add-favorite
Saves a piece to the visitor's favorites. Needs a visitor token. Saving something twice isn't an error.

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

**Errors:** ITEM_ID_REQUIRED (400), visitor token errors (401), ITEM_NOT_FOUND (404), ITEM_SOLD (409)

## DELETE /api/remove-favorite
Removes a saved piece. Needs a visitor token. Takes the same body as add-favorite, or `?item_id=` in the URL.

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
Gets the bookable slots for one day. Use "label" as the option text and disable any slot where "available" is false.

**Query Parameters**
| Param      | Required    | Description                                                     |
|------------|-------------|-----------------------------------------------------------------|
| "date"     | Yes         | Today up to 30 days out (BOOKING_WINDOW_DAYS).                  |
| "item_id"  | One of these | Uses the piece's store and marks slots where it's already booked. Use this on the booking page. |
| "store_id" | One of these | A store's general availability.                                |

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

When the store is closed that day, "closed" is true, "closed_reason" says why and "slots" is empty.

**Errors:** STORE_ID_REQUIRED, DATE_REQUIRED, DATE_INVALID, DATE_IN_PAST, DATE_OUT_OF_RANGE (400), ITEM_NOT_FOUND, STORE_NOT_FOUND (404)

## POST /api/create-booking
Books an in-store try-on and returns a confirmation code. Show the code on the confirmation page, since the shopper needs it to change or cancel later. A visitor token is optional and puts the booking in My Appointments.

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

**Booking Fields**
| Field     | Required | Rules                                                 |
|-----------|----------|-------------------------------------------------------|
| "item_id" | Yes      | Must be available.                                    |
| "name"    | Yes      | Up to 100 characters.                                 |
| "email"   | Yes      | A valid email address.                                |
| "date"    | Yes      | Today up to 30 days out, on a day the store is open.  |
| "time"    | Yes      | An available "time" from /api/availability.           |
| "notes"   | No       | Up to 500 characters.                                 |

**Response (Success)**
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

**Errors:** NAME_REQUIRED, NAME_TOO_LONG, EMAIL_REQUIRED, EMAIL_INVALID, DATE_*, TIME_REQUIRED, TIME_INVALID, NOTES_TOO_LONG (400), ITEM_NOT_FOUND (404), ITEM_UNAVAILABLE, STORE_CLOSED, SLOT_UNAVAILABLE (409)

## GET /api/booking
Gets one booking. Takes `booking_id` and `confirmation_code` as query parameters. The visitor token that made the booking works in place of the code.

**Response**
```json
{
    "booking": { /* Booking Object */ }
}
```

**Errors:** BOOKING_ID_REQUIRED (400), BOOKING_AUTH_REQUIRED, AUTH_FAILURE (401). A booking that doesn't exist also returns AUTH_FAILURE.

## GET /api/bookings
Gets every booking made with the visitor's token, for My Appointments. Cancelled bookings are included so the shopper can see why. Takes an optional `scope`: upcoming (default), past or all.

**Response**
```json
{
    "count": 1,
    "scope": "upcoming",
    "bookings": [ /* Booking Objects */ ]
}
```

## PUT /api/cancel-booking
Cancels an upcoming booking and frees its slot. The booking is kept with status "cancelled".

**Request Body**
```json
{
    "auth": {
        "booking_id": 3,
        "confirmation_code": "RT-7K2Q9M"
    }
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

**Errors:** auth errors (401), BOOKING_NOT_CANCELLABLE (409)

## PUT /api/modify-booking
Reschedules an upcoming booking or changes its note. Only send the fields that change.

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

**Response**
```json
{
    "success": true,
    "booking_id": 3,
    "message": "Your appointment is now Saturday, November 14 at 3:00 pm.",
    "booking": { /* Booking Object */ }
}
```

**Errors:** NO_CHANGES, field errors (400), auth errors (401), BOOKING_NOT_MODIFIABLE, ITEM_UNAVAILABLE, STORE_CLOSED, SLOT_UNAVAILABLE (409)

## GET /api/try-on-options
Gets the sample models and the pieces that work with the simulated try-on.

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
Gets the try-on result for a model and a piece. Takes `model_id` and `item_id` as query parameters. If there's a composite image for that pair, "result_type" is "composite". Otherwise it returns the piece's own photo as a "styling_reference".

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

**Errors:** MODEL_ID_REQUIRED, ITEM_ID_REQUIRED, TRY_ON_UNSUPPORTED (400), MODEL_NOT_FOUND, ITEM_NOT_FOUND (404)

## GET /api/impact
Gets the sustainability numbers for the Home and Learn pages. Each sold piece counts as one garment kept in use. The CO2 and water numbers are rough averages from IMPACT_ESTIMATES in `config.php`.

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

# Store Endpoints
Every store endpoint needs these two headers. A store can only see its own items, bookings and closures, and anything from another store returns 404.

```
X-Store-Id: second-story
X-Auth-Code: <the store's auth code>
```

## POST /api/store-login
Checks the store's credentials and returns its profile. There's no session, so keep sending both headers on every request.

**Response**
```json
{
    "success": true,
    "message": "Signed in as Second Story Vintage.",
    "store": { /* Store Object */ }
}
```

## GET /api/store-summary
Gets the counts for the top of the store dashboard.

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
Gets the store's own inventory, newest first. Takes an optional comma-separated `status` that defaults to available,held,sold. Add removed to see archived listings.

**Response**
```json
{
    "count": 4,
    "items": [ /* Item Objects with favorites_count and upcoming_bookings */ ]
}
```

## POST /api/create-item
Creates a new listing. It shows up on Explore right away. The photo is sent as a base64 data URL and saved to `uploads/items/`.

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

**Item Fields**
| Field                             | Required | Rules                                                   |
|-----------------------------------|----------|---------------------------------------------------------|
| "title"                           | Yes      | Up to 80 characters.                                    |
| "category", "size", "condition"   | Yes      | A value from the Item Object.                           |
| "price_cents"                     | Yes      | Whole number from 100 to 1,000,000.                     |
| "description"                     | Yes      | 10 to 1,000 characters.                                 |
| "image_b64"                       | Yes      | JPG, PNG or WEBP data URL, up to 5 MB.                  |
| "image_alt"                       | Yes      | 5 to 250 characters. Can't start with "Image of" or "Photo of". |
| "material"                        | No       | Up to 80 characters.                                    |
| "try_on_supported"                | No       | Defaults to false.                                      |

**Response (Success)**
```json
{
    "success": true,
    "message": "Camel Wool Coat is now listed.",
    "item_id": "item-11",
    "item": { /* Item Object */ }
}
```

**Errors:** TITLE_REQUIRED, TITLE_TOO_LONG, CATEGORY_INVALID, SIZE_INVALID, CONDITION_INVALID, PRICE_INVALID, DESCRIPTION_REQUIRED, DESCRIPTION_TOO_LONG, MATERIAL_TOO_LONG, IMAGE_REQUIRED, IMAGE_INVALID, IMAGE_TOO_LARGE, IMAGE_ALT_REQUIRED, IMAGE_ALT_LENGTH, IMAGE_ALT_REDUNDANT (400)

## PUT /api/modify-item
Modifies a listing. Only send the fields that change. A new photo needs new alt text too. Status changes go through update-item-status instead.

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

**Errors:** NO_CHANGES, USE_STATUS_ENDPOINT, any create-item field error (400), ITEM_NOT_FOUND (404)

## PUT /api/update-item-status
Marks a piece available, held or sold. Selling a piece unpins it and cancels its upcoming bookings with ITEM_SOLD. Holding it stops new bookings but keeps existing ones. Setting it back to available also restores a removed listing.

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

**Errors:** INVALID_STATUS (400), ITEM_NOT_FOUND (404)

## DELETE /api/delete-item
Archives a listing by setting its status to removed. It disappears from the public site and its upcoming bookings are cancelled with ITEM_REMOVED. Use update-item-status to bring it back.

**Request Body**
```json
{
    "item_id": "item-11"
}
```

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

**Errors:** ITEM_NOT_FOUND (404), ALREADY_REMOVED (409)

## PUT /api/set-featured
Pins or unpins a piece at the top of Featured. Each store can pin 2 (MAX_PINNED_PER_STORE).

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

**Errors:** PINNED_REQUIRED (400), ITEM_NOT_FOUND (404), ITEM_NOT_PINNABLE, PIN_LIMIT_REACHED (409)

## GET /api/store-bookings
Gets the store's try-on appointments, including shopper contact details.

**Query Parameters**
| Param    | Description                                                         |
|----------|---------------------------------------------------------------------|
| "scope"  | upcoming (default), past or all. Defaults to all when "date" is sent. |
| "date"   | Only this day.                                                      |
| "status" | confirmed, completed, no_show or cancelled.                         |

**Response**
```json
{
    "count": 2,
    "scope": "upcoming",
    "bookings": [ /* Booking Objects */ ]
}
```

## PUT /api/update-booking-status
Records how an appointment went. Sending completed with "item_sold": true also marks the piece sold. A cancelled booking can't go back to confirmed.

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

"cancelled_bookings" lists other bookings for the same piece that were cancelled because it sold.

**Errors:** BOOKING_ID_REQUIRED, INVALID_STATUS, MESSAGE_TOO_LONG, ITEM_SOLD_NEEDS_COMPLETED (400), BOOKING_NOT_FOUND (404), BOOKING_CANCELLED (409)

## PUT /api/modify-store
Modifies the store's details, hours and slot settings. Only send the fields that change. Bookings that fall outside new hours are kept.

Editable fields are "name", "neighborhood", "address", "city", "description", "image_alt", "hours" (all seven days), "slot_minutes" (15, 20, 30, 45, 60, 90 or 120) and "slot_capacity" (1 to 20).

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

**Response**
```json
{
    "success": true,
    "message": "Store details updated. Existing bookings are kept even if they now fall outside your hours.",
    "store": { /* Store Object */ }
}
```

**Errors:** NO_CHANGES, <FIELD>_INVALID, IMAGE_ALT_*, HOURS_INVALID, SLOT_MINUTES_INVALID, SLOT_CAPACITY_INVALID, UNKNOWN_FIELD (400)

## GET /api/store-closures
Gets the store's upcoming closures.

**Response**
```json
{
    "count": 1,
    "closures": [ /* Closure Objects */ ]
}
```

## POST /api/create-closure
Creates a closure for a whole day or part of one. Leave out the times for all day. Bookings already in that window stay booked and come back in "conflicting_bookings" so the store can contact those shoppers.

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

**Response**
```json
{
    "success": true,
    "message": "Closure added.",
    "closure": { /* Closure Object */ },
    "conflicting_bookings": []
}
```

**Errors:** DATE_INVALID, DATE_IN_PAST, TIME_RANGE_INCOMPLETE, TIME_RANGE_INVALID, REASON_TOO_LONG (400)

## DELETE /api/delete-closure
Deletes a closure so those times can be booked again.

**Request Body**
```json
{
    "closure_id": 1
}
```

**Response**
```json
{
    "success": true,
    "message": "Closure removed.",
    "closure_id": 1
}
```

**Errors:** CLOSURE_ID_REQUIRED (400), CLOSURE_NOT_FOUND (404)

# Error Codes
Codes that can come back from any endpoint.

| Code                                         | Status | Meaning                                                     |
|----------------------------------------------|--------|-------------------------------------------------------------|
| METHOD_NOT_ALLOWED                           | 405    | Wrong HTTP method. The Allow header lists the right one.    |
| INVALID_JSON                                 | 400    | The body isn't a JSON object.                               |
| ENDPOINT_NOT_FOUND                           | 404    | No endpoint at that path.                                   |
| FORBIDDEN                                    | 403    | Someone requested an internal file like the config or database. |
| VISITOR_TOKEN_REQUIRED, VISITOR_TOKEN_INVALID | 401   | Missing or unknown visitor token.                           |
| STORE_AUTH_REQUIRED                          | 401    | Missing X-Store-Id or X-Auth-Code.                          |
| AUTH_FAILURE                                 | 401    | Wrong store auth code, or wrong booking ID or confirmation code. |
| BOOKING_AUTH_REQUIRED                        | 401    | No confirmation code or visitor token sent for a booking.   |
| ITEM_NOT_FOUND, STORE_NOT_FOUND              | 404    | No such item or store, or it belongs to another store.      |
| ITEM_UNAVAILABLE                             | 409    | The piece is held or sold and can't be booked.              |
| SLOT_UNAVAILABLE                             | 409    | The time is past, closed, full, or the piece is already booked then. |
| STORE_CLOSED                                 | 409    | The store is closed that day.                               |
| SERVER_ERROR                                 | 500    | Something broke on the server. Details go to the PHP error log. |
