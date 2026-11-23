/*
    JavaScript file for item.html

    Part C changes:
    - Waits for the piece AND the item list before drawing, so the page no longer comes up blank
      when the list loads first (HE-5). Shows a loading line, and a retry message if it fails.
    - The Save button starts as "Saved to Favorites" when the piece is already saved (HE-6).
    - Store links use the store's ID, so they jump to the right store on stores.html (HE-16).
*/

window.addEventListener('hashchange', () => {
    window.scrollTo({ top: 0, left: 0 });
    loadPage();
});

const featuredItemContainer = document.getElementsByClassName('rt-featured-item')[0];
const otherItemsContainer = document.getElementsByClassName('rt-detail-list')[0];

loadPage();

function loadPage() {
    const itemId = window.location.hash.replace('#', '');
    otherItemsContainer.innerHTML = '';

    if (!api()) {
        showItemError("Item details need the RETHREAD server, and it isn't connected on this copy of the site.", false);
        return;
    }
    if (!itemId) {
        showItemError("We couldn't tell which piece to show. Pick one from Explore.", false);
        return;
    }

    featuredItemContainer.innerHTML = '<p class="rt-loading-note" role="status">Loading this piece…</p>';

    Promise.all([
        api().request("item", { query: { item_id: itemId } }),
        api().request("items", { query: { sort: "recent" } }).catch(() => null),
        loadServerFavoriteIds(),
    ]).then(([itemData, itemsList, favoriteIds]) => {
        const item = itemData.item;
        document.title = `${item.title} | RETHREAD`;
        renderFeaturedItem(item, favoriteIds.includes(item.item_id));

        if (itemsList && Array.isArray(itemsList.items)) {
            const otherItems = itemsList.items.filter(other => other.item_id !== item.item_id);
            otherItemsContainer.innerHTML = generateOtherItemsHTML(otherItems);
        }
    }).catch(() => {
        showItemError("We couldn't load this piece. It may have sold, or the connection dropped.", true);
    });
}

function showItemError(message, canRetry) {
    featuredItemContainer.innerHTML = `
        <div class="rt-item-error" role="alert">
          <h1>Something went wrong.</h1>
          <p>${escapeHtml(message)}</p>
          ${canRetry ? '<button class="rt-button rt-button-primary" type="button" data-retry>Try again</button>' : ''}
          <a class="rt-button rt-button-secondary" href="index.html#clothes">Back to Explore</a>
        </div>`;
    const retry = featuredItemContainer.querySelector('[data-retry]');
    if (retry) retry.addEventListener('click', loadPage);
}

function storeLink(store) {
    return store && store.store_id ? `stores.html#store-${store.store_id}` : 'stores.html';
}

// Function generates HTML for featured item
function generateFeaturedItemHTML(item, isSaved) {
    const storeName = item.store && item.store.name ? item.store.name : 'Not specified';
    return `
        <div class="rt-detail-image">
          <img src="${item.image}" alt="${escapeHtml(item.image_alt)}">
          <span class="rt-image-caption">Sample listing · ${escapeHtml(storeName)}</span>
        </div>
        <div class="rt-detail-copy">
          <p class="rt-eyebrow">${escapeHtml(storeName)}</p>
          <h1>${escapeHtml(item.title || 'Not specified')}</h1>
          <p class="rt-detail-price">${escapeHtml(item.price_display || 'Not specified')}</p>
          <dl class="rt-item-facts">
            <div><dt>Size</dt><dd>${escapeHtml(item.size || 'Not specified')}</dd></div>
            <div><dt>Condition</dt><dd>${escapeHtml(item.condition || 'Not specified')}</dd></div>
            <div><dt>Material</dt><dd>${escapeHtml(item.material || 'Not listed')}</dd></div>
          </dl>
          <p class="rt-item-description">${escapeHtml(item.description || '')}</p>
          <div class="rt-detail-store">
            <p class="rt-eyebrow">FIND IT AT</p>
            <h2><a href="${storeLink(item.store)}">${escapeHtml(storeName)}</a></h2>
            <p>${escapeHtml(item.store.address || '')}</p>
            <p>Hours: ${escapeHtml(item.store.hours_display || 'Not listed')}</p>
          </div>
          <div class="rt-detail-actions">
            <button class="rt-button ${isSaved ? 'rt-button-saved' : 'rt-button-secondary'}" type="button" data-favorite-toggle="${item.item_id}" aria-pressed="${isSaved}">${isSaved ? 'Saved to Favorites' : 'Save to Favorites'}</button>
            <a class="rt-button rt-button-primary" href="booking.html?item=${item.item_id}">Book an in-store fitting</a>
          </div>
          <a class="rt-text-link rt-detail-tryon" href="virtual-try-on.html?item=${item.item_id}">Try it on a sample model <span aria-hidden="true">→</span></a>
          <p class="rt-demo-note">Classroom demo: listing, stock, price, and store hours are examples.</p>
        </div>
    `;
}

