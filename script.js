// --- Game State Variables ---
let mii = {
    name: 'New Mii',
    personality: 'easygoing',
    happiness: 100,
    hunger: 100
};

let gameData = {
    money: 50, // Starting money for a new game
    inventory: {
        'apple': 2,
        'coffee': 1
    }
}

let gameLoop = null; 
const SAVE_KEY = 'miiLifeSaveDataV2'; // Changed key due to new data structure
const DECAY_RATE = 5; 
const UPDATE_INTERVAL = 2000; 

// --- Item Definitions ---
const ITEMS = {
    // Food Items (Affects Hunger + Happiness)
    'apple': { name: 'Apple 🍎', type: 'food', cost: 10, hunger: 20, happiness: 5 },
    'sandwich': { name: 'Sandwich 🥪', type: 'food', cost: 30, hunger: 40, happiness: 10 },
    // Mood Items (Affects only Happiness)
    'coffee': { name: 'Coffee ☕', type: 'mood', cost: 15, happiness: 20 },
    'toy_car': { name: 'Toy Car 🚗', type: 'mood', cost: 50, happiness: 40 }
};

// --- DOM Element References ---
const creationScreen = document.getElementById('creation-screen');
const gameScreen = document.getElementById('game-screen');
const miiNameDisplay = document.getElementById('mii-name');
const personalityStat = document.getElementById('personality-stat');
const happinessStat = document.getElementById('happiness-stat');
const happinessBar = document.getElementById('happiness-bar');
const hungerStat = document.getElementById('hunger-stat');
const hungerBar = document.getElementById('hunger-bar');
const miiMessage = document.getElementById('mii-message');
const saveMessage = document.getElementById('save-message');
const moneyStat = document.getElementById('money-stat');
const inventoryList = document.getElementById('inventory-list');
const storeModal = document.getElementById('store-modal');
const storeMoney = document.getElementById('store-money');
const storeItemsDiv = document.getElementById('store-items');

// --- Initialization and Screen Management ---

function initGame() {
    const savedData = localStorage.getItem(SAVE_KEY);
    if (savedData) {
        loadGame(savedData);
        showGameScreen();
    } else {
        showCreationScreen();
    }
}

function showCreationScreen() {
    creationScreen.classList.remove('hidden');
    gameScreen.classList.add('hidden');
}

function showGameScreen() {
    creationScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    if (!gameLoop) {
        gameLoop = setInterval(updateStats, UPDATE_INTERVAL);
    }
    renderInventory();
    renderMoney();
}

function createMii() {
    const nameInput = document.getElementById('mii-name-input').value.trim();
    const personalitySelect = document.getElementById('mii-personality-select').value;
    
    if (nameInput === "") {
        alert("Please give your Mii a name!");
        return;
    }
    
    // Set initial Mii data
    mii.name = nameInput;
    mii.personality = personalitySelect;
    mii.happiness = 100;
    mii.hunger = 100;

    // Reset game data for new Mii
    gameData.money = 50;
    gameData.inventory = { 'apple': 2 }; // Start with a couple of items

    renderMiiState();
    showGameScreen();
    saveGame(); 
}


// --- Game Loop Functions ---

function updateStats() {
    // ... (Keep the decay logic from previous version, just use mii object) ...
    mii.hunger = Math.max(0, mii.hunger - DECAY_RATE);

    let happinessDecay = DECAY_RATE;
    if (mii.hunger < 30) {
        happinessDecay *= 2; 
    }
    if (mii.personality === 'stubborn') {
        happinessDecay *= 0.7; 
    }
    mii.happiness = Math.max(0, mii.happiness - happinessDecay);
    
    // Small chance to earn money (income simulation)
    if (Math.random() < 0.2) { 
        gameData.money += 1;
        renderMoney();
    }

    renderMiiState();
    checkIfGameIsOver();
}

function renderMiiState() {
    // ... (Keep the render logic from previous version, using mii object) ...
    miiNameDisplay.textContent = mii.name;
    personalityStat.textContent = mii.personality.charAt(0).toUpperCase() + mii.personality.slice(1);
    
    happinessStat.textContent = Math.round(mii.happiness);
    hungerStat.textContent = Math.round(mii.hunger);

    happinessBar.style.width = `${mii.happiness}%`;
    hungerBar.style.width = `${mii.hunger}%`;

    // Message logic (simplified)
    if (mii.happiness <= 0) {
        // Handled by checkIfGameIsOver
    } else if (mii.hunger < 30) {
        miiMessage.textContent = `${mii.name} is starving!`;
        hungerBar.classList.add('low');
    } else if (mii.happiness < 40) {
        miiMessage.textContent = `${mii.name} needs cheering up.`;
        happinessBar.classList.add('low');
    } else {
        miiMessage.textContent = `${mii.name} is doing okay.`;
        happinessBar.classList.remove('low');
        hungerBar.classList.remove('low');
    }
}

