// --- Game State Variables ---
let miiList = []; // Array to hold all Mii objects
let currentMiiIndex = -1; // Index of the currently selected Mii in miiList

let gameData = {
    money: 50, 
    inventory: {
        'apple': 2,
        'coffee': 1
    }
}

let gameLoop = null; 
const SAVE_KEY = 'miiLifeSaveDataV4'; // Updated key
const DECAY_RATE = 2; // *** SLOWER DECAY RATE ***
const UPDATE_INTERVAL = 3000; // *** SLOWER GAME LOOP (3 seconds) ***
const REQUEST_CHANCE = 0.03; // 3% chance per tick

// --- Item Definitions (Remains the same) ---
const ITEMS = {
    'apple': { name: 'Apple 🍎', type: 'food', cost: 10, hunger: 20, happiness: 5 },
    'sandwich': { name: 'Sandwich 🥪', type: 'food', cost: 30, hunger: 40, happiness: 10 },
    'steak': { name: 'Gourmet Steak 🥩', type: 'food', cost: 100, hunger: 90, happiness: 20 },
    'coffee': { name: 'Coffee ☕', type: 'mood', cost: 15, happiness: 20 },
    'toy_car': { name: 'Toy Car 🚗', type: 'mood', cost: 50, happiness: 40 }
};
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
const miiSelector = document.getElementById('mii-select');
const residentCountSpan = document.getElementById('resident-count');
const startTownButton = document.getElementById('start-town-button');
const newMiiModal = document.getElementById('new-mii-modal');


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
    newMiiModal.classList.add('hidden');
    updateCreationScreenState();
}

function startGame() {
    if (miiList.length > 0) {
        currentMiiIndex = 0; // Select the first Mii
        showGameScreen();
    }
}

function showGameScreen() {
    creationScreen.classList.add('hidden');
    newMiiModal.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    // Ensure loop is running
    if (!gameLoop) {
        gameLoop = setInterval(updateAllMiiStats, UPDATE_INTERVAL);
    }
    
    renderMiiSelector();
    renderInventory();
    renderMoney();
    renderCurrentMiiState();
}

function updateCreationScreenState() {
    residentCountSpan.textContent = miiList.length;
    if (miiList.length > 0) {
        startTownButton.disabled = false;
        startTownButton.textContent = `Start Town Life (${miiList.length} Miis)`;
    } else {
        startTownButton.disabled = true;
        startTownButton.textContent = `Start Town Life (Requires 1+ Mii)`;
    }
}

// --- Mii Management ---

/**
 * Creates a new Mii object and adds it to the list.
 * @param {string} name 
 * @param {string} personality 
 */
function createMiiObject(name, personality) {
    return {
        id: Date.now(), // Unique ID for persistence
        name: name,
        personality: personality,
        happiness: 100,
        hunger: 100,
        isSleeping: false,
        currentRequest: null,
        isDead: false
    };
}

function addMiiToTown() {
    const nameInput = document.getElementById('mii-name-input');
    const personalitySelect = document.getElementById('mii-personality-select');
    const name = nameInput.value.trim();
    const personality = personalitySelect.value;
    
    if (name === "") {
        alert("Please give your Mii a name!");
        return;
    }

    miiList.push(createMiiObject(name, personality));
    
    // Reset form fields
    nameInput.value = '';
    
    updateCreationScreenState();
    alert(`${name} has moved into the apartment!`);
}

function openNewMiiCreation() {
    newMiiModal.classList.remove('hidden');
    // Clear previous input
    document.getElementById('new-mii-name-input').value = '';
}

function closeNewMiiModal() {
    newMiiModal.classList.add('hidden');
}

function addNewMii() {
    const nameInput = document.getElementById('new-mii-name-input');
    const personalitySelect = document.getElementById('new-mii-personality-select');
    const name = nameInput.value.trim();
    const personality = personalitySelect.value;
    
    if (name === "") {
        alert("Please give your Mii a name!");
        return;
    }

    miiList.push(createMiiObject(name, personality));
    
    closeNewMiiModal();
    renderMiiSelector(); // Update the dropdown list
    miiMessage.textContent = `${name} has joined the town!`;
    saveGame();
}

