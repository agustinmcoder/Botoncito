/* shop.js: renderiza la tienda, filtros, compra y modal */
document.addEventListener('DOMContentLoaded', ()=> {
  const itemsGrid = document.getElementById('itemsGrid');
  const filterType = document.getElementById('filterType');
  const filterOwned = document.getElementById('filterOwned');
  const sortPrice = document.getElementById('sortPrice');
  const shopDiamonds = document.getElementById('shopDiamonds');
  const buyModal = document.getElementById('buyModal');
  const modalContent = document.getElementById('modalContent');
  const confirmBuy = document.getElementById('confirmBuy');
  const cancelBuy = document.getElementById('cancelBuy');

  let items = loadItems();
  let state = loadState();
  shopDiamonds.textContent = state.diamonds || 0;

  function render(){
    items = loadItems();
    state = loadState();
    shopDiamonds.textContent = state.diamonds || 0;
    let list = items.slice();

    // filtros
    const t = filterType.value;
    if (t !== 'all') list = list.filter(i=>i.type===t);
    const ownedFilter = filterOwned.value;
    if (ownedFilter === 'owned') list = list.filter(i=> state.owned && state.owned[i.id]);
    if (ownedFilter === 'notowned') list = list.filter(i=> !(state.owned && state.owned[i.id]));

    // ordenar
    list.sort((a,b)=> sortPrice.value === 'asc' ? a.price - b.price : b.price - a.price);

    itemsGrid.innerHTML = '';
    for (const it of list){
      const card = document.createElement('div');
      card.className = 'item-card';
      card.innerHTML = `
        <div class="item-thumb pixelated">${it.thumb ? `<img src="${it.thumb}" alt="${it.name}" style="max-width:100%;max-height:100%">` : it.name}</div>
        <div class="item-title">${it.name}</div>
        <div class="item-meta">${it.type.toUpperCase()} • ${formatPrice(it.price)}</div>
        <div class="item-actions"></div>
      `;
      const actions = card.querySelector('.item-actions');
      if (state.owned && state.owned[it.id]){
        const applyBtn = document.createElement('button');
        applyBtn.className = 'btn';
        applyBtn.textContent = 'Aplicar';
        applyBtn.onclick = ()=> { applyItem(it.id); render(); };
        actions.appendChild(applyBtn);
      } else {
        const buyBtn = document.createElement('button');
        buyBtn.className = 'btn';
        buyBtn.textContent = 'Comprar';
        buyBtn.onclick = ()=> openBuyModal(it);
        actions.appendChild(buyBtn);
      }
      itemsGrid.appendChild(card);
    }
  }

  function openBuyModal(item){
    modalContent.innerHTML = `<strong>${item.name}</strong><p>Precio: ${formatPrice(item.price)}</p>`;
    buyModal.classList.remove('hidden');
    confirmBuy.onclick = ()=> {
      const res = buyItem(item.id);
      if (res.ok){
        shopDiamonds.textContent = loadState().diamonds;
        buyModal.classList.add('hidden');
        render();
      } else {
        showToast(res.msg);
      }
    };
  }

  cancelBuy.onclick = ()=> buyModal.classList.add('hidden');

  filterType.onchange = render;
  filterOwned.onchange = render;
  sortPrice.onchange = render;

  render();
});
