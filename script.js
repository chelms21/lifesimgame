// script.js - Complete Tomodachi-style demo (self-contained)
// No external images required; uses inline SVG for avatars.
// Stores game state in localStorage under "miiTownSave".

/* ========= Constants ========= */
const SAVE_KEY = 'miiTownSave_v1';
const PARTY_COST = 150;
const PARTY_HAPPINESS_BONUS = 20;
const TICK_MS = 5000; // automatic tick when auto mode is on

/* ========= Minimal demo data (store items) ========= */
const DEFAULT_STORE = [
  { id: 'apple', name: 'Apple', price: 5, hunger: -15, happiness: 2 },
  { id: 'sushi', name: 'Sushi', price: 25, hunger: -35, happiness: 8 },
  { id: 'toy', name: 'Toy', price: 40, hunger: 0, happiness: 25 }
];

/* ========= App State ========= */
let gameData = {
  money: 50,
  residents: [],
  inventory: [], // {itemId, qty}
  settings: { mode: 'manual' }
};
let activeResidentId = null;
let autoTickTimer = null;

/* ========= Utilities ========= */
function qs(sel, parent = document) { return parent.querySelector(sel); }
function qsa(sel, parent = document) { return Array.from(parent.querySelectorAll(sel)); }
function clamp(n, a=0, b=100) { return Math.max(a, Math.min(b, n)); }
function uid(prefix='id') { return prefix + '_' + Math.random().toString(36).slice(2,9); }

/* ========= Avatar generator (inline SVG) ========= */
function makeAvatarSvg(name, gender='male', colorSeed = 0) {
  // Use name letters to create simple colored face
  const hue = ((name.charCodeAt(0)||65) + colorSeed*37) % 360;
  const faceColor = `hsl(${hue} 80% 85%)`;
  const hairColor = `hsl(${(hue+200)%360} 60% 30%)`;
  return `
    <svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${name} avatar">
      <rect width="100%" height="100%" rx="12" fill="transparent"/>
      <circle cx="80" cy="70" r="34" fill="${faceColor}" stroke="rgba(0,0,0,0.04)"/>
      <ellipse cx="80" cy="95" rx="28" ry="10" fill="${faceColor}" />
      <path d="M50 58 q30 -30 60 0" fill="${hairColor}" />
      <circle cx="68" cy="68" r="4" fill="#112"/>
      <circle cx="92" cy="68" r="4" fill="#112"/>
      <path d="M70 82 q10 8 20 0" stroke="#221" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>
  `;
}

/* ========= Save / Load ========= */
function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(gameData));
    showMessage('Game saved.');
    renderMoney();
  } catch (e) {
    console.error('Save failed', e);
    showMessage('Save failed (console).');
  }
}
function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    // Basic validation
    if (parsed && typeof parsed.money === 'number') {
      gameData = parsed;
      return true;
    }
    return false;
  } catch (e) { console.error('Load failed', e); return false; }
}
function resetGame() {
  if (!confirm('Reset the game? This will erase local progress.')) return;
  localStorage.removeItem(SAVE_KEY);
  gameData = { money: 50, residents: [], inventory: [], settings: { mode: 'manual' } };
  activeResidentId = null;
  stopAutoTick();
  renderAll();
  showMessage('Game reset.');
}

/* ========= Game initialization & rendering ========= */
function initGame() {
  // Wire up DOM elements
  qs('#create-mii-btn')?.addEventListener('click', handleCreateMii);
  qs('#save-btn')?.addEventListener('click', saveGame);
  qs('#reset-btn')?.addEventListener('click', resetGame);
  qs('#mii-select')?.addEventListener('change', switchMiiFromSelect);
  qs('#feed-btn')?.addEventListener('click', () => performAction('feed'));
  qs('#play-btn')?.addEventListener('click', () => performAction('play'));
  qs('#shop-open-btn')?.addEventListener('click', openStore);
  qs('#store-close-btn')?.addEventListener('click', closeStore);
  qs('#party-btn')?.addEventListener('click', throwParty);
  qs('#game-mode-select')?.addEventListener('change', (e) => {
    gameData.settings.mode = e.target.value;
    if (gameData.settings.mode === 'auto') startAutoTick(); else stopAutoTick();
  });

  // Load or default
  if (!loadGame()) {
    // use default starting data
    gameData = {
      money: 50,
      residents: [],
      inventory: [],
      settings: { mode: 'manual' }
    };
  }

  renderAll();

  // Start auto tick if needed
  if (gameData.settings.mode === 'auto') startAutoTick();
}

