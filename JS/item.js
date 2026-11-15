/*
    JavaScript file for item.html
*/

const itemId = window.location.hash.split('#')[1];
const featuredItemContainer = document.getElementsByClassName('rt-featured-item')[0];

const checkItem = api().request("item", { query: { item_id: itemId } });
let itemData;
checkItem.then(data => {
    itemData = data.item;
    console.log(itemData);
}).catch(error => {
    console.error("Failed to load item from API", error);
});

loadApiItems().then(itemsList => {
    console.log(itemsList.items);
    if(itemData) {
        renderFeaturedItem(itemData);
    }
    
    //To do: render the rest of the items
    const otherItems = itemsList.items.filter(item => item.item_id != itemData.item_id);
    
}).catch(error => {
    console.error("Failed to load items from API", error);
});

// Function generates HTML for featured item
function generateFeaturedItemHTML(item) {
    console.log("generating:", item);
    return `
        <div class="rt-detail-image">
          <img src="${item.image}" alt="${item.description}">
          <span class="rt-image-caption">Sample listing · Second Story Vintage</span>
        </div>
        <div class="rt-detail-copy">
          <p class="rt-eyebrow">${item.store.name ? item.store.name : 'Not specified'}</p>
          <h1>${item.title ? item.title : 'Not specified'}</h1>
          <p class="rt-detail-price">${item.price_display ? item.price_display : 'Not specified'}</p>
          <dl class="rt-item-facts">
            <div><dt>Size</dt><dd>${item.size ? item.size : 'Not specified'}</dd></div>
            <div><dt>Condition</dt><dd>${item.condition ? item.condition : 'Not specified'}</dd></div>
            <div><dt>Material</dt><dd>${item.material ? item.material : 'Not specified'}</dd></div>
          </dl>
          <p class="rt-item-description">${item.description ? item.description : 'Not specified'}</p>
          <div class="rt-detail-store">
            <p class="rt-eyebrow">FIND IT AT</p>
            <h2><a href="stores.html#${item.store.name}">${item.store.name ? item.store.name : 'Not specified'}</a></h2>
            <p>${item.store.address ? item.store.address : 'Not specified'}</p>
            <p>Example hours: ${item.store.hours_display ? item.store.hours_display : 'Not specified'}</p>
          </div>
          <div class="rt-detail-actions">
            <button class="rt-button rt-button-secondary" type="button" data-favorite-toggle="${item.item_id}" aria-pressed="false">Save to Favorites</button>
            <a class="rt-button rt-button-primary" href="booking.html?item=${item.item_id}">Book a Try-On</a>
          </div>
          <p class="rt-demo-note">Classroom demo: listing, stock, price, and store hours are examples.</p>
        </div>
    `
}

// Function renders the featured item on the page
function renderFeaturedItem(item) {
    console.log("rendering featured item");
    featuredItemContainer.setAttribute('id', item.item_id);
    featuredItemContainer.setAttribute('data-item-id', item.item_id);
    featuredItemContainer.innerHTML = generateFeaturedItemHTML(item);

    createButtonsFavorites();
}

// Function creates button listener for the featured item
function createButtonsFavorites() {
    const favoriteButton = featuredItemContainer.querySelector('[data-favorite-toggle]');
    if(favoriteButton) {
        favoriteButton.addEventListener('click', () => {
            const itemId = favoriteButton.getAttribute('data-favorite-toggle');
            loadServerFavorites().then(favorites => {
                const isSaved = favorites.items.filter(item => item.item_id == itemId).length;
                saveServerFavorite(itemId, !isSaved);
                favoriteButton.setAttribute('aria-pressed', !isSaved ? 'true' : 'false');
                favoriteButton.classList.toggle('rt-button-secondary', isSaved);
                favoriteButton.textContent = !isSaved ? 'Saved to Favorites' : 'Save to Favorites';
                favoriteButton.style.backgroundColor = !isSaved ? '#294a36' : '';
                favoriteButton.style.color = !isSaved ? '#f7f7f2' : '';
            });
        });
    }
}

// Function gets all items from the API
function loadApiItems() {
    if (!api()) return Promise.resolve(null);
    return api().request("items", { query: { sort: "recent" } }).then(data => {
        return data;
    }).catch(function () { return null; });
}

//--- API Stuff --> copied from Ismael's tryon.js
function api() {
    return window.RETHREAD_API && window.RETHREAD_API.available ? window.RETHREAD_API : null;
}

function saveServerFavorite(id, saved) {
    if (!api()) return Promise.resolve(true);
    var call = saved
      ? api().request("add-favorite", { method: "POST", body: { item_id: id }, visitor: true })
      : api().request("remove-favorite", { method: "DELETE", body: { item_id: id }, visitor: true });
    return call.then(() => true).catch(() => false);
}

function loadServerFavorites() {
    if (!api()) return Promise.resolve(null);
    return api().request("favorites", { visitor: true }).then(data => {
      return (data);
    }).catch(() => []);
}