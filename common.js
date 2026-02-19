/* common.js
   Estado, economía, utilidades, persistencia y funciones para aplicar skins.
*/

const ECONOMY_KEY = 'gameEconomy_v1';
const STATE_KEY = 'gameState_v1';

// Economía definida por vos (ya guardada en memoria)
const DEFAULT_ECONOMY = {
  conversionRanges: [
    {min:1, max:100, rate:1},
    {min:101, max:250, rate:0.66666},
    {min:251, max:500, rate:0.5},
    {min:501, max:1000, rate:0.333333},
    {min:1001, max:null, rate:0.25}
  ],
  milestones: [
    {clicks:5, reward:5},
    {clicks:50, reward:25},
    {clicks:100, reward:50},
    {clicks:250, reward:125},
    {clicks:500, reward:250},
    {clicks:1000, reward:350}
  ],
  post1000: {everyClicks:1000, reward:400}
};

function saveEconomy(e){ localStorage.setItem(ECONOMY_KEY, JSON.stringify(e)); }
function loadEconomy(){ const raw = localStorage.getItem(ECONOMY_KEY); return raw ? JSON.parse(raw) : null; }
function initEconomyIfMissing(){ if(!loadEconomy()) saveEconomy(DEFAULT_ECONOMY); }

function saveState(s){ localStorage.setItem(STATE_KEY, JSON.stringify(s)); }
function loadState(){ const raw = localStorage.getItem(STATE_KEY); return raw ? JSON.parse(raw) : null; }
function initStateIfMissing(){
  if (!loadState()){
    const s = {
      clicks:0,
      diamonds:0,
      partialDiamondFraction:0,
      claimedMilestones:{},
      _post1000Claimed:0,
      owned:{}, // itemId: true
      active:{ button:null, sound:null, bg:null }
    };
    saveState(s);
  }
}

/* Items de ejemplo para la tienda
   id: único, type: button|sound|bg, price: en diamantes, name, thumb, asset (ruta)
*/
const DEFAULT_ITEMS = [
  {id:'btn_red', type:'button', price:10, name:'Botón Rojo', thumb:'assets/thumb_btn_red.png', asset:'assets/btn_red.png'},
  {id:'btn_pixel', type:'button', price:40, name:'Botón Pixel', thumb:'assets/thumb_btn_pixel.png', asset:'assets/btn_pixel.png'},
  {id:'snd_click_default', type:'sound', price:5, name:'Click Clásico', thumb:'assets/thumb_snd1.png', asset:'assets/click_default.mp3'},
  {id:'snd_bloop', type:'sound', price:30, name:'Bloop Retro', thumb:'assets/thumb_snd2.png', asset:'assets/click_bloop.mp3'},
  {id:'bg_day', type:'bg', price:15, name:'Fondo Amanecer', thumb:'assets/thumb_bg1.png', asset:'assets/bg_day.png'},
  {id:'bg_space', type:'bg', price:60, name:'Fondo Espacial', thumb:'assets/thumb_bg2.png', asset:'assets/bg_space.png'}
];

const ITEMS_KEY = 'gameItems_v1';
function initItemsIfMissing(){ if(!localStorage.getItem(ITEMS_KEY)) localStorage.setItem(ITEMS_KEY, JSON.stringify(DEFAULT_ITEMS)); }
function loadItems(){ return JSON.parse(localStorage.getItem(ITEMS_KEY) || '[]'); }

/* Economía: obtener rate según clicks */
function getRateForClicks(clicks, economy){
  for (const r of economy.conversionRanges){
    if (r.max === null) return r.rate;
    if (clicks >= r.min && clicks <= r.max) return r.rate;
  }
  return economy.conversionRanges[economy.conversionRanges.length-1].rate;
}