function renderMiiSelector() {
    miiSelector.innerHTML = '';
    miiList.forEach((mii, index) => {
        if (!mii.isDead) {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${mii.name} (${Math.round(mii.happiness)}❤️)`;
            miiSelector.appendChild(option);
        }
    });

    // Re-select the current Mii if they are still alive
    if (currentMiiIndex >= 0 && miiList[currentMiiIndex] && !miiList[currentMiiIndex].isDead) {
         miiSelector.value = currentMiiIndex;
    } else if (miiList.filter(m => !m.isDead).length > 0) {
        // If the current Mii died, select the next available Mii
        currentMiiIndex = miiList.findIndex(m => !m.isDead);
        miiSelector.value = currentMiiIndex;
    } else {
        // If everyone is gone
        currentMiiIndex = -1;
    }

    renderCurrentMiiState();
}

function switchMii() {
    currentMiiIndex = parseInt(miiSelector.value);
    renderCurrentMiiState();
}

// --- Core Game Loop Functions ---

/**
 * Iterates through ALL Miis and updates their stats.
 */
function updateAllMiiStats() {
    miiList.forEach(mii => {
        if (mii.isSleeping || mii.isDead) return; 

        // 1. Hunger always decreases
        mii.hunger = Math.max(0, mii.hunger - DECAY_RATE);

        // 2. Happiness decreases
        let happinessDecay = DECAY_RATE;
        if (mii.hunger < 30) {
            happinessDecay *= 2; 
        }
        if (mii.personality === 'stubborn') {
            happinessDecay *= 0.7; 
        }

        mii.happiness = Math.max(0, mii.happiness - happinessDecay);
        
        // 3. Request Generation
        if (!mii.currentRequest && Math.random() < REQUEST_CHANCE && mii.happiness < 70) {
            mii.currentRequest = REQUESTABLE_ITEMS[Math.floor(Math.random() * REQUESTABLE_ITEMS.length)];
        }
        
        // 4. Request Decay (If ignored)
        if (mii.currentRequest) {
            mii.happiness = Math.max(0, mii.happiness - 1); 
        }
        
        // Check for Game Over (Death)
        if (mii.happiness <= 0) {
            mii.isDead = true;
            miiMessage.textContent = `💔 Oh no! ${mii.name} has passed away due to extreme sadness.`;
            renderMiiSelector(); // Update list to remove them
        }
    });
    
    // Re-render only the currently selected Mii and the selector list
    renderCurrentMiiState();
    renderMiiSelector(); 
    checkIfTownIsOver();
    saveGame(); 
}

/**
 * Renders the state of the currently selected Mii to the card.
 */
function renderCurrentMiiState() {
    const mii = miiList[currentMiiIndex];

    if (!mii) {
        // If no Mii is selected (e.g., all have died)
        miiNameDisplay.textContent = "No Active Resident";
        // Hide/Reset other elements
        [happinessStat, hungerStat, personalityStat].forEach(el => el.textContent = '---');
        [happinessBar, hungerBar].forEach(bar => bar.style.width = '0%');
        requestBox.classList.add('hidden');
        miiAvatar.classList.remove('sad', 'starving', 'sleeping');
        return;
    }
    
    // Update Mii Card Details
    miiNameDisplay.textContent = mii.name;
    personalityStat.textContent = mii.personality.charAt(0).toUpperCase() + mii.personality.slice(1);
    happinessStat.textContent = Math.round(mii.happiness);
    hungerStat.textContent = Math.round(mii.hunger);

    happinessBar.style.width = `${mii.happiness}%`;
    hungerBar.style.width = `${mii.hunger}%`;

    // --- Visuals and Messages ---
    miiAvatar.classList.remove('sad', 'starving', 'sleeping');
    happinessBar.classList.remove('low');
    hungerBar.classList.remove('low');
    
    updateSleepStateVisuals(mii); // Set sleep visuals
    
    if (mii.isDead) {
        miiMessage.textContent = `${mii.name} is gone. Reset the game or focus on another resident.`;
        return;
    }

    if (mii.currentRequest) {
        requestedItemName.textContent = ITEMS[mii.currentRequest].name;
        requestBox.classList.remove('hidden');
    } else {
        requestBox.classList.add('hidden');
    }

    if (mii.hunger < 20) {
        miiMessage.textContent = `${mii.name} is critically starving!`;
        hungerBar.classList.add('low');
        miiAvatar.classList.add('starving'); 
    } else if (mii.happiness < 30) {
        miiMessage.textContent = `${mii.name} is extremely sad.`;
        happinessBar.classList.add('low');
        miiAvatar.classList.add('sad'); 
    } else if (mii.hunger < 50) {
        miiMessage.textContent = `${mii.name} is hungry.`;
        hungerBar.classList.add('low');
    } else if (mii.happiness < 60) {
        miiMessage.textContent = `${mii.name} needs attention.`;
        happinessBar.classList.add('low');
    } else {
        miiMessage.textContent = `${mii.name} is doing great!`;
    }
}

function checkIfTownIsOver() {
    if (miiList.length > 0 && miiList.every(mii => mii.isDead)) {
        clearInterval(gameLoop);
        gameLoop = null;
        miiMessage.textContent = `🚨 TOWN OVER! All residents have departed Maple Island.`;
        saveMessage.textContent = "The game has ended. Please reset to start a new town.";
        alert("TOWN OVER! No residents remaining.");
    }
}

// --- Action Functions ---

function workForMoney() {
    // Money is a communal resource for the town
    if (miiList[currentMiiIndex].happiness < 30) {
        miiMessage.textContent = `${miiList[currentMiiIndex].name} is too sad to work right now. Cheer them up!`;
        return;
    }
    
    const earned = 10;
    gameData.money += earned;
    miiList[currentMiiIndex].happiness = Math.max(0, miiList[currentMiiIndex].happiness - 5); 
    
    renderMoney();
    renderCurrentMiiState();
    miiMessage.textContent = `${miiList[currentMiiIndex].name} worked hard and earned 💰${earned} gold for the town!`;
    saveGame();
}

function toggleSleep() {
    const mii = miiList[currentMiiIndex];
    if (!mii) return;

    mii.isSleeping = !mii.isSleeping;
    
    if (mii.isSleeping) {
        miiMessage.textContent = `${mii.name} is sleeping peacefully... Decay is paused.`;
        mii.happiness = Math.min(100, mii.happiness + 5); 
    } else {
        miiMessage.textContent = `${mii.name} is awake and refreshed!`;
    }
    renderCurrentMiiState();
    saveGame();
}

function updateSleepStateVisuals(mii) {
    if (!mii) return;
    
    if (mii.isSleeping) {
        sleepButton.textContent = "🌅 Wake Up";
        sleepButton.style.backgroundColor = '#4CAF50';
        miiAvatar.classList.add('sleeping');
    } else {
        sleepButton.textContent = "🛌 Go to Sleep";
        sleepButton.style.backgroundColor = '#ff69b4';
        miiAvatar.classList.remove('sleeping');
    }
}

// --- Item and Inventory Logic ---

function renderInventory() {
    inventoryList.innerHTML = ''; 
    
    let hasItems = false;
    for (const key in gameData.inventory) {
        const count = gameData.inventory[key];
        if (count > 0) {
            hasItems = true;
            const item = ITEMS[key];
            const slot = document.createElement('div');
            slot.className = 'item-slot';
            // Only allow item use if a Mii is selected and awake
            if (currentMiiIndex >= 0 && !miiList[currentMiiIndex].isSleeping) {
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
        inventoryList.innerHTML = '<p>Town inventory is empty. Visit the Maple Store!</p>';
    }
}

function useItem(key) {
    const mii = miiList[currentMiiIndex];
    if (!mii || mii.isDead || mii.isSleeping) return;

    const item = ITEMS[key];
    
    if (gameData.inventory[key] > 0) {
        gameData.inventory[key] -= 1; 

        // Calculate base boosts
        let hungerBoost = item.hunger || 0;
        let happinessBoost = item.happiness || 0;
        let isFulfillingRequest = false;

        // Check for Request fulfillment
        if (mii.currentRequest === key) {
            happinessBoost += 30; // Huge bonus for fulfilling the request!
            miiMessage.textContent = `🎉 ${mii.name} got exactly what they wanted! Huge happiness boost!`;
            mii.currentRequest = null;
            isFulfillingRequest = true;
        }

        if (item.type === 'food') {
            mii.hunger = Math.min(100, mii.hunger + hungerBoost);
        }
        
        // Apply personality modifier
        if (mii.personality === 'stubborn' && item.type === 'mood' && !isFulfillingRequest) {
            happinessBoost *= 0.5; 
        }

        mii.happiness = Math.min(100, mii.happiness + happinessBoost);
        
        if (!isFulfillingRequest) {
            miiMessage.textContent = `${mii.name} used the ${item.name}.`;
        }
        
        renderCurrentMiiState();
        renderInventory();
        saveGame();
    } else {
        miiMessage.textContent = `The town inventory doesn't have any ${item.name}!`;
    }
}

// --- Store Logic (Remains the same, but uses gameData.money) ---

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
        alert("You don't have enough town money!");
    }
}

