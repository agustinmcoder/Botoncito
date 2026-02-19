/* inventory.js: muestra items comprados y permite activar/desactivar */
document.addEventListener('DOMContentLoaded', ()=>{
  const invDiamonds = document.getElementById('invDiamonds');
  const invButtons = document.getElementById('invButtons');
  const invSounds = document.getElementById('invSounds');
  const invBgs = document.getElementById('invBgs');

  function render(){
    const state = loadState();
    const items = loadItems();
    invDiamonds.textContent = state.diamonds || 0;

    const ownedIds = Object.keys(state.owned || {}).filter(k=> state.owned[k]);

    function renderSection(container, type){
      container.innerHTML = '';
      const list = items.filter(i=> ownedIds.includes(i.id) && i.type === type);
      if (list.length === 0) container.innerHTML = '<div class="item-meta">No hay items</div>';
      for (const it of list){
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
          <div class="item-thumb pixelated">${it.thumb ? `<img src="${it.thumb}" alt="${it.name}" style="max-width:100%;max-height:100%">` : it.name}</div>
          <div class="item-title">${it.name}</div>
          <div class="item-meta">${formatPrice(it.price)}</div>
          <div class="item-actions"></div>
        `;
        const actions = card.querySelector('.item-actions');
        const applyBtn = document.createElement('button');
        applyBtn.className = 'btn';
        applyBtn.textContent = (state.active && ((type==='button' && state.active.button===it.asset) || (type==='sound' && state.active.sound===it.asset) || (type==='bg' && state.active.bg===it.asset))) ? 'Activo' : 'Activar';
        applyBtn.disabled = applyBtn.textContent === 'Activo';
        applyBtn.onclick = ()=> { applyItem(it.id); render(); };
        actions.appendChild(applyBtn);
        container.appendChild(card);
      }
    }

    renderSection(invButtons, 'button');
    renderSection(invSounds, 'sound');
    renderSection(invBgs, 'bg');
  }

  render();
});
