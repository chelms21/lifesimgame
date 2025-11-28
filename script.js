// script.js - Full Tomodachi-style game with stats, inventory, interactions, and save/load.

const SAVE_KEY = 'miiTownFullSave_v1';
const TICK_MS = 5000; // automatic tick when auto mode is on
const PARTY_COST = 150;
const PARTY_HAPPINESS_BONUS = 20;

/* ===== Sample store items =====
   hunger: negative reduces hunger number (lower = fuller)
   happiness: positive increases happiness
   social: positive increases social
*/
const DEFAULT_STORE = [
  { id: 'apple', name: 'Apple', price: 5, hunger: -18, happiness: 2, social: 0 },
  { id: 'sushi', name: 'Sushi', price: 25, hunger: -40, happiness: 8, social: 0 },
  { id: 'toy', name: 'Toy', price: 40, hunger: 0, happiness: 18, social: 6 },
  { id: 'book', name: 'Book', price: 20, hunger: 0, happiness: 4, social: 10 }
];

let gameData = {
  money: 50,
  residents: [],
  inventory: [], // { itemId, qty }
  settings: { mode: 'manual' }
};

let activeResidentId = null;
let autoTickTimer = null;

/* ===== Utilities ===== */
const qs = (s, p=document) => p.querySelector(s);
const qsa = (s, p=document) => Array.from(p.querySelectorAll(s));
const clamp = (v, a=0, b=100) => Math.max(a, Math.min(b, v));
const uid = (p='id') => p + '_' + Math.random().toString(36).slice(2,9);

/* ===== Avatar (inline SVG) ===== */
function makeAvatarSvg(name='Mii', gender='male', seed=0) {
  const hue = ((name.charCodeAt(0)||65) + seed*37) % 360;
  const face = `hsl(${hue} 80% 85%)`;
  const hair = `hsl(${(hue+200)%360} 60% 30%)`;
  return `
  <svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${name} avatar">
    <rect width="100%" height="100%" rx="12" fill="transparent"/>
    <circle cx="80" cy="68" r="36" fill="${face}" stroke="rgba(0,0,0,0.04)"/>
    <path d="M46 58 q34 -34 68 0" fill="${hair}" />
    <circle cx="68" cy="66" r="4" fill="#112"/>
    <circle cx="92" cy="66" r="4" fill="#112"/>
    <path d="M70 84 q10 8 20 0" stroke="#221" stroke-width="2" fill="none" stroke-linecap="round"/>
  </svg>`;
}

/* ===== Save / Load / Export / Import ===== */
function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(gameData));
    showMessage('Game saved.');
  } catch (e) {
    console.error('Save failed', e);
    showMessage('Save failed (see console).');
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.money === 'number') {
      gameData = parsed;
      // ensure arrays exist
      gameData.residents = gameData.residents || [];
      gameData.inventory = gameData.inventory || [];
      gameData.settings = gameData.settings || { mode: 'manual' };
      showMessage('Save loaded.');
      return true;
    }
    return false;
  } catch (e) {
    console.error('Load failed', e);
    showMessage('Load failed (see console).');
    return false;
  }
}

function exportSave() {
  try {
    const exported = JSON.stringify(gameData, null, 2);
    navigator.clipboard?.writeText(exported).then(()=>showMessage('Export copied to clipboard.'), ()=>alert(exported));
  } catch (e) {
    console.error(e);
    alert(JSON.stringify(gameData, null, 2));
  }
}

function importSave(json) {
  try {
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed.money === 'number') {
      gameData = parsed;
      activeResidentId = gameData.residents?.[0]?.id || null;
      stopAutoTick();
      if (gameData.settings?.mode === 'auto') startAutoTick();
      renderAll();
      saveGame();
      showMessage('Import successful.');
      return true;
    } else {
      showMessage('Invalid save.');
      return false;
    }
  } catch (e) {
    console.error('Import parse error', e);
    showMessage('Invalid JSON.');
    return false;
  }
}

/* ===== Resident helpers ===== */
function createResident(name='Mii', gender='male', personality='easygoing') {
  return {
    id: uid('mii'),
    name,
    gender,
    personality,
    hunger: 30,       // 0 = full, 100 = starving
    happiness: 60,
    social: 50,
    asleep: false,
    createdAt: Date.now()
  };
}