/* ========= Residents management ========= */
function createMii(name, gender, personality) {
  return {
    id: uid('mii'),
    name: name || 'Mii',
    gender: gender || 'male',
    personality: personality || 'easygoing',
    hunger: 30,       // 0 = full, 100 = starving
    happiness: 60,
    asleep: false,
    createdAt: Date.now()
  };
}

function handleCreateMii() {
  const name = qs('#mii-name-input')?.value?.trim() || ('Mii' + (Math.random()*999|0));
  const gender = qs('#mii-gender-select')?.value || 'male';
  const personality = qs('#mii-personality-select')?.value || 'easygoing';
  const newMii = createMii(name, gender, personality);
  gameData.residents.push(newMii);
  activeResidentId = newMii.id;
  renderAll();
  saveGame();
  showMessage(`Welcome, ${name}!`);
}

function getResident(id) {
  return gameData.residents.find(r => r.id === id);
}

function switchMiiFromSelect() {
  const select = qs('#mii-select');
  if (!select) return;
  activeResidentId = select.value || null;
  renderCurrentMii();
}

function renderResidentList() {
  const list = qs('#resident-list');
  if (!list) return;
  list.innerHTML = '';
  gameData.residents.forEach(r => {
    const div = document.createElement('div');
    div.className = 'resident-mini-card' + (r.id === activeResidentId ? ' selected' : '');
    div.innerHTML = `<div>${r.name}</div><div>😊${r.happiness}|🍎${r.hunger}</div>`;
    div.addEventListener('click', () => { activeResidentId = r.id; renderAll(); });
    list.appendChild(div);
  });
  qs('#resident-count').textContent = gameData.residents.length;
}

function renderMiiSelect() {
  const sel = qs('#mii-select');
  if (!sel) return;
  sel.innerHTML = '<option value="">— select —</option>';
  gameData.residents.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r.id;
    opt.textContent = r.name;
    if (r.id === activeResidentId) opt.selected = true;
    sel.appendChild(opt);
  });
}

/* ========= Render active resident / UI ========= */
function renderCurrentMii() {
  const mii = getResident(activeResidentId);
  // avatar
  const avatar = qs('#mii-avatar');
  if (avatar) avatar.innerHTML = mii ? makeAvatarSvg(mii.name, mii.gender, 1) : makeAvatarSvg('No Mii', 'male', 10);

  // name/happiness/hunger text
  qs('#mii-name').textContent = mii ? mii.name : '—';
  qs('#happiness-stat').textContent = mii ? `${Math.round(mii.happiness)}` : '—';
  qs('#hunger-stat').textContent = mii ? `${Math.round(mii.hunger)}` : '—';

  // bars
  if (qs('#happiness-bar')) qs('#happiness-bar').style.width = (mii ? clamp(mii.happiness) : 0) + '%';
  if (qs('#hunger-bar')) {
    const hungerPct = mii ? clamp(100 - mii.hunger) : 0; // invert to show fullness
    qs('#hunger-bar').style.width = hungerPct + '%';
  }

  // message
  if (mii) {
    if (mii.asleep) showMessage(`${mii.name} is asleep. Shh...`);
    else showMessage(`${mii.name} says hello!`);
  } else {
    showMessage('Create a Mii to start your town.');
  }

  renderResidentList();
  renderMiiSelect();
  renderInventory();
  renderMoney();
}

function renderMoney() {
  qs('#money-stat').textContent = String(gameData.money || 0);
}

/* ========= Inventory & Store ========= */
function renderInventory() {
  const container = qs('#inventory-list');
  if (!container) return;
  container.innerHTML = '';
  gameData.inventory.forEach(inv => {
    const item = DEFAULT_STORE.find(s => s.id === inv.itemId);
    if (!item) return;
    const el = document.createElement('div');
    el.className = 'inv-item';
    el.innerHTML = `<div>${item.name} x${inv.qty}</div><div><button class="btn secondary">Use</button></div>`;
    el.querySelector('button')?.addEventListener('click', () => {
      useItem(item.id);
    });
    container.appendChild(el);
  });
}

function openStore() {
  const modal = qs('#store-modal');
  const itemsDiv = qs('#store-items');
  if (!modal || !itemsDiv) return;
  itemsDiv.innerHTML = '';
  DEFAULT_STORE.forEach(it => {
    const row = document.createElement('div');
    row.className = 'inv-item';
    row.innerHTML = `<div>${it.name} — $${it.price}</div><div><button class="btn">Buy</button></div>`;
    row.querySelector('button')?.addEventListener('click', () => {
      buyItem(it.id);
    });
    itemsDiv.appendChild(row);
  });
  modal.classList.remove('hidden');
}

function closeStore() {
  qs('#store-modal')?.classList.add('hidden');
}