// Function renders the featured item on the page
function renderFeaturedItem(item, isSaved) {
    featuredItemContainer.setAttribute('data-item-id', item.item_id);
    featuredItemContainer.innerHTML = generateFeaturedItemHTML(item, isSaved);
    createButtonsFavorites();
}

// Saving updates the button right away, and undoes it if the server says no
function createButtonsFavorites() {
    const favoriteButton = featuredItemContainer.querySelector('[data-favorite-toggle]');
    if (!favoriteButton) return;
    favoriteButton.addEventListener('click', () => {
        const itemId = favoriteButton.getAttribute('data-favorite-toggle');
        const willSave = favoriteButton.getAttribute('aria-pressed') !== 'true';
        setSavedState(favoriteButton, willSave);
        showToast(willSave ? 'Saved to your favorites.' : 'Removed from your favorites.');
        saveServerFavorite(itemId, willSave).then(ok => {
            if (!ok) {
                setSavedState(favoriteButton, !willSave);
                showToast("That didn't save. Check your connection and try again.");
            }
        });
    });
}

function setSavedState(button, saved) {
    button.setAttribute('aria-pressed', saved ? 'true' : 'false');
    button.classList.toggle('rt-button-saved', saved);
    button.classList.toggle('rt-button-secondary', !saved);
    button.textContent = saved ? 'Saved to Favorites' : 'Save to Favorites';
}

// Function generates HTML for up to 5 other pieces (no links nested inside links)
function generateOtherItemsHTML(items) {
    return items.slice(0, 5).map(item => `
        <article class="rt-detail-row" data-item-id="${item.item_id}">
            <a href="item.html#${item.item_id}" tabindex="-1" aria-hidden="true"><img src="${item.image}" alt="" loading="lazy"></a>
            <div>
                <p class="rt-eyebrow">${escapeHtml(item.store.name || '')}</p>
                <h3><a class="rt-detail-row-title" href="item.html#${item.item_id}">${escapeHtml(item.title)}</a></h3>
                <p>${escapeHtml(item.price_display)} · Size ${escapeHtml(item.size)} · ${escapeHtml(item.condition)} condition</p>
                <p>${escapeHtml(item.description || '')}</p>
                <a class="rt-text-link" href="${storeLink(item.store)}">Store details <span aria-hidden="true">→</span></a>
            </div>
        </article>
    `).join('');
}

function showToast(message) {
    let toast = document.querySelector('.rt-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'rt-toast';
        toast.setAttribute('role', 'status');
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

function escapeHtml(text) {
    return String(text == null ? '' : text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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

function loadServerFavoriteIds() {
    if (!api()) return Promise.resolve([]);
    return api().request("favorites", { visitor: true })
        .then(data => (data.items || []).map(item => item.item_id))
        .catch(() => []);
}
