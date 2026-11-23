/*
    JavaScript file for favorites.html
*/
const thing = document.getElementsByClassName('rt-product-card')[0];
thing.setAttribute('hidden', '');

const savedHeading = document.getElementById('saved-heading');
const emptyFavorites = document.getElementById('empty-favorites');

let numFavorites = 0;
loadServerFavorites().then(favorites => {
    if (!favorites || !Array.isArray(favorites.items)) {
        showLoadError();
        return;
    }
    numFavorites = favorites.count;

    updateSavedHeading();
    
    renderFavoriteItems(favorites.items);
}).catch(error => {
    console.error("Error loading server favorites:", error);
    showLoadError();
});

// Shown when the favorites API can't be reached, instead of "undefined saved pieces"
function showLoadError() {
    savedHeading.textContent = "We couldn't load your saved pieces";
    emptyFavorites.setAttribute('hidden', '');
    const container = document.getElementsByClassName('rt-favorites-grid')[0];
    container.innerHTML = '<p role="alert">Favorites are saved on the RETHREAD server, and it didn\'t respond. Check your connection and refresh the page.</p>';
}

// Update the saved heading with the number of favorites
function updateSavedHeading() {
    savedHeading.textContent = numFavorites == 1 ? `${numFavorites} saved piece` : `${numFavorites} saved pieces`;
    if(numFavorites == 0){
        emptyFavorites.removeAttribute('hidden');
    } else {
        emptyFavorites.setAttribute('hidden', '');
    }
}



//Function generates array of HTML elements from favorite items
function generateFavoriteItemsHTML(favoriteItems) {
    return favoriteItems.map(item => {
        return `
            <article class="rt-product-card" data-item-id="${item.item_id}">
                <div class="rt-product-image">
                    <a href="item.html#${item.item_id}" aria-label="View ${item.title} details">
                        <img src="${item.image}" alt="${item.image_alt || item.title}">
                    </a>
                    <button class="rt-favorite-button is-saved" type="button" data-favorite-toggle="${item.item_id}" aria-pressed="true" aria-label="Remove ${item.title} from favorites">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 8.8c0 5.2-8.2 10.1-8.2 10.1S3.8 14 3.8 8.8a4.2 4.2 0 0 1 7.8-2.1 4.2 4.2 0 0 1 8.6 2.1Z"/></svg>
                    </button>
                </div>
                <div class="rt-product-info">
                    <div class="rt-product-title-row"><h3><a href="item.html#${item.item_id}">${item.title}</a></h3><span class="rt-price">${item.price_display}</span></div>
                    <p class="rt-product-meta">${item.size} <span aria-hidden="true">·</span> ${item.condition} condition</p>
                    <a class="rt-store-link" href="stores.html#store-${item.store.store_id}">${item.store.name} <span aria-hidden="true">→</span></a>
                </div>
            </article>
        `;
    }).join("");

}


// Function renders the list of favorite items in the DOM sorted by most recently added
function renderFavoriteItems(favoriteItems) {
    favoriteItems.sort((a, b) => Date.parse(b.saved_at) - Date.parse(a.saved_at));
    const container = document.getElementsByClassName('rt-favorites-grid')[0];
   container.innerHTML = generateFavoriteItemsHTML(favoriteItems);
    createButtons();
}

// Function creates button listeners for favorite button.
// Part C (HE-7): unsaving removes the card right away, updates the count, and offers Undo.
function createButtons(){
    const favoriteButtons = document.getElementsByClassName('rt-favorite-button');
    Array.from(favoriteButtons).forEach(button => {
        button.addEventListener('click', () => removeFavorite(button.closest('.rt-product-card')));
    });
}

function removeFavorite(card) {
    const itemId = card.getAttribute('data-item-id');
    const title = card.querySelector('h3').textContent;
    const parent = card.parentElement;
    const nextSibling = card.nextElementSibling;
    card.remove();
    numFavorites--;
    updateSavedHeading();
    saveServerFavorite(itemId, false);

    showToast(`Removed ${title} from your favorites.`, 'Undo', () => {
        parent.insertBefore(card, nextSibling && nextSibling.isConnected ? nextSibling : null);
        numFavorites++;
        updateSavedHeading();
        saveServerFavorite(itemId, true);
        card.querySelector('.rt-favorite-button').focus();
        showToast(`${title} is back in your favorites.`);
    });
    const firstLeft = parent.querySelector('.rt-favorite-button');
    if (firstLeft) firstLeft.focus();
}

function showToast(message, actionLabel, onAction) {
    let toast = document.querySelector('.rt-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'rt-toast';
        toast.setAttribute('role', 'status');
        document.body.appendChild(toast);
    }
    toast.innerHTML = '';
    const text = document.createElement('span');
    text.textContent = message;
    toast.appendChild(text);
    if (actionLabel) {
        const action = document.createElement('button');
        action.type = 'button';
        action.className = 'rt-toast-action';
        action.textContent = actionLabel;
        action.addEventListener('click', () => { toast.classList.remove('is-visible'); onAction(); }, { once: true });
        toast.appendChild(action);
    }
    toast.classList.add('is-visible');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('is-visible'), actionLabel ? 6000 : 2600);
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
    }).catch(error => {
      console.error("Error loading server favorites:", error);
      return null;
    });
}

