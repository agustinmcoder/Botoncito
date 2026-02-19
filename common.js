/* common.js - lógica compartida: estado, economía, items, clicks */
(function(){
  const STATE_KEY = 'pixel_state';
  const ITEMS_KEY = 'shop_items';

  window.loadState = function(){
    try { return JSON.parse(localStorage.getItem(STATE_KEY) || '{}'); } catch(e){ return {}; }
  };
  window.saveState = function(s){
    try { localStorage.setItem(STATE_KEY, JSON.stringify(s || {})); } catch(e){}
  };

  window.initEconomyIfMissing = function(){
    const s = loadState() || {};
    if (typeof s.diamonds === 'undefined') s.diamonds = 200;
    saveState(s);
  };

  window.initStateIfMissing = function(){
    const s = loadState() || {};
    if (typeof s.clicks === 'undefined') s.clicks = 0;
    if (!Array.isArray(s.inventory)) s.inventory = [];
    if (!s.active) s.active = {};
    saveState(s);
  };

  const defaultItems = [
    { id:'skin_red', name:'Skin Rojo', price:50, desc:'Piel roja pixelada', thumb:'assets/skin_red_thumb.png', type:'skin' },
    { id:'skin_blue', name:'Skin Azul', price:120, desc:'Piel azul con brillo', thumb:'assets/skin_blue_thumb.png', type:'skin' },
    { id:'sound_boop', name:'Sonido Boop', price:80, desc:'Sonido click alternativo', thumb:'assets/sound_boop_thumb.png', type:'sound' },
    { id:'auto_clicker', name:'Auto Clicker', price:500, desc:'Genera clicks automáticos', thumb:'assets/auto_thumb.png', type:'upgrade' }
  ];

  window.initItemsIfMissing = function(){
    try {
      if (!localStorage.getItem(ITEMS_KEY)) localStorage.setItem(ITEMS_KEY, JSON.stringify(defaultItems));
    } catch(e){}
  };

  window.getItems = function(){
    try { return JSON.parse(localStorage.getItem(ITEMS_KEY) || '[]'); } catch(e){ return []; }
  };

  window.processClick = function(){
    const s = loadState() || {};
    s.clicks = (s.clicks || 0) + 1;
    s.partialDiamondFraction = s.partialDiamondFraction || 0;
    s.partialDiamondFraction += 1/10;
    if (s.partialDiamondFraction >= 1){
      const add = Math.floor(s.partialDiamondFraction);
      s.diamonds = (s.diamonds || 0) + add;
      s.partialDiamondFraction -= add;
    }
    saveState(s);
  };

  window.applyActiveSkins = function(state){
    try {
      const s = state || loadState();
      const btn = document.querySelector('.red-btn');
      if (!btn) return;
      const skin = s.active && s.active.skin;
      if (skin === 'skin_red') btn.style.filter = 'hue-rotate(0deg)';
      else if (skin === 'skin_blue') btn.style.filter = 'hue-rotate(200deg)';
      else btn.style.filter = '';
    } catch(e){}
  };

  window.showToast = function(msg, ms = 1400){
    let t = document.getElementById('toast');
    if (!t){
      t = document.createElement('div');
      t.id = 'toast';
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.display = 'block';
    clearTimeout(t._timeout);
    t._timeout = setTimeout(()=> t.style.display = 'none', ms);
  };

  window.buyItem = function(itemId){
    const items = getItems();
    const item = items.find(i=>i.id===itemId);
    if (!item) return showToast('Ítem no encontrado');
    const s = loadState() || {};
    s.diamonds = s.diamonds || 0;
    if (s.diamonds < item.price) return showToast('No tenés suficientes diamantes');
    s.diamonds -= item.price;
    s.inventory = s.inventory || [];
    if (!s.inventory.find(i=>i.id===item.id)) s.inventory.push({ id:item.id, boughtAt:Date.now() });
    saveState(s);
    showToast('Comprado: ' + item.name);
  };

  window._defaultItems = defaultItems;
})();
