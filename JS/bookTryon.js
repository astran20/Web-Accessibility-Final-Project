/*
    JavaScript file for booking.html
*/
const itemInfoContainer = document.getElementsByClassName('rt-booking-summary')[0];
const itemId = window.location.search.split('item=')[1];

const checkItem = api().request("item", { query: { item_id: itemId } });
checkItem.then(data => {
    const backToItem = document.getElementsByClassName('rt-back-link')[0];
    backToItem.href = `item.html#${itemId}`;
    const cancel = document.getElementsByClassName('rt-cancel-link')[0];
    cancel.href = `item.html#${itemId}`;
    itemInfoContainer.innerHTML = renderBookingSummary(data.item);

    /* To send an email confirming booking */
    const bookingForm = document.getElementById('booking-form');
    const bookingFormDate = document.getElementById('booking-date');
    bookingFormDate.setAttribute('min', new Date().toISOString().split('T')[0]);

    bookingForm.addEventListener('submit', event => {
        event.preventDefault();
        //alert("Thanks for submitting a booking! Your default email app will now open and request to send an email confirmation. Please check your email app to send the confirmation if you want to save it.");

        const formData = new FormData(bookingForm);
        const recepient = formData.get('email');
        const subject = `RETHREAD | Booking Confirmation for ${data.item.title}`;
        const body = `Hello ${formData.get('name')},\n\nThank you for booking a visit to try on the item "${data.item.title}".\n\n Here are your booking details:\n\nDate: ${formData.get('date')}\nTime: ${formData.get('time')}\nNotes: ${formData.get('notes')}\n\nBest regards,\nThe Rethread Team`;
        const mailtoLink = `mailto:${recepient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoLink;
        document.getElementById('customAlert').showModal();
        const bookingSuccess = document.getElementById('booking-success');
        bookingSuccess.innerHTML = `
            <p class="rt-eyebrow">YOU'RE ALL SET</p>
            <h2 id="booking-success-heading">Your try-on is confirmed.</h2>
            <p>${data.item.title}</p>
            <p><strong data-confirmed-date>${formData.get('date')}</strong> at <strong data-confirmed-time>${formData.get('time')}</strong></p>
            <p>Next: visit the shop at ${data.item.store.address}. This is a sample confirmation for the class prototype.</p>
            <a class="rt-button rt-button-secondary" href="index.html#clothes">Back to Explore</a>
        `;
        bookingSuccess.removeAttribute('hidden');

        const bookingFormContainer = document.getElementsByClassName('rt-booking-form-wrap')[0];
        bookingFormContainer.innerHTML = bookingSuccess.innerHTML;
    });
    
    


}).catch(error => {
    console.error("Failed to load item from API", error);
});


// Function renders the aside booking summary
function renderBookingSummary(item) {
    return `
        <img src="${item.image}" alt="${item.image_alt}">
          <div class="rt-booking-summary-copy">
            <p class="rt-eyebrow">Sample listing</p>
            <h2 id="booking-item-heading">${item.title ? item.title : 'Not specified'}</h2>
            <p>${item.price_display} <span aria-hidden="true">·</span> Size ${item.size} <span aria-hidden="true">·</span> ${item.condition}</p>
            <hr>
            <h3>${item.store.name ? item.store.name : 'Not specified'}</h3>
            <p>${item.store.address ? item.store.address : 'Not specified'}</p>
            <p>Example hours: ${item.store.hours_display ? item.store.hours_display : 'Not specified'}</p>
          </div>
    `;
}


  



//-- API stuff --> copied from Ismael's tryon.js
function api() {
    return window.RETHREAD_API && window.RETHREAD_API.available ? window.RETHREAD_API : null;
}
