/*
    JavaScript File for index.html
*/


const productList = document.getElementsByClassName('rt-product-card');
const productInfo = document.getElementsByClassName('rt-product-info');

/*
    1. Filter clothes. Filter by size, category, and price. The list updates and shows the number of results. If nothing matches, users can clear the filters.
*/

const filterPanel = document.getElementsByClassName('rt-filter-panel')[0];
const filterClear = document.getElementById('clear-filters');
const emptyResults = document.getElementById('empty-results');
const filterClearNone = emptyResults.getElementsByClassName('rt-button')[0];
const searchBar = document.getElementById('clothes-search');
const storesFilter = document.getElementById('filter-store');
const categoriesFilter = document.getElementById('filter-category');
const sizesFilter = document.getElementById('filter-size');
const pricesFilter = document.getElementById('filter-price');
const numResults = document.getElementById('results-count');

filterPanel.addEventListener('change', applyFilters);

// Part C (HE-11): search as you type, after a short pause, instead of only on Enter
let searchTimer;
searchBar.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applyFilters, 200);
});

// Part C (HE-15): Stores page links here with ?store=..., so start with that store picked
const startStore = new URLSearchParams(window.location.search).get('store');
if (startStore && Array.from(storesFilter.options).some(option => option.value === startStore)) {
    storesFilter.value = startStore;
    applyFilters();
}

function applyFilters() {
    let searchFilter = [];
    let storeFilter = [];
    let categoryFilter = [];
    let sizeFilter = [];
    let priceFilter = [];
    if(searchBar.value.trim() !== ''){
        searchFilter = search(searchBar.value);
    }
    if(storesFilter.value != ''){
        storeFilter = filterStores(storesFilter.value);
    }
    if(categoriesFilter.value != ''){
        categoryFilter = filterCategories(categoriesFilter.value)
    }
    if(sizesFilter.value != ''){
        sizeFilter = filterSizes(sizesFilter.value);
    }
    if(pricesFilter.value != ''){
        const min = pricesFilter.value.split('-')[0];
        const max = pricesFilter.value.split('-')[1];

        priceFilter = filterPrices(min, max);
    }
    

    
    updateFilters(searchFilter, storeFilter, categoryFilter, sizeFilter, priceFilter);
}

filterClear.addEventListener('click', clearFilters);
filterClearNone.addEventListener('click', clearFilters);

// This function updates the filtered list of the global array, ensuring no duplicates
function updateFilters(searchFilter, storeFilter, categoryFilter, sizeFilter, priceFilter) {
    let filteredItems = [];
    let numFilters = searchFilter.length + storeFilter.length + categoryFilter.length + sizeFilter.length + priceFilter.length;
    if(numFilters == 0){
        clearFilters();
    }
    else{
        filteredItems = [...new Set([...searchFilter,...storeFilter,...categoryFilter,...sizeFilter,...priceFilter])];
        showFilters(filteredItems);
    }

    
}

//Function clears all filters and resets the filtered list
function clearFilters() {
    Array.from(productList).forEach(article => {
        if(article.hasAttribute('hidden')){
            article.removeAttribute('hidden');
        }
    });
    emptyResults.setAttribute('hidden','');
    numResults.textContent = piecesLabel(productList.length);

    searchBar.value = '';
    storesFilter.selectedIndex = 0;
    categoriesFilter.selectedIndex = 0;
    sizesFilter.selectedIndex = 0;
    pricesFilter.selectedIndex = 0;
}

//Function hides all elements with that have been filtered out
function showFilters(items){
    let count = productList.length;
    Array.from(productList).forEach(article => {
        if(article.hasAttribute('hidden')){
            article.removeAttribute('hidden');
        }
    });
    emptyResults.setAttribute('hidden','');

    Array.from(productList).forEach(article => {
        if(items.includes(article)){
            article.setAttribute('hidden','');
            count--;
        }
    });

    numResults.textContent = piecesLabel(count);
    if(count == 0){
        emptyResults.removeAttribute('hidden');
    }
}

function piecesLabel(count) {
    return count === 1 ? '1 piece' : `${count} pieces`;
}

// Words people might type that mean one of our categories
const SEARCH_SYNONYMS = {
    coat: 'jacket', coats: 'jacket', outerwear: 'jacket', blazers: 'blazer',
    jeans: 'jean', denim: 'jean', pants: 'jean', sweaters: 'sweater', jumper: 'sweater', knit: 'sweater',
    shirts: 'shirt', top: 'shirt', tops: 'shirt', blouse: 'shirt', dresses: 'dress',
};

// Turns "Jackets" into "jacket" so plural and singular searches match
function normalizeWord(word) {
    word = word.toLowerCase();
    if (SEARCH_SYNONYMS[word]) return SEARCH_SYNONYMS[word];
    if (word.length > 3 && word.endsWith('es') && /(sh|ch|ss|x)es$/.test(word)) return word.slice(0, -2);
    if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
    return word;
}

