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

// instantiate the selectors
const selectShow = document.querySelector('#show-select');
const selectPage = document.querySelector('#page-select');
const selectLegoSetIds = document.querySelector('#lego-set-id-select');
const sectionDeals= document.querySelector('#deals');
const spanNbDeals = document.querySelector('#nbDeals');
// Feature 2 - Filter by best discount
const buttonBestDiscount = document.querySelector('#filter-best-discount');
// Feature 3 - Filter by most commented
const buttonMostCommented = document.querySelector('#filter-most-commented');
// Feature 4 - Filter by hot deals
const buttonHotDeals = document.querySelector('#filter-hot-deals');
// Feature 5 & Feature 6- Sort by price and date
const SelectSortByPriceOrByDate = document.querySelector('#sort-select');

/**
 * Set global value
 * @param {Array} result - deals to display
 * @param {Object} meta - pagination meta info
 */
const setCurrentDeals = ({result, meta}) => {
  currentDeals = result;
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
  const fragment = document.createDocumentFragment();
  const div = document.createElement('div');
  const template = deals
    .map(deal => {
      return `
      <div class="deal" id=${deal.uuid}>
        <span>${deal.id}</span>
        <span>${deal.discount}%</span>
        <span>${deal.comments}</span>
        <span>${deal.temperature}</span>
        <span>${new Date(deal.published * 1000).toLocaleString('fr-FR')}</span>
        <a href="${deal.link}">${deal.title}</a>
        <span>${deal.price}</span>
      </div>
    `;
    })
    .join('');

  div.innerHTML = template;
  fragment.appendChild(div);
  sectionDeals.innerHTML = '<h2>Deals</h2>';
  sectionDeals.appendChild(fragment);
};

/**
 * Render page selector
 * @param  {Object} pagination
 */
const renderPagination = pagination => {
  const {currentPage, pageCount} = pagination;
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
  const {count} = pagination;

  spanNbDeals.innerHTML = count;
};

const render = (deals, pagination) => {
  renderDeals(deals);
  renderPagination(pagination);
  renderIndicators(pagination);
  renderLegoSetIds(deals)
};

/**
 * Declaration of all Listeners
 */

/**
 * Select the number of deals to display
 */
selectShow.addEventListener('change', async (event) => {
  const deals = await fetchDeals(currentPagination.currentPage, parseInt(event.target.value));

  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});



var SelectedPage = 1; // so I can reuse it other places in the code, for example when I filter by best discount, I want to keep the same page but with the filtered deals
/**
 * Feature 1 - Browse pages
 * * we enter this everry time we change the variable
 */
selectPage.addEventListener('change', async (event) => {
  SelectedPage = parseInt(event.target.value);
  const deals = await fetchDeals(SelectedPage, currentPagination.pageSize);

  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});

/**
 * Feature 2 - Filter by best discount
 * So that I can browse deals with a discount more important than 20%
 */
buttonBestDiscount.addEventListener('click', async (event) => {
  console.log("test");
  console.log(deals);
  console.log(currentDeals);
  
  const filteredDeals = currentDeals.filter(deal => deal.discount > 20);
  console.log(filteredDeals);

  //setCurrentDeals(filteredDeals);
  console.log(currentPagination);
  render(filteredDeals, SelectedPage);
});

/*
Feature 3 - Filter by most commented
So that I can browse deals with more than 5 comments
*/
buttonMostCommented.addEventListener('click', async (event) => {
  const filteredDeals = currentDeals.filter(deal => deal.comments > 5);

  //setCurrentDeals(filteredDeals);
  render(filteredDeals, SelectedPage);
});

/*
Feature 4 - Filter by hot deals
So that I can browse deals with a temperature more important than 100
*/
buttonHotDeals.addEventListener('click', async (event) => {
  console.log("test");
  const filteredDeals = currentDeals.filter(deal => deal.comments > 5);

  //setCurrentDeals(filteredDeals);
  render(filteredDeals, SelectedPage);
});

/*
Feature 5 & Feature 6 - Sort by price and date
So that I can easily identify cheapest and expensive deals
*/
SelectSortByPriceOrByDate.addEventListener('change', (event) => {
  if (event.target.value === "price-asc") {
    const copyCurrentDeals = [...currentDeals];
    const sortedDeals = copyCurrentDeals.sort((a, b) => a.price - b.price);

    currentDeals = sortedDeals;
    render(currentDeals, currentPagination);
  }

  if (event.target.value === "price-desc") {
    const copyCurrentDeals = [...currentDeals];
    const sortedDeals = copyCurrentDeals.sort((a, b) => b.price - a.price);

    currentDeals = sortedDeals;
    render(currentDeals, currentPagination);
  }

  if (event.target.value === "date-desc") {
    const copyCurrentDeals = [...currentDeals];
    const sortedDeals = copyCurrentDeals.sort((a, b) => b.published - a.published);

    currentDeals = sortedDeals;
    render(currentDeals, currentPagination);
  }

  if (event.target.value === "date-asc") {
    const copyCurrentDeals = [...currentDeals];
    const sortedDeals = copyCurrentDeals.sort((a, b) => a.published - b.published);

    currentDeals = sortedDeals;
    render(currentDeals, currentPagination);
  }
});



document.addEventListener('DOMContentLoaded', async () => {
  const deals = await fetchDeals();

  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});