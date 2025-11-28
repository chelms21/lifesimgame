// --- Game State Variables ---
let mii = {
    name: 'New Mii',
    personality: 'easygoing',
    happiness: 100,
    hunger: 100,
};

let gameData = {
    money: 50, 
    inventory: {
        'apple': 2,
        'coffee': 1
    },
    isSleeping: false,
    currentRequest: null // Stores the key of the requested item (e.g., 'sandwich')
}

let gameLoop = null; 
const SAVE_KEY = 'miiLifeSaveDataV3'; // Updated key
const DECAY_RATE = 5; 
const UPDATE_INTERVAL = 2000; 
const REQUEST_CHANCE = 0.05; // 5% chance per tick to generate a request

// --- Item Definitions ---
const ITEMS = {
    // Food Items (Affects Hunger + Happiness)
    'apple': { name: 'Apple 🍎', type: 'food', cost: 10, hunger: 20, happiness: 5 },
    'sandwich': { name: 'Sandwich 🥪', type: 'food', cost: 30, hunger: 40, happiness: 10 },
    'steak': { name: 'Gourmet Steak 🥩', type: 'food', cost: 100, hunger: 90, happiness: 20 }, // New Tiered Item
    // Mood Items (Affects only Happiness)
    'coffee': { name: 'Coffee ☕', type: 'mood', cost: 15, happiness: 20 },
    'toy_car': { name: 'Toy Car 🚗', type: 'mood', cost: 50, happiness: 40 }
};

// Items that can be requested (excluding expensive or non-consumable)
const REQUESTABLE_ITEMS = ['apple', 'sandwich', 'coffee']; 

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
const sleepButton = document.getElementById('sleep-button');
const miiAvatar = document.querySelector('.mii-avatar');
const requestBox = document.getElementById('mii-request-box');
const requestedItemName = document.getElementById('requested-item-name');


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
    updateSleepStateVisuals(); // Apply sleep state immediately if loaded
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
    gameData.inventory = { 'apple': 2 }; 
    gameData.isSleeping = false;
    gameData.currentRequest = null;

    renderMiiState();
    showGameScreen();
    saveGame(); 
}


// --- Core Game Loop Functions ---

function updateStats() {
    if (gameData.isSleeping || mii.happiness <= 0) return; // Stop decay if sleeping or dead

    // 1. Hunger always decreases
    mii.hunger = Math.max(0, mii.hunger - DECAY_RATE);

    // 2. Happiness decreases faster if hunger is low
    let happinessDecay = DECAY_RATE;
    if (mii.hunger < 30) {
        happinessDecay *= 2; 
    }
    
    // Personality effect 
    if (mii.personality === 'stubborn') {
        happinessDecay *= 0.7; 
    }

    mii.happiness = Math.max(0, mii.happiness - happinessDecay);
    
    // 3. Request Generation
    if (!gameData.currentRequest && Math.random() < REQUEST_CHANCE && mii.happiness < 70) {
        const itemKey = REQUESTABLE_ITEMS[Math.floor(Math.random() * REQUESTABLE_ITEMS.length)];
        gameData.currentRequest = itemKey;
        renderRequest();
    }
    
    // 4. Request Decay (If ignored)
    if (gameData.currentRequest) {
        mii.happiness = Math.max(0, mii.happiness - 2); // Minor happiness drop if request active
    }

    renderMiiState();
    checkIfGameIsOver();
    saveGame(); // Autosave every tick
}

function renderMiiState() {
    miiNameDisplay.textContent = mii.name;
    personalityStat.textContent = mii.personality.charAt(0).toUpperCase() + mii.personality.slice(1);
    
    happinessStat.textContent = Math.round(mii.happiness);
    hungerStat.textContent = Math.round(mii.hunger);

    happinessBar.style.width = `${mii.happiness}%`;
    hungerBar.style.width = `${mii.hunger}%`;

    // Reset avatar classes
    miiAvatar.classList.remove('sad', 'starving');

    // Message logic and visual status
    if (mii.happiness <= 0) {
        // Handled by checkIfGameIsOver
    } else if (mii.hunger < 20) {
        miiMessage.textContent = `${mii.name} is critically starving!`;
        hungerBar.classList.add('low');
        miiAvatar.classList.add('starving'); // Visual: Starving
    } else if (mii.happiness < 30) {
        miiMessage.textContent = `${mii.name} is extremely sad.`;
        happinessBar.classList.add('low');
        miiAvatar.classList.add('sad'); // Visual: Sad
    } else if (mii.hunger < 50) {
        miiMessage.textContent = `${mii.name} is hungry.`;
        hungerBar.classList.add('low');
    } else if (mii.happiness < 60) {
        miiMessage.textContent = `${mii.name} needs attention.`;
        happinessBar.classList.add('low');
    } else {
        miiMessage.textContent = `${mii.name} is doing great!`;
        happinessBar.classList.remove('low');
        hungerBar.classList.remove('low');
    }
    
    // Request Message
    if (gameData.currentRequest) {
        renderRequest();
    } else {
        requestBox.classList.add('hidden');
    }
}

