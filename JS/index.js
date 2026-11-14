/*
    JavaScript File for index.html
*/

const productList = document.getElementsByClassName('rt-product-card');
const productInfo = document.getElementsByClassName('rt-product-info');
console.log(productInfo);
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

filterPanel.addEventListener('change', () => {
        let searchFilter = [];
        let storeFilter = [];
        let categoryFilter = [];
        let sizeFilter = [];
        let priceFilter = [];
        if(searchBar.value.trim() !== ''){
            searchFilter = search(searchBar.value.toLowerCase().replace(/\s/g,''));
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
            console.log(`min: ${min} max: ${max}`)
            priceFilter = filterPrices(min, max);
        }
        
        console.log("searchFilter:", searchFilter);
        console.log("storeFilter:", storeFilter);
        console.log("categoryFilter: ", categoryFilter);
        console.log("sizeFilter:", sizeFilter);
        console.log("priceFilter:", priceFilter);
        
        updateFilters(searchFilter, storeFilter, categoryFilter, sizeFilter, priceFilter);
});

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
    numResults.textContent = "8 pieces";

    searchBar.value = '';
    storesFilter.selectedIndex = 0;
    categoriesFilter.selectedIndex = 0;
    sizesFilter.selectedIndex = 0;
    pricesFilter.selectedIndex = 0;
}

//Function hides all elements with that have been filtered out
function showFilters(items){
    let count = 8;
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

    numResults.textContent = `${count} pieces`;
    if(count == 0){
        emptyResults.removeAttribute('hidden');
    }
}

//Function implements the search filtering
function search(query){
    const searchResults = Array.from(productInfo).map(item => {
        const itemName = item.getElementsByClassName('rt-product-title-row')[0].textContent.toLowerCase().replace(/\s/g,'');
        if(!itemName.includes(query)){
            return item.parentElement;
        }
    });
    return searchResults;
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
    if(value == "featured"){
        const sortedVisibleProducts = Array.from(visibleProducts).sort((a,b) => {
            const aId = Number(a.getAttribute(
            'data-item-id').split('item-')[1]);
            const bId = Number(b.getAttribute(
            'data-item-id').split('item-')[1]);

            return aId - bId;
        })

        grid.append(...sortedVisibleProducts);
    }
    else if(value == "price-low"){
        const sortedVisibleProducts = Array.from(visibleProducts).sort((a,b) => {
            const aPrice = Number(a.getAttribute(
            'data-price'));
            const bPrice = Number(b.getAttribute(
            'data-price'));

            return aPrice - bPrice;
        })

        grid.append(...sortedVisibleProducts);
    }
    else if(value == "price-high"){
        const sortedVisibleProducts = Array.from(visibleProducts).sort((a,b) => {
            const aPrice = Number(a.getAttribute(
            'data-price'));
            const bPrice = Number(b.getAttribute(
            'data-price'));

            return bPrice - aPrice;
        })

        grid.append(...sortedVisibleProducts);
    }
    else if(value == "recent"){
        const sortedVisibleProducts = Array.from(visibleProducts).sort((a,b) => {
            console.log(a.getAttribute('data-item-id'));
            const aId = Number(a.getAttribute(
            'data-item-id').split('item-')[1]);

            const bId = Number(b.getAttribute(
            'data-item-id').split('item-')[1]);
            
            return bId - aId;
        })
        grid.append(...sortedVisibleProducts);
    }
});