function getResident(id) {
  return gameData.residents.find(r => r.id === id);
}

/* ===== Renderers ===== */
function renderMoney() {
  const el = qs('#money-stat');
  if (el) el.textContent = String(gameData.money || 0);
}
function renderResidentList() {
  const list = qs('#resident-list');
  if (!list) return;
  list.innerHTML = '';
  gameData.residents.forEach(r => {
    const div = document.createElement('div');
    div.className = 'resident-mini-card' + (r.id === activeResidentId ? ' selected' : '');
    div.innerHTML = `<div>${r.name}</div><div>😊${Math.round(r.happiness)} | 🍎${Math.round(r.hunger)} | 🗣️${Math.round(r.social)}</div>`;
    div.addEventListener('click', () => { activeResidentId = r.id; renderAll(); });
    list.appendChild(div);
  });
  const rc = qs('#resident-count');
  if (rc) rc.textContent = gameData.residents.length;
}

function renderMiiSelect() {
  const sel = qs('#mii-select');
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = '<option value="">— select —</option>';
  gameData.residents.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r.id;
    opt.textContent = r.name;
    if (r.id === activeResidentId) opt.selected = true;
    sel.appendChild(opt);
  });
  if (prev) sel.value = prev;
}

function renderInventory() {
  const c = qs('#inventory-list');
  if (!c) return;
  c.innerHTML = '';
  if (!gameData.inventory.length) { c.textContent = 'Empty'; return; }
  gameData.inventory.forEach(i => {
    const item = DEFAULT_STORE.find(s => s.id === i.itemId);
    if (!item) return;
    const el = document.createElement('div');
    el.className = 'inv-item';
    el.innerHTML = `<div>${item.name} x${i.qty}</div>`;
    const btnWrap = document.createElement('div');
    const useBtn = document.createElement('button');
    useBtn.className = 'btn secondary';
    useBtn.textContent = 'Use';
    useBtn.onclick = () => useItem(item.id);
    btnWrap.appendChild(useBtn);
    el.appendChild(btnWrap);
    c.appendChild(el);
  });
}

function renderCurrentMii() {
  const mii = getResident(activeResidentId);
  const avatar = qs('#mii-avatar');
  if (avatar) avatar.innerHTML = mii ? makeAvatarSvg(mii.name, mii.gender, 1) : makeAvatarSvg('No Mii', 'male', 9);

  qs('#mii-name') && (qs('#mii-name').textContent = mii ? mii.name : '—');
  qs('#happiness-stat') && (qs('#happiness-stat').textContent = mii ? Math.round(mii.happiness) : '—');
  qs('#hunger-stat') && (qs('#hunger-stat').textContent = mii ? Math.round(mii.hunger) : '—');
  qs('#social-stat') && (qs('#social-stat').textContent = mii ? Math.round(mii.social) : '—');

  if (qs('#happiness-bar')) qs('#happiness-bar').style.width = (mii ? clamp(mii.happiness) : 0) + '%';
  if (qs('#hunger-bar')) qs('#hunger-bar').style.width = (mii ? clamp(100 - mii.hunger) : 0) + '%';
  if (qs('#social-bar')) qs('#social-bar').style.width = (mii ? clamp(mii.social) : 0) + '%';

  if (mii) {
    if (mii.asleep) showMessage(`${mii.name} is asleep.`);
    else showMessage(`${mii.name} is ready.`);
  } else showMessage('Create a Mii to begin.');

  renderResidentList();
  renderMiiSelect();
  renderInventory();
  renderMoney();
}

/* ===== Inventory / Store actions ===== */
function buyItem(itemId) {
  const it = DEFAULT_STORE.find(s => s.id === itemId);
  if (!it) return showMessage('Item not found.');
  if (gameData.money < it.price) return showMessage('Not enough money.');
  gameData.money -= it.price;
  const inv = gameData.inventory.find(x => x.itemId === itemId);
  if (inv) inv.qty++; else gameData.inventory.push({ itemId, qty: 1 });
  renderInventory();
  renderMoney();
  saveGame();
  showMessage(`Bought ${it.name}.`);
}

