// Invoking strict mode https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode#invoking_strict_mode
'use strict';

/**
Description of the available api
GET https://lego-api-blue.vercel.app/deals

Search for specific deals

This endpoint accepts the following optional query string parameters:

- `page` - page of deals to return
- `size` - number of deals to return

GET https://lego-api-blue.vercel.app/sales

Search for current Vinted sales for a given lego set id

This endpoint accepts the following optional query string parameters:

- `id` - lego set id to return
*/



//
//
//
// COMMIT AND PUSH YOUR CODE TO GITHUB BEFORE CONTINUING
//
//
//



// current deals on the page
let currentDeals = [];
let currentPagination = {};
const FAVORITES_STORAGE_KEY = 'lego-deals-favorites-v1';

const loadFavoriteDealIds = () => {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

let favoriteDealIds = new Set(loadFavoriteDealIds());

let activeFilters = {
  favoritesOnly: false,
  minDiscount: 0,
  minComments: 0,
  minTemperature: 0,
  opportunityMin: 0,
};

// instantiate the selectors
const selectShow = document.querySelector('#show-select');
const selectPage = document.querySelector('#page-select');
const selectLegoSetIds = document.querySelector('#lego-set-id-select');
const sectionDeals = document.querySelector('#deals');
const spanNbDeals = document.querySelector('#nbDeals');
const spanNbFavorites = document.querySelector('#nbFavorites');
const spanP50Sales = document.querySelector('#p50Sales');
const favoritesOnlyButton = document.querySelector('#favorites-only-button');
const discountRange = document.querySelector('#filter-discount-range');
const commentsRange = document.querySelector('#filter-comments-range');
const temperatureRange = document.querySelector('#filter-temperature-range');
const discountValue = document.querySelector('#filter-discount-value');
const commentsValue = document.querySelector('#filter-comments-value');
const temperatureValue = document.querySelector('#filter-temperature-value');
// Feature 5 & Feature 6 - Sort by price and date
const selectSortByPriceOrByDate = document.querySelector('#sort-select');
const resetFiltersButton = document.querySelector('#reset-filters');
const opportunityScoreRange = document.querySelector('#opportunity-score-range');
const opportunityScoreValue = document.querySelector('#opportunity-score-value');
// Feature 7 - Display Vinted sales
const SelectorLegoSetId = document.querySelector('#lego-set-id-select');

const LEGACY_IMAGE =
  'https://images.brickset.com/sets/images/75192-1.jpg?201710130915';

const getDealKey = deal => {
  if (deal.uuid) {
    return deal.uuid;
  }
  return `${deal.id}-${deal.link}`;
};

const saveFavoriteDealIds = () => {
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...favoriteDealIds]));
};