//Function implements the search filtering. Every word typed has to match the piece somewhere.
function search(query){
    const words = query.toLowerCase().split(/\s+/).filter(Boolean).map(normalizeWord);
    return Array.from(productList).map(card => {
        const haystack = [
            card.querySelector('.rt-product-title-row h3').textContent,
            card.querySelector('.rt-store-link').textContent,
            card.getAttribute('data-category'),
        ].join(' ').toLowerCase().split(/[^a-z]+/).filter(Boolean).map(normalizeWord).join(' ');
        const matches = words.every(word => haystack.includes(word));
        if (!matches) {
            return card;
        }
    });
}

//Function implements filtering by store
function filterStores(value){
    const storeResults = Array.from(productList).map(item => {
        const storeName = item.getAttribute('data-store');
        if(storeName != value){
            return item;
        }
    });

    return storeResults;
}

//Function implements filtering by Category
function filterCategories(value){
    const categoryResults = Array.from(productList).map(item => {
        const categoryName = item.getAttribute('data-category');
        if(categoryName != value){
            return item;
        }
    });

    return categoryResults;
}

//Function implements filtering by Size
function filterSizes(value){
    const sizeResults = Array.from(productList).map(item => {
        const size = item.getAttribute('data-size');
        if(size != value){
            
            return item;
        }
    });

    return sizeResults;
}

//Function implements filtering by Price
function filterPrices(min, max){
    const priceResults = Array.from(productList).map(item => {
        const priceAmount = Number(item.getAttribute('data-price'));
        if(priceAmount > max || priceAmount < min){
            return item;
        }
    });

    return priceResults;
}


/*
    Implement SortBy
*/
const grid = document.getElementById('product-grid');
const sortItems = document.getElementById('sort-items');
sortItems.addEventListener('change', () => {
    const value = sortItems.value;
    const visibleProducts = Array.from(productList).map(product => {
        if(!product.hasAttribute('hidden')){
            return product;
        }
    }).filter(product => product !== undefined);
    let sortedVisibleProducts = []
    if(value == "featured"){
        sortedVisibleProducts = Array.from(visibleProducts).sort((a,b) => {
            const aId = Number(a.getAttribute(
            'data-item-id').split('item-')[1]);
            const bId = Number(b.getAttribute(
            'data-item-id').split('item-')[1]);

            return aId - bId;
        });
    }
    else if(value == "price-low"){
        sortedVisibleProducts = Array.from(visibleProducts).sort((a,b) => {
            const aPrice = Number(a.getAttribute(
            'data-price'));
            const bPrice = Number(b.getAttribute(
            'data-price'));

            return aPrice - bPrice;
        });
    }
    else if(value == "price-high"){
        sortedVisibleProducts = Array.from(visibleProducts).sort((a,b) => {
            const aPrice = Number(a.getAttribute(
            'data-price'));
            const bPrice = Number(b.getAttribute(
            'data-price'));

            return bPrice - aPrice;
        });
    }
    else if(value == "recent"){
        sortedVisibleProducts = Array.from(visibleProducts).sort((a,b) => {
            const aId = Number(a.getAttribute(
            'data-item-id').split('item-')[1]);

            const bId = Number(b.getAttribute(
            'data-item-id').split('item-')[1]);
            
            return bId - aId;
        });
    }

    grid.append(...sortedVisibleProducts);
});



/*
    2. Save favorites. Clicking the heart changes it to show the item is saved, and the item appears on the Favorites page. Clicking again removes it.
*/
// Only one favorites request for the whole grid, shared by every heart
let favoritesRequest = null;

const favoriteButtons = document.getElementsByClassName('rt-favorite-button');
Array.from(favoriteButtons).forEach(button => {
    const card = button.closest('.rt-product-card');
    const itemId = card.getAttribute('data-item-id');
    const title = card.querySelector('h3').textContent;
    loadServerFavorites().then(favorites => {
        if(favorites && favorites.includes(itemId)){
            setHeart(button, true, title);
        }
    });

    button.addEventListener('click', () => {
        const saved = !button.classList.contains('is-saved');
        setHeart(button, saved, title);
        showToast(saved ? `Saved ${title} to your favorites.` : `Removed ${title} from your favorites.`);
        saveServerFavorite(itemId, saved);
    });
});

function setHeart(button, saved, title) {
    button.classList.toggle('is-saved', saved);
    button.setAttribute('aria-pressed', saved ? 'true' : 'false');
    button.setAttribute('aria-label', saved ? `Remove ${title} from favorites` : `Save ${title} to favorites`);
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

//-- API stuff --> copied from Ismael's tryon.js
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
    if (favoritesRequest) return favoritesRequest;
    return favoritesRequest = api().request("favorites", { visitor: true }).then(data => {
      return (data.items || []).map(item => item.item_id);
    }).catch(() => null);
  }