/* Procesar un click: actualizar clicks, acumular fracción y convertir a diamantes, chequear hitos */
function processClick(){
  const economy = loadEconomy();
  const state = loadState();
  state.clicks = (state.clicks || 0) + 1;
  const rate = getRateForClicks(state.clicks, economy);
  state.partialDiamondFraction = (state.partialDiamondFraction || 0) + rate;
  const gained = Math.floor(state.partialDiamondFraction);
  if (gained > 0){
    state.diamonds = (state.diamonds || 0) + gained;
    state.partialDiamondFraction -= gained;
    showToast(`Has ganado ${gained} diamante(s)`);
  }
  checkMilestones(state, economy);
  saveState(state);
}

/* Chequear hitos y recompensas automáticas */
function checkMilestones(state, economy){
  state.claimedMilestones = state.claimedMilestones || {};
  for (const m of economy.milestones){
    if (state.clicks >= m.clicks && !state.claimedMilestones[m.clicks]){
      state.diamonds = (state.diamonds || 0) + m.reward;
      state.claimedMilestones[m.clicks] = true;
      showToast(`Felicidades por ${m.clicks} clicks — +${m.reward} diamantes`);
    }
  }
  if (state.clicks >= economy.post1000.everyClicks){
    const times = Math.floor(state.clicks / economy.post1000.everyClicks);
    state._post1000Claimed = state._post1000Claimed || 0;
    while (state._post1000Claimed < times){
      state.diamonds += economy.post1000.reward;
      state._post1000Claimed += 1;
      showToast(`Bonus por ${state._post1000Claimed * economy.post1000.everyClicks} clicks — +${economy.post1000.reward} diamantes`);
    }
  }
}

/* Comprar item */
function buyItem(itemId){
  const items = loadItems();
  const item = items.find(i=>i.id===itemId);
  if (!item) return {ok:false, msg:'Item no encontrado'};
  const state = loadState();
  if (state.owned[itemId]) return {ok:false, msg:'Ya comprado'};
  if ((state.diamonds || 0) < item.price) return {ok:false, msg:'Diamantes insuficientes'};
  state.diamonds -= item.price;
  state.owned[itemId] = true;
  saveState(state);
  showToast(`Compraste ${item.name}`);
  return {ok:true, item};
}

/* Aplicar item (solo si está comprado) */
function applyItem(itemId){
  const items = loadItems();
  const item = items.find(i=>i.id===itemId);
  if (!item) return false;
  const state = loadState();
  if (!state.owned[itemId]) return false;
  if (item.type === 'button'){
    state.active.button = item.asset;
  } else if (item.type === 'sound'){
    state.active.sound = item.asset;
  } else if (item.type === 'bg'){
    state.active.bg = item.asset;
  }
  saveState(state);
  applyActiveSkins(state);
  showToast(`${item.name} activado`);
  return true;
}

/* Aplicar activos al DOM (fondo, botón, sonido) */
function applyActiveSkins(state){
  state = state || loadState();
  // fondo
  const bgEl = document.querySelector('.bg');
  if (bgEl){
    if (state.active && state.active.bg) bgEl.style.backgroundImage = `url('${state.active.bg}')`;
    else bgEl.style.backgroundImage = '';
  }
  // botón: si hay asset de botón, cambiar clase o background
  const btn = document.getElementById('redBtn');
  if (btn){
    if (state.active && state.active.button){
      btn.style.backgroundImage = `url('${state.active.button}')`;
      btn.style.backgroundSize = 'cover';
    } else {
      btn.style.backgroundImage = '';
    }
  }
  // sonido se aplica en index.js cuando se reproduce (se usa state.active.sound)
}

/* Toasts simples */
function showToast(text, ms=3000){
  const root = document.getElementById('toastRoot') || document.querySelector('.toast-root');
  if (!root) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = text;
  root.appendChild(t);
  requestAnimationFrame(()=> t.classList.add('show'));
  setTimeout(()=> { t.classList.remove('show'); setTimeout(()=> t.remove(), 300); }, ms);
}

/* Utiles para UI */
function formatPrice(n){ 
  return `${n} <img src="assets/emerald.png" alt="esmeralda" style="width:16px;height:16px;image-rendering:pixelated;vertical-align:middle">`; 
}


/* Inicializar */
initEconomyIfMissing();
initStateIfMissing();
initItemsIfMissing();
