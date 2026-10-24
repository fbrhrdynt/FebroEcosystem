(() => {
  'use strict';
  const buttons = Array.from(document.querySelectorAll('[data-filter]'));
  const cards = Array.from(document.querySelectorAll('[data-category]'));
  const search = document.querySelector('#gameSearch');
  const empty = document.querySelector('#emptyState');
  const grid = document.querySelector('#gamesGrid');
  let active = 'all';
  function applyFilter() {
    const term = search.value.trim().toLocaleLowerCase('id-ID');
    let shown = 0;
    for (const card of cards) {
      const typeMatch = active === 'all' || card.dataset.category === active;
      const textMatch = !term || (card.dataset.search + ' ' + card.textContent).toLocaleLowerCase('id-ID').includes(term);
      const visible = typeMatch && textMatch;
      card.hidden = !visible;
      if (visible) shown++;
    }
    empty.hidden = shown > 0;
    grid.hidden = shown === 0;
  }
  for (const button of buttons) {
    button.addEventListener('click', () => {
      active = button.dataset.filter;
      buttons.forEach(item => {
        const selected = item === button;
        item.classList.toggle('active', selected);
        item.setAttribute('aria-pressed', String(selected));
      });
      applyFilter();
    });
  }
  search.addEventListener('input', applyFilter);
  document.querySelector('#resetSearch').addEventListener('click', () => {
    search.value = '';
    buttons.find(button => button.dataset.filter === 'all').click();
    search.focus();
  });
  document.querySelector('#year').textContent = String(new Date().getFullYear());
})();
