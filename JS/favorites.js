/*
    JavaScript file for favorites.html
*/
const thing = document.getElementsByClassName('rt-product-card')[0];
thing.setAttribute('hidden', '');

const savedHeading = document.getElementById('saved-heading');
const emptyFavorites = document.getElementById('empty-favorites');

let numFavorites = 0;
loadServerFavorites().then(favorites => {
    numFavorites = favorites.count;

    updateSavedHeading();
    
    renderFavoriteItems(favorites.items);
}).catch(error => {
    console.error("Error loading server favorites:", error);
});

// Update the saved heading with the number of favorites
function updateSavedHeading() {
    savedHeading.textContent = numFavorites == 1 ? `${numFavorites} saved piece` : `${numFavorites} saved pieces`;
    if(numFavorites == 0){
        emptyFavorites.removeAttribute('hidden');
    } else {
        emptyFavorites.setAttribute('hidden', '');
    }
}

//--- API Stuff
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

function fromApi(apiItem) {
    var local = find(ITEMS, apiItem.item_id) || API_ONLY_DETAILS[apiItem.item_id];
    return {
      id: apiItem.item_id,
      name: apiItem.title,
      category: apiItem.category,
      size: apiItem.size,
      price: Math.round(apiItem.price_cents / 100),
      store: apiItem.store ? apiItem.store.name : "",
      image: apiItem.image,
      colors: local ? local.colors : [],
      tags: local ? local.tags : [],
      look: local ? local.look : (DEFAULT_LOOKS[apiItem.category] || DEFAULT_LOOKS.outerwear)
    }
  }


//Function generates array of HTML elements from favorite items
function generateFavoriteItemsHTML(favoriteItems) {
    return favoriteItems.map(item => {
        return `
            <article class="rt-product-card" data-item-id="${item.item_id}">
                <div class="rt-product-image">
                    <a href="item.html#${item.item_id}" aria-label="View ${item.title} details">
                        <img src="${item.image}" alt="${item.title}">
                    </a>
                    <button class="rt-favorite-button is-saved" type="button" data-favorite-toggle="${item.item_id}" aria-pressed="${item.is_saved}" aria-label="Remove ${item.title} from favorites">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 8.8c0 5.2-8.2 10.1-8.2 10.1S3.8 14 3.8 8.8a4.2 4.2 0 0 1 7.8-2.1 4.2 4.2 0 0 1 8.6 2.1Z"/></svg>
                    </button>
                </div>
                <div class="rt-product-info">
                    <div class="rt-product-title-row"><h3><a href="item.html#${item.item_id}">${item.title}</a></h3><span class="rt-price">${item.price_display}</span></div>
                    <p class="rt-product-meta">${item.size} <span aria-hidden="true">·</span> ${item.category} <span aria-hidden="true">·</span> ${item.price_display}</p>
                    <a class="rt-store-link" href="stores.html#${item.store.name}">${item.store.name} <span aria-hidden="true">↗</span></a>
                </div>
            </article>
        `;
    }).join("");

}


// Function renders the list of favorite items in the DOM sorted by most recently added
function renderFavoriteItems(favoriteItems) {
    favoriteItems.sort((a, b) => b.saved_at - a.saved_at);
    const container = document.getElementsByClassName('rt-favorites-grid')[0];
   container.innerHTML = generateFavoriteItemsHTML(favoriteItems);
    createButtons();
}

// Function creates button listeners for favorite button
function createButtons(){
    const favoriteButtons = document.getElementsByClassName('rt-favorite-button');
    loadServerFavorites().then(favorites => {
        const favoritesList = favorites.items;
        console.log("favoritesList:",favoritesList);
        Array.from(favoriteButtons).forEach(button => {
            const itemId = button.parentElement.parentElement.getAttribute('data-item-id');

            if(favoritesList.some(item => item.item_id == itemId)){
                button.classList.add('is-saved');
            }
            console.log(itemId, button.classList.contains('is-saved'));
            button.addEventListener('click', () => {
                button.classList.toggle('is-saved');
                saveServerFavorite(button.parentElement.parentElement.getAttribute('data-item-id'), button.classList.contains('is-saved'));
                console.log(button.classList.contains('is-saved'), itemId);
            });
        });
    });
}

