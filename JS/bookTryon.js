/*
    JavaScript file for booking.html

    Part C changes:
    - Times come from GET /api/availability for the picked date, so closed days and full slots
      can't be booked (HE-9).
    - The booking is saved with POST /api/create-booking and the page shows the real confirmation
      code. It no longer opens the email app or says "confirmed" when nothing was sent (HE-10).
*/
const itemInfoContainer = document.getElementsByClassName('rt-booking-summary')[0];
const itemId = new URLSearchParams(window.location.search).get('item');

const bookingForm = document.getElementById('booking-form');
const dateInput = document.getElementById('booking-date');
const timeSelect = document.getElementById('booking-time');
const timeNote = document.getElementById('booking-time-note');
const feedback = document.getElementById('booking-feedback');
const submitButton = bookingForm.querySelector('[data-booking-submit]');
const BOOKING_WINDOW_DAYS = 30;

let currentItem = null;

if (!api() || !itemId) {
    showPageError(itemId
        ? "Booking needs the RETHREAD server, and it isn't connected on this copy of the site."
        : "We couldn't tell which piece you want to try on. Go back to Explore and pick one.");
} else {
    api().request("item", { query: { item_id: itemId } }).then(data => {
        currentItem = data.item;
        document.querySelectorAll('.rt-back-link, .rt-cancel-link').forEach(link => {
            link.href = `item.html#${itemId}`;
        });
        itemInfoContainer.innerHTML = renderBookingSummary(data.item);
        setUpDatePicker();
    }).catch(() => {
        showPageError("We couldn't load this piece. Check your connection and refresh the page.");
    });
}

// Only let people pick from today to 30 days out, in their own time zone
function setUpDatePicker() {
    const today = new Date();
    const last = new Date();
    last.setDate(today.getDate() + BOOKING_WINDOW_DAYS);
    dateInput.min = toLocalDate(today);
    dateInput.max = toLocalDate(last);
    dateInput.addEventListener('change', loadTimes);
}

// Ask the API which times are open on that date for this piece's store
function loadTimes() {
    clearFieldError('date');
    clearFieldError('time');
    timeSelect.innerHTML = '<option value="">Loading times…</option>';
    timeSelect.disabled = true;
    if (!dateInput.value) {
        timeSelect.innerHTML = '<option value="">Pick a date first</option>';
        return;
    }

    api().request("availability", { query: { date: dateInput.value, item_id: itemId } }).then(data => {
        if (data.closed) {
            timeSelect.innerHTML = '<option value="">Closed that day</option>';
            showFieldError('date', `${currentItem.store.name} is closed on ${data.date_label}. Try another day.`);
            timeNote.textContent = `Open: ${currentItem.store.hours_display}`;
            return;
        }
        const options = data.slots.map(slot =>
            `<option value="${slot.time}"${slot.available ? '' : ' disabled'}>${slot.label}</option>`
        ).join('');
        timeSelect.innerHTML = `<option value="">Choose a time</option>${options}`;
        timeSelect.disabled = false;
        timeNote.textContent = data.available_count === 0
            ? "Every time is taken that day. Try another day."
            : "Times that are full are shown but can't be picked.";
    }).catch(error => {
        timeSelect.innerHTML = '<option value="">No times available</option>';
        const message = error.errors && error.errors[0] ? error.errors[0].message : "We couldn't load times for that day.";
        showFieldError('date', message);
    });
}

bookingForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!currentItem) return;
    clearAllErrors();

    const formData = new FormData(bookingForm);
    const booking = {
        item_id: itemId,
        name: (formData.get('name') || '').trim(),
        email: (formData.get('email') || '').trim(),
        date: formData.get('date'),
        time: formData.get('time'),
        notes: (formData.get('notes') || '').trim(),
    };

    // Catch the easy mistakes before sending anything
    let hasError = false;
    if (!booking.name) { showFieldError('name', 'Please enter your name.'); hasError = true; }
    if (!booking.email || !document.getElementById('booking-email').checkValidity()) {
        showFieldError('email', 'Enter a valid email address, such as name@example.com.'); hasError = true;
    }
    if (!booking.date) { showFieldError('date', 'Choose a date for your visit.'); hasError = true; }
    if (!booking.time) { showFieldError('time', 'Choose one of the available times.'); hasError = true; }
    if (hasError) {
        feedback.innerHTML = '<div class="rt-form-notice is-error" role="alert">Check the highlighted fields.</div>';
        bookingForm.querySelector('[aria-invalid="true"]').focus();
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Booking…';
    feedback.innerHTML = '<p class="rt-form-notice is-pending">Booking your fitting…</p>';

    api().request("create-booking", { method: "POST", body: { booking }, visitor: true }).then(data => {
        showConfirmation(data, booking);
    }).catch(error => {
        submitButton.disabled = false;
        submitButton.textContent = 'Book my fitting';
        const errors = error.errors && error.errors.length ? error.errors : [{ message: "Something went wrong. Please try again." }];
        errors.forEach(err => { if (err.field) showFieldError(err.field, err.message); });
        feedback.innerHTML = `<div class="rt-form-notice is-error" role="alert">${escapeHtml(errors[0].message)}</div>`;
        // A slot that just filled up: refresh the list so it shows as full
        if (errors.some(err => err.error_code === 'SLOT_UNAVAILABLE')) loadTimes();
    });
});

