/* common.js - lógica compartida: estado, economía, items, clicks, efectos activos */
(function(){
  const STATE_KEY = 'pixel_state';
  const ITEMS_KEY = 'shop_items';

  // Estado básico
  window.loadState = function(){
    try { return JSON.parse(localStorage.getItem(STATE_KEY) || '{}'); } catch(e){ return {}; }
  };
  window.saveState = function(s){
    try { localStorage.setItem(STATE_KEY, JSON.stringify(s || {})); } catch(e){}
  };

  // Inicializadores
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
    if (typeof s.partialDiamondFraction === 'undefined') s.partialDiamondFraction = 0;
    saveState(s);
  };

  // Items por defecto con meta para efectos
  const defaultItems = [
    { id:'skin_red', name:'Skin Rojo', price:50, desc:'Piel roja pixelada', thumb:'assets/skin_red_thumb.png', type:'skin', meta:{ cssFilter:'hue-rotate(0deg) saturate(1.1)' } },
    { id:'skin_blue', name:'Skin Azul', price:120, desc:'Piel azul con brillo', thumb:'assets/skin_blue_thumb.png', type:'skin', meta:{ cssFilter:'hue-rotate(200deg) saturate(1.1)' } },
    { id:'sound_boop', name:'Sonido Boop', price:80, desc:'Sonido click alternativo', thumb:'assets/sound_boop_thumb.png', type:'sound', meta:{ sound:'assets/sound_boop.mp3' } },
    { id:'auto_clicker', name:'Auto Clicker', price:500, desc:'Genera 1 click por segundo', thumb:'assets/auto_thumb.png', type:'upgrade', meta:{ autoClicksPerSec:1 } },
    { id:'double_click', name:'Doble Click', price:400, desc:'Cada click cuenta como 2', thumb:'assets/double_thumb.png', type:'upgrade', meta:{ clickMultiplier:2 } }
  ];
{
  id: 'boton_verde',
  name: 'Botón Verde',
  price: 75,
  type: 'skin',
  thumb: 'assets/boton_verde_thumb.png',
  desc: 'Cambia el botón por la versión verde',
  meta: {
    cssFilter: 'hue-rotate(90deg) saturate(1.2)' ,
    // opcional: si querés reemplazar la imagen en vez de usar filter
    // img: 'assets/boton_verde.png'
  }
}


  window.initItemsIfMissing = function(){
    try {
      if (!localStorage.getItem(ITEMS_KEY)) localStorage.setItem(ITEMS_KEY, JSON.stringify(defaultItems));
    } catch(e){}
  };

  window.getItems = function(){
    try { return JSON.parse(localStorage.getItem(ITEMS_KEY) || '[]'); } catch(e){ return []; }
  };

  // processClick: respeta multiplicadores activos
  window.processClick = function(){
    const s = loadState() || {};
    const upgradeId = s.active && s.active.upgrade;
    const upgradeItem = upgradeId ? getItems().find(i => i.id === upgradeId) : null;
    const multiplier = (upgradeItem && upgradeItem.meta && upgradeItem.meta.clickMultiplier) ? upgradeItem.meta.clickMultiplier : 1;

    const add = 1 * multiplier;
    s.clicks = (s.clicks || 0) + add;

    s.partialDiamondFraction = s.partialDiamondFraction || 0;
    s.partialDiamondFraction += add / 10;
    if (s.partialDiamondFraction >= 1){
      const give = Math.floor(s.partialDiamondFraction);
      s.diamonds = (s.diamonds || 0) + give;
      s.partialDiamondFraction -= give;
    }

    saveState(s);
  };

  // Efectos activos: skin, sound, auto-clicker, etc.
  let _autoClickInterval = null;
  window.applyActiveEffects = function(state){
    state = state || loadState();
    const items = getItems();

    // SKIN
    const skinId = state.active && state.active.skin;
    const skinItem = items.find(i => i.id === skinId);
    const btn = document.querySelector('.red-btn');
    if (btn) {
      if (skinItem && skinItem.meta && skinItem.meta.cssFilter) btn.style.filter = skinItem.meta.cssFilter;
      else btn.style.filter = '';
    }

    // SOUND
    const soundId = state.active && state.active.sound;
    const soundItem = items.find(i => i.id === soundId);
    const audioEl = document.getElementById('clickSound');
    if (audioEl) {
      if (soundItem && soundItem.meta && soundItem.meta.sound) audioEl.src = soundItem.meta.sound;
      else audioEl.src = 'assets/click_default.mp3';
    }

    // AUTO-CLICKER
    if (_autoClickInterval) { clearInterval(_autoClickInterval); _autoClickInterval = null; }
    const upgradeId = state.active && state.active.upgrade;
    const upgradeItem = items.find(i => i.id === upgradeId);
    if (upgradeItem && upgradeItem.meta && upgradeItem.meta.autoClicksPerSec) {
      const perSec = upgradeItem.meta.autoClicksPerSec;
      _autoClickInterval = setInterval(()=> {
        for (let i=0;i<perSec;i++) processClick();
        const counterEl = document.getElementById('counter');
        if (counterEl) counterEl.textContent = (loadState().clicks || 0);
      }, 1000);
    }
  };

  // Compra mejorada: guarda en inventario y opcionalmente activa skins/sonidos
  window.buyItem = function(itemId){
    const items = getItems();
    const item = items.find(i => i.id === itemId);
    if (!item) return window.showToast('Ítem no encontrado');

    const s = loadState() || {};
    s.diamonds = s.diamonds || 0;
    if (s.diamonds < item.price) return window.showToast('No tenés suficientes diamantes');

    s.diamonds -= item.price;
    s.inventory = s.inventory || [];
    if (!s.inventory.find(x => x.id === item.id)) s.inventory.push({ id: item.id, boughtAt: Date.now() });

    // Activar automáticamente skins/sounds al comprar (opcional)
    if (item.type === 'skin') { s.active = s.active || {}; s.active.skin = item.id; }
    if (item.type === 'sound') { s.active = s.active || {}; s.active.sound = item.id; }
    // Para upgrades: no activamos automáticamente por defecto, pero podés hacerlo si querés:
    // if (item.type === 'upgrade') { s.active = s.active || {}; s.active.upgrade = item.id; }

    saveState(s);
    applyActiveEffects(s);
    window.showToast('Comprado: ' + item.name);
  };

  // Toast util
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

  // Exponer defaults para edición rápida
  window._defaultItems = defaultItems;
})();