function renderMoney() {
    moneyStat.textContent = gameData.money;
}

// --- Action Functions ---

function workForMoney() {
    if (mii.happiness < 30) {
        miiMessage.textContent = `${mii.name} is too sad to work right now. Cheer them up!`;
        return;
    }
    
    const earned = 10;
    gameData.money += earned;
    mii.happiness = Math.max(0, mii.happiness - 5); // Working is tiring!
    
    renderMoney();
    renderMiiState();
    miiMessage.textContent = `${mii.name} worked hard and earned 💰${earned} gold!`;
    saveGame();
}

function toggleSleep() {
    gameData.isSleeping = !gameData.isSleeping;
    updateSleepStateVisuals();
    
    if (gameData.isSleeping) {
        miiMessage.textContent = `${mii.name} is sleeping peacefully... Decay is paused.`;
        // Give a small boost upon going to sleep
        mii.happiness = Math.min(100, mii.happiness + 5); 
    } else {
        miiMessage.textContent = `${mii.name} is awake and refreshed!`;
    }
    renderMiiState();
    saveGame();
}

function updateSleepStateVisuals() {
    if (gameData.isSleeping) {
        sleepButton.textContent = "🌅 Wake Up";
        sleepButton.style.backgroundColor = '#4CAF50';
        miiAvatar.classList.add('sleeping');
    } else {
        sleepButton.textContent = "🛌 Go to Sleep";
        sleepButton.style.backgroundColor = '#ff69b4';
        miiAvatar.classList.remove('sleeping');
    }
}

function renderRequest() {
    if (gameData.currentRequest) {
        const item = ITEMS[gameData.currentRequest];
        requestedItemName.textContent = item.name;
        requestBox.classList.remove('hidden');
    } else {
        requestBox.classList.add('hidden');
    }
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
            // Only allow item use if not sleeping
            if (!gameData.isSleeping) {
                slot.setAttribute('onclick', `useItem('${key}')`);
            }
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
    if (mii.happiness <= 0 || gameData.isSleeping) return;

    const item = ITEMS[key];
    
    if (gameData.inventory[key] > 0) {
        gameData.inventory[key] -= 1; // Decrease count

        // Calculate base boosts
        let hungerBoost = item.hunger || 0;
        let happinessBoost = item.happiness || 0;
        let isFulfillingRequest = false;

        // Check for Request fulfillment
        if (gameData.currentRequest === key) {
            happinessBoost += 30; // Huge bonus for fulfilling the request!
            miiMessage.textContent = `🎉 ${mii.name} got exactly what they wanted! Huge happiness boost!`;
            gameData.currentRequest = null;
            isFulfillingRequest = true;
        }

        if (item.type === 'food') {
            mii.hunger = Math.min(100, mii.hunger + hungerBoost);
        }
        
        // Apply personality modifier (e.g., Stubborn Miis are harder to cheer up unless hungry)
        if (mii.personality === 'stubborn' && item.type === 'mood' && !isFulfillingRequest) {
            happinessBoost *= 0.5; // Stubborn Miis get less boost from mood items
        }

        mii.happiness = Math.min(100, mii.happiness + happinessBoost);
        
        if (!isFulfillingRequest) {
            miiMessage.textContent = `${mii.name} used the ${item.name}.`;
        }
        
        renderMiiState();
        renderInventory();
        saveGame();
    } else {
        miiMessage.textContent = `You don't have any ${item.name}!`;
    }
}

// --- Store Logic (Remains mostly the same) ---

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
        
        gameData.inventory[key] = (gameData.inventory[key] || 0) + 1;
        
        alert(`Purchased ${ITEMS[key].name} for ${cost} gold!`);
        
        renderMoney();
        renderStore();
        renderInventory(); 
        saveGame();
    } else {
        alert("You don't have enough money!");
    }
}

// --- Status and Game Over ---

function checkIfGameIsOver() {
    if (mii.happiness <= 0) {
        clearInterval(gameLoop);
        gameLoop = null; 
        miiMessage.textContent = `💔 ${mii.name} has left Maple Island due to extreme sadness.`;
        saveMessage.textContent = "The game has ended. Please reset to start a new Mii.";
        alert("Game Over! Happiness dropped to 0.");
    }
}

// --- Save/Load/Reset Functions ---

function saveGame() {
    try {
        const dataToSave = JSON.stringify({ mii, gameData }); 
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
        
        // Load Game data
        gameData.money = loaded.gameData.money || 0;
        gameData.inventory = loaded.gameData.inventory || {};
        gameData.isSleeping = loaded.gameData.isSleeping || false; // Load new properties
        gameData.currentRequest = loaded.gameData.currentRequest || null;
        
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


// --- Additional Closing Listeners ---

// 1. Close when user clicks outside the modal content area
window.addEventListener('click', function(event) {
    if (event.target === storeModal && !storeModal.classList.contains('hidden')) {
        closeStore();
    }
});

// 2. Close when user presses the Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && !storeModal.classList.contains('hidden')) {
        closeStore();
    }
});


// Start the whole process when the script loads
initGame();