function showConfirmation(data, booking) {
    const timeLabel = timeSelect.options[timeSelect.selectedIndex] ? timeSelect.options[timeSelect.selectedIndex].text : booking.time;
    const dateLabel = new Date(booking.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    const wrap = document.getElementsByClassName('rt-booking-form-wrap')[0];
    wrap.innerHTML = `
        <section class="rt-booking-success" aria-labelledby="booking-success-heading" tabindex="-1">
            <p class="rt-eyebrow">YOU'RE ALL SET</p>
            <h2 id="booking-success-heading">Your fitting is booked.</h2>
            <p>${escapeHtml(currentItem.title)} at ${escapeHtml(currentItem.store.name)}</p>
            <p><strong>${escapeHtml(dateLabel)}</strong> at <strong>${escapeHtml(timeLabel)}</strong></p>
            <p class="rt-confirmation-code">Confirmation code: <strong>${escapeHtml(data.confirmation_code)}</strong></p>
            <p>Show this code at ${escapeHtml(currentItem.store.address)}. Keep it handy if you need to change or cancel.</p>
            <a class="rt-button rt-button-secondary" href="index.html#clothes">Back to Explore</a>
        </section>
    `;
    wrap.querySelector('.rt-booking-success').focus();
}

function showFieldError(field, message) {
    const wrapper = bookingForm.querySelector(`[data-field="${field}"]`);
    if (!wrapper) return;
    wrapper.classList.add('is-invalid');
    const control = wrapper.querySelector('input, select, textarea');
    if (control) control.setAttribute('aria-invalid', 'true');
    const error = wrapper.querySelector('[data-field-error]');
    if (error) { error.textContent = message; error.hidden = false; }
}

function clearFieldError(field) {
    const wrapper = bookingForm.querySelector(`[data-field="${field}"]`);
    if (!wrapper) return;
    wrapper.classList.remove('is-invalid');
    const control = wrapper.querySelector('input, select, textarea');
    if (control) control.removeAttribute('aria-invalid');
    const error = wrapper.querySelector('[data-field-error]');
    if (error) error.hidden = true;
}

function clearAllErrors() {
    ['name', 'email', 'date', 'time'].forEach(clearFieldError);
    feedback.innerHTML = '';
}

function showPageError(message) {
    const wrap = document.getElementsByClassName('rt-booking-form-wrap')[0];
    wrap.innerHTML = `<div class="rt-form-notice is-error" role="alert">${escapeHtml(message)}</div>
        <a class="rt-button rt-button-secondary" href="index.html#clothes">Back to Explore</a>`;
}

function toLocalDate(date) {
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function escapeHtml(text) {
    return String(text == null ? '' : text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Function renders the aside booking summary
function renderBookingSummary(item) {
    return `
        <img src="${item.image}" alt="${escapeHtml(item.image_alt)}">
          <div class="rt-booking-summary-copy">
            <p class="rt-eyebrow">Sample listing</p>
            <h2 id="booking-item-heading">${escapeHtml(item.title || 'Not specified')}</h2>
            <p>${escapeHtml(item.price_display)} <span aria-hidden="true">·</span> Size ${escapeHtml(item.size)} <span aria-hidden="true">·</span> ${escapeHtml(item.condition)}</p>
            <hr>
            <h3>${escapeHtml(item.store.name || 'Not specified')}</h3>
            <p>${escapeHtml(item.store.address || 'Not specified')}</p>
            <p>Hours: ${escapeHtml(item.store.hours_display || 'Not specified')}</p>
          </div>
    `;
}

//-- API stuff --> copied from Ismael's tryon.js
function api() {
    return window.RETHREAD_API && window.RETHREAD_API.available ? window.RETHREAD_API : null;
}