function useItem(itemId) {
  const inv = gameData.inventory.find(x => x.itemId === itemId);
  if (!inv || inv.qty <= 0) return showMessage('No item to use.');
  const it = DEFAULT_STORE.find(s => s.id === itemId);
  const resident = getResident(activeResidentId);
  if (!resident) return showMessage('Select a resident first.');
  if (resident.asleep) return showMessage(`${resident.name} is asleep.`);

  resident.hunger = clamp(resident.hunger + (it.hunger || 0));
  resident.happiness = clamp(resident.happiness + (it.happiness || 0));
  resident.social = clamp(resident.social + (it.social || 0));

  inv.qty--;
  if (inv.qty <= 0) gameData.inventory = gameData.inventory.filter(i => i.qty > 0);
  renderCurrentMii();
  saveGame();
  showMessage(`${resident.name} used ${it.name}.`);
}

/* ===== Interactions ===== */
function performAction(action) {
  const resident = getResident(activeResidentId);
  if (!resident) return showMessage('Select a resident first.');
  if (resident.asleep) return showMessage(`${resident.name} is asleep.`);

  if (action === 'feed') {
    // Prefer to use apple automatically if present
    const apple = gameData.inventory.find(i => i.itemId === 'apple');
    if (apple && apple.qty > 0) { useItem('apple'); return; }
    resident.hunger = clamp(resident.hunger - 18);
    resident.happiness = clamp(resident.happiness + 3);
    showMessage(`${resident.name} ate a snack.`);
  } else if (action === 'play') {
    resident.happiness = clamp(resident.happiness + 10);
    resident.hunger = clamp(resident.hunger + 6);
    showMessage(`${resident.name} played!`);
  } else if (action === 'chat') {
    resident.social = clamp(resident.social + 12);
    resident.happiness = clamp(resident.happiness + 4);
    showMessage(`${resident.name} had a chat.`);
  } else if (action === 'work') {
    // Earn money but cost happiness/hunger
    const earned = 10 + Math.floor(Math.random()*10);
    gameData.money += earned;
    resident.happiness = clamp(resident.happiness - 6);
    resident.hunger = clamp(resident.hunger + 8);
    showMessage(`${resident.name} worked and earned $${earned}.`);
  } else if (action === 'sleep-toggle') {
    resident.asleep = !resident.asleep;
    showMessage(resident.asleep ? `${resident.name} fell asleep.` : `${resident.name} woke up.`);
  }

  renderCurrentMii();
  saveGame();
}

/* ===== Party (global) ===== */
function throwParty() {
  if (gameData.money < PARTY_COST) return showMessage('Not enough money to throw a party.');
  gameData.money -= PARTY_COST;
  gameData.residents.forEach(r => r.happiness = clamp(r.happiness + PARTY_HAPPINESS_BONUS));
  renderCurrentMii();
  saveGame();
  showMessage('Party time! Everyone enjoyed.');
}

/* ===== Game Tick ===== */
function gameTick() {
  // Each tick: hunger increases, happiness may decrease if hungry, social drifts
  gameData.residents.forEach(r => {
    if (r.asleep) {
      // sleeping reduces hunger a bit, restores happiness
      r.hunger = clamp(r.hunger - 4);
      r.happiness = clamp(r.happiness + 2);
      r.social = clamp(r.social - 1);
    } else {
      r.hunger = clamp(r.hunger + 3); // gets hungrier
      if (r.hunger > 80) r.happiness = clamp(r.happiness - 6);
      // personality small drift
      if (r.personality === 'energetic') r.happiness = clamp(r.happiness + 1);
      if (r.personality === 'laid-back') r.happiness = clamp(r.happiness + 0.5);
      // social slowly decreases when alone
      r.social = clamp(r.social - 1.2);
    }
  });

  // passive money: small per resident
  gameData.money += Math.max(0, Math.floor(gameData.residents.length * 0.5));
  renderAll();
  saveGame();
}

function startAutoTick() {
  stopAutoTick();
  autoTickTimer = setInterval(gameTick, TICK_MS);
}

function stopAutoTick() {
  if (autoTickTimer) { clearInterval(autoTickTimer); autoTickTimer = null; }
}

/* ===== UI helpers ===== */
function showMessage(text, ms=2500) {
  const el = qs('#mii-message');
  if (!el) return;
  el.textContent = text;
  el.classList.add('active');
  if (el._timeout) clearTimeout(el._timeout);
  el._timeout = setTimeout(()=>el.classList.remove('active'), ms);
}