function buyItem(itemId) {
  const item = DEFAULT_STORE.find(s => s.id === itemId);
  if (!item) { showMessage('Item not found'); return; }
  if (gameData.money < item.price) { showMessage('Not enough money'); return; }
  gameData.money -= item.price;
  const inv = gameData.inventory.find(i => i.itemId === itemId);
  if (inv) inv.qty++; else gameData.inventory.push({ itemId, qty: 1 });
  renderInventory();
  renderMoney();
  saveGame();
  showMessage(`Bought ${item.name}.`);
}

function useItem(itemId) {
  const inv = gameData.inventory.find(i => i.itemId === itemId);
  if (!inv || inv.qty <= 0) { showMessage('No item'); return; }
  const item = DEFAULT_STORE.find(s => s.id === itemId);
  const resident = getResident(activeResidentId);
  if (!resident) { showMessage('Select a resident first'); return; }
  // apply effects
  resident.hunger = clamp(resident.hunger + (item.hunger || 0));
  resident.happiness = clamp(resident.happiness + (item.happiness || 0));
  inv.qty--;
  if (inv.qty <= 0) gameData.inventory = gameData.inventory.filter(i => i.qty > 0);
  renderCurrentMii();
  saveGame();
  showMessage(`${resident.name} used ${item.name}.`);
}

/* ========= Actions & automatic tick ========= */
function performAction(action) {
  const resident = getResident(activeResidentId);
  if (!resident) { showMessage('Select a resident first'); return; }
  if (resident.asleep) { showMessage(`${resident.name} is asleep.`); return; }

  if (action === 'feed') {
    // try to use an Apple if present; otherwise small hunger decrease
    const appleInv = gameData.inventory.find(i => i.itemId === 'apple');
    if (appleInv && appleInv.qty > 0) {
      useItem('apple'); return;
    } else {
      resident.hunger = clamp(resident.hunger - 18);
      resident.happiness = clamp(resident.happiness + 3);
      showMessage(`${resident.name} ate a snack.`);
    }
  } else if (action === 'play') {
    resident.happiness = clamp(resident.happiness + 10);
    resident.hunger = clamp(resident.hunger + 6); // playing costs energy/hunger
    showMessage(`${resident.name} played and feels happier.`);
  }

  renderCurrentMii();
  saveGame();
}

function throwParty() {
  if (gameData.money < PARTY_COST) { showMessage('Not enough money to throw a party.'); return; }
  gameData.money -= PARTY_COST;
  gameData.residents.forEach(r => r.happiness = clamp(r.happiness + PARTY_HAPPINESS_BONUS));
  renderCurrentMii();
  saveGame();
  showMessage('Party! Everyone had a great time.');
}

/* Automatic tick reduces hunger, may affect happiness */
function gameTick() {
  // each resident gradually gets hungrier
  gameData.residents.forEach(r => {
    if (r.asleep) { r.hunger = clamp(r.hunger - 2); /* sleeping reduces hunger (they rest) */ }
    else {
      r.hunger = clamp(r.hunger + 3); // gets hungrier
      // if very hungry, lose happiness
      if (r.hunger > 80) r.happiness = clamp(r.happiness - 6);
    }
    // personality small effect
    if (r.personality === 'energetic' && !r.asleep) r.happiness = clamp(r.happiness + 1);
  });

  // small passive money gain if more residents
  gameData.money += Math.max(0, Math.floor(gameData.residents.length * 0.6));
  renderCurrentMii();
  saveGame();
}

function startAutoTick() {
  stopAutoTick();
  autoTickTimer = setInterval(gameTick, TICK_MS);
}
function stopAutoTick() {
  if (autoTickTimer) { clearInterval(autoTickTimer); autoTickTimer = null; }
}

/* ========= Small helper functions ========= */
function showMessage(text, ms=2500) {
  const el = qs('#mii-message');
  if (!el) return;
  el.textContent = text;
  // simple fade behavior: add and remove 'active' (not styled heavily)
  el.classList.add('active');
  if (el._timeout) clearTimeout(el._timeout);
  el._timeout = setTimeout(() => el.classList.remove('active'), ms);
}

/* ========= Orchestration: render everything ========= */
function renderAll() {
  renderMoney();
  renderResidentList();
  renderMiiSelect();
  renderInventory();
  renderCurrentMii();
}

/* ========= Boot ========= */
document.addEventListener('DOMContentLoaded', () => {
  try {
    initGame();
    // Ensure UI bound to correct mode selector
    const modeSel = qs('#game-mode-select');
    if (modeSel) modeSel.value = gameData.settings.mode || 'manual';
  } catch (e) {
    console.error('Init error', e);
  }
});