// --- Save/Load/Reset Functions ---

function saveGame() {
    try {
        const dataToSave = JSON.stringify({ miiList, gameData, currentMiiIndex }); 
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
        
        // Load town data
        miiList = loaded.miiList || [];
        currentMiiIndex = loaded.currentMiiIndex || 0;
        
        // Load Game data
        gameData.money = loaded.gameData.money || 0;
        gameData.inventory = loaded.gameData.inventory || {};
        
        saveMessage.textContent = `Town data loaded.`;
        
    } catch (e) {
        saveMessage.textContent = "Error loading game data. Starting new town.";
        console.error("Could not parse saved data", e);
        showCreationScreen();
    }
}

function resetGame() {
    if (confirm("Are you sure you want to delete your entire town and reset the game?")) {
        localStorage.removeItem(SAVE_KEY);
        if (gameLoop) {
            clearInterval(gameLoop);
            gameLoop = null;
        }
        window.location.reload(); 
    }
}


// --- Modal Closing Listeners ---

window.addEventListener('click', function(event) {
    if (event.target === storeModal && !storeModal.classList.contains('hidden')) {
        closeStore();
    }
    if (event.target === newMiiModal && !newMiiModal.classList.contains('hidden')) {
        closeNewMiiModal();
    }
});

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        if (!storeModal.classList.contains('hidden')) {
            closeStore();
        } else if (!newMiiModal.classList.contains('hidden')) {
            closeNewMiiModal();
        }
    }
});


// Start the whole process when the script loads
initGame();