function renderMoney() {
    moneyStat.textContent = gameData.money;
}

// --- Item and Inventory Logic ---

function renderInventory() {
    inventoryList.innerHTML = ''; // Clear existing list
    
    let hasItems = false;
    for (const key in gameData.inventory) {
        const count = gameData.inventory[key];
        if (count > 0) {
            hasItems = true;
            const item = ITEMS[key];
            const slot = document.createElement('div');
            slot.className = 'item-slot';
            slot.setAttribute('onclick', `useItem('${key}')`);
            slot.innerHTML = `
                <h4>${item.name}</h4>
                <p>Qty: <span class="count">${count}</span></p>
                <small>${item.type === 'food' ? 'Food' : 'Mood'}</small>
            `;
            inventoryList.appendChild(slot);
        }
    }

    if (!hasItems) {
        inventoryList.innerHTML = '<p>Your inventory is empty. Visit the Maple Store!</p>';
    }
}

function useItem(key) {
    if (mii.happiness <= 0) return;

    const item = ITEMS[key];
    
    if (gameData.inventory[key] > 0) {
        gameData.inventory[key] -= 1; // Decrease count

        if (item.type === 'food') {
            mii.hunger = Math.min(100, mii.hunger + item.hunger);
            miiMessage.textContent = `${mii.name} loved the ${item.name}! Hunger +${item.hunger}.`;
        }
        
        // Mood items and food items both boost happiness
        mii.happiness = Math.min(100, mii.happiness + item.happiness);
        
        // Personality check for effect messaging (optional)
        if (item.type === 'mood' && mii.personality === 'stubborn') {
             miiMessage.textContent = `${mii.name} is slightly happier from the ${item.name}.`;
        }
        
        renderMiiState();
        renderInventory();
        saveGame();
    } else {
        alert("You don't have that item!");
    }
}

// --- Store Logic ---

function openStore() {
    storeModal.classList.remove('hidden');
    renderStore();
}

function closeStore() {
    storeModal.classList.add('hidden');
}

function renderStore() {
    storeMoney.textContent = gameData.money;
    storeItemsDiv.innerHTML = '';

    for (const key in ITEMS) {
        const item = ITEMS[key];
        const slot = document.createElement('div');
        slot.className = 'item-slot store-item';
        slot.setAttribute('onclick', `buyItem('${key}', ${item.cost})`);
        
        let effectText = item.type === 'food' 
            ? `Hng +${item.hunger}, Hpp +${item.happiness}` 
            : `Hpp +${item.happiness}`;

        slot.innerHTML = `
            <h4>${item.name}</h4>
            <p>Cost: <span class="count">💰${item.cost}</span></p>
            <small>${effectText}</small>
        `;
        storeItemsDiv.appendChild(slot);
    }
}

function buyItem(key, cost) {
    if (gameData.money >= cost) {
        gameData.money -= cost;
        
        // Add item to inventory, initialize if it doesn't exist
        gameData.inventory[key] = (gameData.inventory[key] || 0) + 1;
        
        alert(`Purchased ${ITEMS[key].name} for ${cost} gold!`);
        
        renderMoney();
        renderStore();
        renderInventory(); // Update main screen inventory
        saveGame();
    } else {
        alert("You don't have enough money!");
    }
}

// --- Save/Load/Reset Functions ---

function saveGame() {
    try {
        const dataToSave = JSON.stringify({ mii, gameData }); // Save both objects
        localStorage.setItem(SAVE_KEY, dataToSave);
        saveMessage.textContent = `Game saved successfully! (${new Date().toLocaleTimeString()})`;
    } catch (e) {
        saveMessage.textContent = "Error saving game data.";
        console.error("Could not save to localStorage", e);
    }
}

function loadGame(savedData) {
    try {
        const loaded = JSON.parse(savedData);
        // Load Mii data
        mii.name = loaded.mii.name || 'Unknown Mii';
        mii.personality = loaded.mii.personality || 'easygoing';
        mii.happiness = loaded.mii.happiness;
        mii.hunger = loaded.mii.hunger;
        
        // Load Game data, handle case where old saves didn't have gameData
        gameData.money = loaded.gameData.money || 0;
        gameData.inventory = loaded.gameData.inventory || {};
        
        saveMessage.textContent = `Game loaded for ${mii.name}.`;
        renderMiiState();
        renderMoney();
    } catch (e) {
        saveMessage.textContent = "Error loading game data. Starting new game.";
        console.error("Could not parse saved data", e);
        showCreationScreen();
    }
}

function resetGame() {
    if (confirm("Are you sure you want to delete your Mii and reset the game?")) {
        localStorage.removeItem(SAVE_KEY);
        if (gameLoop) {
            clearInterval(gameLoop);
            gameLoop = null;
        }
        window.location.reload(); 
    }
}

// Start the whole process
initGame();
