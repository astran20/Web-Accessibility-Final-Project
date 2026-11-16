/*
    JavaScript file for booking.html
*/
const itemInfoContainer = document.getElementsByClassName('rt-booking-summary')[0];
const itemId = window.location.search.split('item=')[1];

const checkItem = api().request("item", { query: { item_id: itemId } });
checkItem.then(data => {
    const backToItem = document.getElementsByClassName('rt-back-link')[0];
    backToItem.href = `item.html#${itemId}`;
    itemInfoContainer.innerHTML = renderBookingSummary(data.item);

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