/* ===== Store UI ===== */
function openStore() {
  const modal = qs('#store-modal');
  const itemsDiv = qs('#store-items');
  if (!modal || !itemsDiv) return;
  itemsDiv.innerHTML = '';
  DEFAULT_STORE.forEach(it => {
    const row = document.createElement('div');
    row.className = 'inv-item';
    const left = document.createElement('div');
    left.textContent = `${it.name} — $${it.price}`;
    const right = document.createElement('div');
    const buyBtn = document.createElement('button');
    buyBtn.className = 'btn';
    buyBtn.textContent = 'Buy';
    buyBtn.onclick = () => buyItem(it.id);
    right.appendChild(buyBtn);
    row.appendChild(left);
    row.appendChild(right);
    itemsDiv.appendChild(row);
  });
  modal.classList.remove('hidden');
}
function closeStore() { qs('#store-modal')?.classList.add('hidden'); }

/* ===== Initialization & Wiring ===== */
function initGame() {
  // wire buttons safely
  qs('#create-mii-btn')?.addEventListener('click', () => {
    const name = (qs('#mii-name-input')?.value || '').trim() || ('Mii' + (Math.random()*1000|0));
    const gender = qs('#mii-gender-select')?.value || 'male';
    const personality = qs('#mii-personality-select')?.value || 'easygoing';
    const newMii = createResident(name, gender, personality);
    gameData.residents.push(newMii);
    activeResidentId = newMii.id;
    renderAll();
    saveGame();
    showMessage(`Welcome, ${name}!`);
    // clear form
    if (qs('#mii-name-input')) qs('#mii-name-input').value = '';
  });

  qs('#save-btn')?.addEventListener('click', saveGame);
  qs('#load-btn')?.addEventListener('click', () => { loadGame(); renderAll(); });
  qs('#export-btn')?.addEventListener('click', exportSave);
  qs('#import-btn')?.addEventListener('click', () => qs('#import-modal')?.classList.remove('hidden'));
  qs('#import-close-btn')?.addEventListener('click', () => qs('#import-modal')?.classList.add('hidden'));
  qs('#do-import-btn')?.addEventListener('click', () => {
    const text = qs('#import-text')?.value || '';
    if (text.trim()) { importSave(text); qs('#import-modal')?.classList.add('hidden'); qs('#import-text').value = ''; }
  });
  qs('#clear-import-btn')?.addEventListener('click', () => { if (qs('#import-text')) qs('#import-text').value = ''; });

  qs('#mii-select')?.addEventListener('change', (e) => {
    activeResidentId = e.target.value || null;
    renderCurrentMii();
  });

  qs('#feed-btn')?.addEventListener('click', () => performAction('feed'));
  qs('#play-btn')?.addEventListener('click', () => performAction('play'));
  qs('#chat-btn')?.addEventListener('click', () => performAction('chat'));
  qs('#work-btn')?.addEventListener('click', () => performAction('work'));
  qs('#sleep-btn')?.addEventListener('click', () => performAction('sleep-toggle'));
  qs('#party-btn')?.addEventListener('click', throwParty);
  qs('#shop-open-btn')?.addEventListener('click', openStore);
  qs('#store-close-btn')?.addEventListener('click', closeStore);

  // game mode select
  qs('#game-mode-select')?.addEventListener('change', (e) => {
    gameData.settings.mode = e.target.value;
    if (gameData.settings.mode === 'auto') startAutoTick(); else stopAutoTick();
    saveGame();
  });

  // load from storage if present
  loadGame();
  activeResidentId = activeResidentId || (gameData.residents?.[0]?.id || null);

  // render UI
  renderAll();

  // apply mode
  if (gameData.settings.mode === 'auto') startAutoTick();

  // autosave every 12 seconds as a backup
  setInterval(saveGame, 12000);
}

function renderAll() {
  renderMoney();
  renderResidentList();
  renderMiiSelect();
  renderInventory();
  renderCurrentMii();
}

/* ===== Boot ===== */
document.addEventListener('DOMContentLoaded', () => {
  try {
    initGame();
  } catch (e) {
    console.error('Init error', e);
  }
});