const toggleFavorite = dealKey => {
  if (favoriteDealIds.has(dealKey)) {
    favoriteDealIds.delete(dealKey);
  } else {
    favoriteDealIds.add(dealKey);
  }

  saveFavoriteDealIds();
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const computeOpportunityScore = deal => {
  const nowSeconds = Date.now() / 1000;
  const discount = Number(deal.discount) || 0;
  const temperature = Number(deal.temperature) || 0;
  const comments = Number(deal.comments) || 0;
  const price = Number(deal.price) || 0;
  const published = Number(deal.published) || nowSeconds;

  const discountScore = clamp((discount / 70) * 100, 0, 100);
  const recencyHours = Math.max(0, (nowSeconds - published) / 3600);
  const recencyScore = clamp(100 * Math.exp(-recencyHours / 48), 0, 100);
  const temperatureScore = clamp((temperature / 500) * 100, 0, 100);
  const commentsScore = clamp((Math.log1p(comments) / Math.log1p(200)) * 100, 0, 100);
  const priceScore = clamp(((120 - price) / 120) * 100, 0, 100);

  const weightedScore =
    discountScore * 0.4 +
    recencyScore * 0.2 +
    temperatureScore * 0.2 +
    commentsScore * 0.1 +
    priceScore * 0.1;

  const confidence = deal.price && deal.published && deal.discount !== null ? 1 : 0.9;

  return Math.round(clamp(weightedScore * confidence, 0, 100));
};

const getOpportunityLabel = score => {
  if (score >= 85) {
    return 'Exceptionnel';
  }
  if (score >= 70) {
    return 'Tres bon';
  }
  if (score >= 55) {
    return 'Correct';
  }
  return 'Moyen';
};

const getOpportunityTierClass = score => {
  if (score >= 85) {
    return 'opportunity-top';
  }
  if (score >= 70) {
    return 'opportunity-high';
  }
  if (score >= 55) {
    return 'opportunity-medium';
  }
  return 'opportunity-low';
};

const enrichDealsWithOpportunity = deals => {
  return deals.map(deal => {
    const opportunityScore = computeOpportunityScore(deal);

    return {
      ...deal,
      dealKey: getDealKey(deal),
      opportunityScore,
      opportunityLabel: getOpportunityLabel(opportunityScore),
      opportunityClass: getOpportunityTierClass(opportunityScore),
    };
  });
};

/**
 * Set global value
 * @param {Array} result - deals to display
 * @param {Object} meta - pagination meta info
 */
const setCurrentDeals = ({result, meta}) => {
  currentDeals = enrichDealsWithOpportunity(result);
  currentPagination = meta;
};

/**
 * Fetch deals from api
 * @param  {Number}  [page=1] - current page to fetch
 * @param  {Number}  [size=12] - size of the page
 * @return {Object}
 */
const fetchDeals = async (page = 1, size = 6) => {
  try {
    const response = await fetch(
      `https://lego-api-blue.vercel.app/deals?page=${page}&size=${size}`
    );
    const body = await response.json();

    if (body.success !== true) {
      console.error(body);
      return {currentDeals, currentPagination};
    }

    return body.data;
  } catch (error) {
    console.error(error);
    return {currentDeals, currentPagination};
  }
};

/**
 * Render list of deals
 * @param  {Array} deals
 */
const renderDeals = deals => {
  if (deals.length === 0) {
    sectionDeals.innerHTML = '<div class="empty-state">Aucun deal ne correspond a vos filtres.</div>';
    return;
  }

  const template = deals
    .map(deal => {
      const discount = Number(deal.discount) || 0;
      const price = Number(deal.price) || 0;
      const oldPriceValue = discount > 0 ? price / (1 - discount / 100) : null;
      const oldPrice = oldPriceValue ? oldPriceValue.toFixed(2) : null;
      const savingsValue = oldPriceValue ? oldPriceValue - price : null;
      const comments = Number(deal.comments) || 0;
      const temperature = Number(deal.temperature) || 0;
      const publishedAt = new Date(deal.published * 1000).toLocaleString('fr-FR');
      const image = deal.photo || deal.image || LEGACY_IMAGE;
      const isFavorite = favoriteDealIds.has(deal.dealKey);

      return `
      <article class="deal-card" id="${deal.uuid}">
        <figure class="deal-image">
          <img src="${image}" alt="${deal.title}" loading="lazy" />
        </figure>
        <div class="deal-content">
          <div class="deal-meta">
            <div class="deal-signals">
              <span class="temperature">${Math.round(temperature)}°</span>
              <span class="opportunity-pill ${deal.opportunityClass}">
                Opportunite ${deal.opportunityScore}/100 - ${deal.opportunityLabel}
              </span>
            </div>
            <span class="published">Poste le ${publishedAt}</span>
          </div>
          <h3 class="deal-title">${deal.title}</h3>
          <div class="price-line">
            <span class="price">${formatPrice(price)}</span>
            ${oldPrice ? `<span class="old-price">${formatPrice(oldPrice)}</span>` : ''}
            ${discount ? `<span class="discount">-${discount}%</span>` : ''}
            ${savingsValue ? `<span class="savings">-${formatPrice(savingsValue)}</span>` : ''}
          </div>
          <div class="deal-subline">
            <span>Set #${deal.id}</span>
            <span>•</span>
            <span>${comments} commentaires</span>
          </div>
          <div class="deal-actions">
            <div class="deal-actions-left">
              <button
                type="button"
                class="favorite-toggle ${isFavorite ? 'is-favorite' : ''}"
                data-deal-key="${deal.dealKey}"
                aria-pressed="${isFavorite}"
              >
                ${isFavorite ? '★ Favori' : '☆ Favori'}
              </button>
              <span class="comment-count">💬 ${comments}</span>
            </div>
            <a class="deal-link" href="${deal.link}" target="_blank" rel="noreferrer">Voir le deal</a>
          </div>
        </div>
      </article>
    `;
    })
    .join('');

  sectionDeals.innerHTML = template;
};

/**
 * Render page selector
 * @param  {Object} pagination
 */
const renderPagination = pagination => {
  const {currentPage = 1, pageCount = 1} = pagination;
  const options = Array.from(
    {'length': pageCount},
    (value, index) => `<option value="${index + 1}">${index + 1}</option>`
  ).join('');

  selectPage.innerHTML = options;
  selectPage.selectedIndex = currentPage - 1;
};

/**
 * Render lego set ids selector
 * @param  {Array} lego set ids
 */
const renderLegoSetIds = deals => {
  const ids = getIdsFromDeals(deals);
  const options = ids.map(id => 
    `<option value="${id}">${id}</option>`
  ).join('');

  selectLegoSetIds.innerHTML = options;
};

/**
 * Render page selector
 * @param  {Object} pagination
 */
const renderIndicators = pagination => {
  const {count = 0} = pagination;

  spanNbDeals.textContent = count;
  spanNbFavorites.textContent = String(favoriteDealIds.size);

  if (currentDeals.length === 0) {
    spanP50Sales.textContent = '0';
    return;
  }

  const prices = [...currentDeals]
    .map(deal => Number(deal.price) || 0)
    .sort((a, b) => a - b);

  const middle = Math.floor(prices.length / 2);
  const median =
    prices.length % 2 === 0
      ? (prices[middle - 1] + prices[middle]) / 2
      : prices[middle];

  spanP50Sales.textContent = formatPrice(median);
};

const render = (deals, pagination) => {
  renderDeals(deals);
  renderPagination(pagination);
  renderIndicators(pagination);
  renderLegoSetIds(deals);
};

const formatPrice = price => `${Number(price).toFixed(2).replace('.', ',')}€`;

const applyAllFilters = deals => {
  return deals.filter(deal => {
    if (activeFilters.favoritesOnly && !favoriteDealIds.has(deal.dealKey)) {
      return false;
    }
    if (Number(deal.discount) < activeFilters.minDiscount) {
      return false;
    }
    if (Number(deal.comments) < activeFilters.minComments) {
      return false;
    }
    if (Number(deal.temperature) < activeFilters.minTemperature) {
      return false;
    }
    if (Number(deal.opportunityScore) < activeFilters.opportunityMin) {
      return false;
    }
    return true;
  });
};

const setFavoritesOnlyFilter = enabled => {
  activeFilters.favoritesOnly = enabled;
  favoritesOnlyButton.classList.toggle('is-active', enabled);
  favoritesOnlyButton.textContent = enabled ? '★ Favoris uniquement' : '☆ Favoris uniquement';
};

const syncSortSelects = value => {
  selectSortByPriceOrByDate.value = value;
};

const sortDeals = (deals, sortValue) => {
  const copyDeals = [...deals];

  if (sortValue === 'price-asc') {
    return copyDeals.sort((a, b) => a.price - b.price);
  }
  if (sortValue === 'price-desc') {
    return copyDeals.sort((a, b) => b.price - a.price);
  }
  if (sortValue === 'date-asc') {
    return copyDeals.sort((a, b) => a.published - b.published);
  }
  if (sortValue === 'opportunity-desc') {
    return copyDeals.sort((a, b) => b.opportunityScore - a.opportunityScore);
  }

  return copyDeals.sort((a, b) => b.published - a.published);
};

const refreshView = () => {
  const filteredDeals = applyAllFilters(currentDeals);
  const sortedDeals = sortDeals(filteredDeals, selectSortByPriceOrByDate.value);
  render(sortedDeals, currentPagination);
};

const setThresholdFilters = ({minDiscount, minComments, minTemperature}) => {
  activeFilters.minDiscount = minDiscount;
  activeFilters.minComments = minComments;
  activeFilters.minTemperature = minTemperature;

  discountRange.value = String(minDiscount);
  commentsRange.value = String(minComments);
  temperatureRange.value = String(minTemperature);
  discountValue.textContent = String(minDiscount);
  commentsValue.textContent = String(minComments);
  temperatureValue.textContent = String(minTemperature);
};

/**
 * Declaration of all Listeners
 */

/**
 * Select the number of deals to display
 */
selectShow.addEventListener('change', async event => {
  const deals = await fetchDeals(currentPagination.currentPage, parseInt(event.target.value));

  setCurrentDeals(deals);
  refreshView();
});



let selectedPage = 1;
/**
 * Feature 1 - Browse pages
 * * we enter this everry time we change the variable
 */
selectPage.addEventListener('change', async event => {
  selectedPage = parseInt(event.target.value);
  const deals = await fetchDeals(selectedPage, currentPagination.pageSize);

  setCurrentDeals(deals);
  refreshView();
});

discountRange.addEventListener('input', event => {
  activeFilters.minDiscount = Number(event.target.value);
  discountValue.textContent = event.target.value;
  refreshView();
});

commentsRange.addEventListener('input', event => {
  activeFilters.minComments = Number(event.target.value);
  commentsValue.textContent = event.target.value;
  refreshView();
});

temperatureRange.addEventListener('input', event => {
  activeFilters.minTemperature = Number(event.target.value);
  temperatureValue.textContent = event.target.value;
  refreshView();
});

favoritesOnlyButton.addEventListener('click', () => {
  setFavoritesOnlyFilter(!activeFilters.favoritesOnly);
  refreshView();
});

opportunityScoreRange.addEventListener('input', event => {
  activeFilters.opportunityMin = Number(event.target.value);
  opportunityScoreValue.textContent = event.target.value;
  refreshView();
});

/*
Feature 5 & Feature 6 - Sort by price and date
So that I can easily identify cheapest and expensive deals
*/
selectSortByPriceOrByDate.addEventListener('change', event => {
  syncSortSelects(event.target.value);
  refreshView();
});

resetFiltersButton.addEventListener('click', () => {
  activeFilters = {
    favoritesOnly: false,
    minDiscount: 0,
    minComments: 0,
    minTemperature: 0,
    opportunityMin: 0,
  };

  setFavoritesOnlyFilter(false);
  setThresholdFilters({
    minDiscount: 0,
    minComments: 0,
    minTemperature: 0,
  });
  opportunityScoreRange.value = '0';
  opportunityScoreValue.textContent = '0';
  syncSortSelects('date-desc');
  refreshView();
});

/*
Feature 7 - Display Vinted sales
*/
SelectorLegoSetId.addEventListener('change', event => {
  window.open(`https://www.vinted.fr/catalog?search_text=Lego+${event.target.value}`);
});

sectionDeals.addEventListener('click', event => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const favoriteButton = target.closest('.favorite-toggle');
  if (!favoriteButton) {
    return;
  }

  const dealKey = favoriteButton.getAttribute('data-deal-key');
  if (!dealKey) {
    return;
  }

  toggleFavorite(dealKey);
  refreshView();
});


document.addEventListener('DOMContentLoaded', async () => {
  const deals = await fetchDeals();

  setCurrentDeals(deals);
  setFavoritesOnlyFilter(false);
  setThresholdFilters({
    minDiscount: 0,
    minComments: 0,
    minTemperature: 0,
  });
  opportunityScoreRange.value = '0';
  opportunityScoreValue.textContent = '0';
  syncSortSelects('date-desc');
  refreshView();
});