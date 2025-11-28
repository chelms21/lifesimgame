// --- Game State Variables ---
let miiList = []; 
let currentMiiIndex = -1; 

let gameData = {
    money: 50, 
    inventory: {
        'apple': 2,
        'coffee': 1
    },
    isCaretakerActive: false, 
    investmentTotal: 0,
    savingsTotal: 0, 
    mode: 'manual', 
    difficulty: 'normal', 
    townHallOwned: false,
    researchCompleted: [],
    gameTickCount: 0,
    currentSeason: 'spring',
    activeEvent: null,
    currentGoals: [],
}

let gameLoop = null; 
const SAVE_KEY = 'miiLifeSaveDataV10'; 
const DECAY_RATE = 2; 
const ENERGY_DECAY_RATE = 1.5; 
const UPDATE_INTERVAL = 3000; 
const REQUEST_CHANCE = 0.03; 

// --- System Constants ---
const CARETAKER_PURCHASE_PRICE = 500; 
const CARETAKER_FOOD = 'apple';
const CARETAKER_MOOD = 'coffee';
const CARETAKER_THRESHOLD = 40; 
const AUTOMATIC_WORK_CHANCE = 0.15; 
const AUTOMATIC_DATING_CHANCE = 0.05; 
const PARTY_COST = 150; 
const PARTY_HAPPINESS_BONUS = 30; 
const SAVINGS_INTEREST_RATE = 0.01; 

// --- Skill & Job Constants ---
const MAX_SKILL = 100;
const SKILL_GAIN_RATE = 5;
const JOB_PAY_BASE = 10;
const JOB_PAY_MULTIPLIER = 0.5;

// --- DOM Elements ---
const mainScreen = document.getElementById('main-screen');
const miiListElement = document.getElementById('mii-list');
const moneyDisplay = document.getElementById('money-display');
const inventoryList = document.getElementById('inventory-list');
const saveMessage = document.getElementById('save-message');
const statusMessage = document.getElementById('status-message');
const clockDisplay = document.getElementById('clock-display');
const seasonDisplay = document.getElementById('season-display');
const goalsList = document.getElementById('goals-list');

// Modals
const storeModal = document.getElementById('store-modal');
const newMiiModal = document.getElementById('new-mii-modal');
const investmentModal = document.getElementById('investment-modal');
const relationshipModal = document.getElementById('relationship-modal');
const bankModal = document.getElementById('bank-modal');
const townHallModal = document.getElementById('town-hall-modal');
const jobAssignmentModal = document.getElementById('job-assignment-modal');
const giftModal = document.getElementById('gift-modal');

// Creation Screen
const creationScreen = document.getElementById('creation-screen');
const createMiiBtn = document.getElementById('create-mii-btn');
const newMiiNameInput = document.getElementById('new-mii-name');
const newMiiPersonalitySelect = document.getElementById('new-mii-personality');
const newMiiGenderSelect = document.getElementById('new-mii-gender');

// Investment Modal
const investmentAmountInput = document.getElementById('investment-amount');
const investmentReturnDisplay = document.getElementById('investment-return');
const investmentTotalDisplay = document.getElementById('investment-total-display');
const investmentStatus = document.getElementById('investment-status');

// Bank Modal
const savingsAmountInput = document.getElementById('savings-amount');
const savingsInterestDisplay = document.getElementById('savings-interest');
const savingsTotalDisplay = document.getElementById('savings-total-display');

// Store Modal
const storeItemsList = document.getElementById('store-items-list');
const caretakerStatus = document.getElementById('caretaker-status');

// Town Hall Modal
const townHallContent = document.getElementById('town-hall-content');
const researchList = document.getElementById('research-list');
const townHallMoneyInput = document.getElementById('town-hall-money');

// Job Assignment Modal
const jobMiiName = document.getElementById('job-mii-name');
const jobAssignmentSelect = document.getElementById('job-assignment-select');

// Relationship Modal
const miiNameRel = document.getElementById('mii-name-rel');
const relationshipList = document.getElementById('relationship-list');

// Gift Modal
const giftMiiName = document.getElementById('gift-mii-name');
const giftSelect = document.getElementById('gift-select');

// --- Game Data Structures ---
const INVENTORY_ITEMS = {
    apple: { name: 'Apple', price: 5, happiness: 10, energy: 5 },
    coffee: { name: 'Coffee', price: 15, happiness: 5, energy: 20 },
    book: { name: 'Skill Book', price: 50, skill: 15 },
    flower: { name: 'Flower', price: 20, love: 10 },
    music_player: { name: 'Music Player', price: 100, happiness: 25 },
};

const JOBS = {
    none: { name: 'Unemployed', basePay: 0, requiredSkill: 0 },
    janitor: { name: 'Janitor', basePay: 20, requiredSkill: 0 },
    clerk: { name: 'Store Clerk', basePay: 30, requiredSkill: 15 },
    scientist: { name: 'Scientist', basePay: 50, requiredSkill: 40 },
    artist: { name: 'Artist', basePay: 40, requiredSkill: 25 },
    politician: { name: 'Politician', basePay: 60, requiredSkill: 60 }
};

const TOWN_HALL_RESEARCH = {
    // Key: [Description, Cost, Prerequisite Research (or null)]
    'advanced_banking': ['Advanced Banking (Higher Interest)', 500, null],
    'efficient_work': ['Efficient Work (Less Energy Decay)', 750, 'advanced_banking'],
    'social_science': ['Social Science (Better Relationship Gains)', 1000, 'efficient_work'],
    'population_control': ['Population Control (Limit Mii Count)', 2000, 'social_science']
};

const PERSONALITIES = [
    'Energetic', 'Laid-back', 'Serious', 'Creative', 'Social', 'Shy'
];

// --- Utility Functions ---

/**
 * Saves the current game state to localStorage.
 */
function saveGame() {
    const dataToSave = {
        money: gameData.money,
        inventory: gameData.inventory,
        isCaretakerActive: gameData.isCaretakerActive,
        investmentTotal: gameData.investmentTotal,
        savingsTotal: gameData.savingsTotal,
        mode: gameData.mode,
        difficulty: gameData.difficulty,
        townHallOwned: gameData.townHallOwned,
        researchCompleted: gameData.researchCompleted,
        gameTickCount: gameData.gameTickCount,
        currentSeason: gameData.currentSeason,
        activeEvent: gameData.activeEvent,
        currentGoals: gameData.currentGoals,
        miiList: miiList
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(dataToSave));
    saveMessage.textContent = "Game Saved!";
}

/**
 * Loads the game state from localStorage or starts a new game.
 */
function loadGame() {
    const savedData = localStorage.getItem(SAVE_KEY);
    if (!savedData) {
        showCreationScreen();
        return;
    }

    try {
        const data = JSON.parse(savedData);
        
        // Load main game data
        gameData.money = data.money || 0;
        gameData.inventory = data.inventory || {};
        gameData.isCaretakerActive = data.isCaretakerActive || false;
        gameData.investmentTotal = data.investmentTotal || 0;
        gameData.savingsTotal = data.savingsTotal || 0;
        gameData.mode = data.mode || 'manual';
        gameData.difficulty = data.difficulty || 'normal';
        gameData.townHallOwned = data.townHallOwned || false;
        gameData.researchCompleted = data.researchCompleted || [];
        gameData.gameTickCount = data.gameTickCount || 0;
        gameData.currentSeason = data.currentSeason || 'spring';
        gameData.activeEvent = data.activeEvent || null;
        gameData.currentGoals = data.currentGoals || [];

        // Load Miis
        miiList = data.miiList || [];

        // Ensure backward compatibility for Mii objects
        miiList.forEach(mii => {
            mii.happiness = mii.happiness || 50;
            mii.energy = mii.energy || 50;
            mii.isChild = mii.isChild || false;
            mii.skill = mii.skill || 0;
            mii.job = mii.job || 'none';
            mii.isIll = mii.isIll || false;
            
            // Ensure relationship structure exists and has loveScore
            if (!mii.relationship) {
                mii.relationship = { partnerId: null, loveScore: 0 };
            } else if (mii.relationship.loveScore === undefined) {
                 mii.relationship.loveScore = 0;
            }
        });

        saveMessage.textContent = `Town data loaded. Mode: ${gameData.mode.toUpperCase()}, Difficulty: ${gameData.difficulty.toUpperCase()}.`;
        
        // Setup the game loop after successful load
        startGameLoop();
        updateUI();

    } catch (e) {
        saveMessage.textContent = "Error loading game data. Starting new town.";
        console.error("Could not parse saved data", e);
        showCreationScreen();
    }
}

/**
 * Resets the entire game by clearing localStorage and reloading the page.
 */
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

/**
 * @function initGame
 * @description Initializes the game by attempting to load saved data.
 * This function should be called once the DOM is fully loaded.
 */
function initGame() {
    console.log("Game: Initializing startup sequence.");
    // Attach all event listeners for buttons first
    setupEventListeners(); 
    loadGame(); // This will either load the saved town or show the creation screen.
}

/**
 * Starts the main game loop interval.
 */
function startGameLoop() {
    if (!gameLoop) {
        gameLoop = setInterval(gameTick, UPDATE_INTERVAL);
        console.log("Game loop started.");
    }
}

/**
 * Stops the main game loop interval.
 */
function stopGameLoop() {
    if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
        console.log("Game loop stopped.");
    }
}

/**
 * Calculates Mii job pay based on skill.
 * @param {object} mii The Mii object.
 * @returns {number} The calculated pay.
 */
function calculatePay(mii) {
    const job = JOBS[mii.job];
    if (job.basePay === 0) return 0;
    
    // Pay is basePay + (skill / MAX_SKILL) * JOB_PAY_MULTIPLIER * basePay
    const skillBonus = (mii.skill / MAX_SKILL) * JOB_PAY_MULTIPLIER * job.basePay;
    return Math.floor(job.basePay + skillBonus);
}

// --- UI Rendering Functions ---

/**
 * Switches the view to the Mii creation screen.
 */
function showCreationScreen() {
    mainScreen.classList.add('hidden');
    creationScreen.classList.remove('hidden');
}

/**
 * Switches the view to the main game screen and starts the loop.
 */
function showMainScreen() {
    creationScreen.classList.add('hidden');
    mainScreen.classList.remove('hidden');
    startGameLoop();
    updateUI();
}

/**
 * Renders the list of Miis on the main screen.
 */
function renderMiiList() {
    miiListElement.innerHTML = '';
    miiList.forEach((mii, index) => {
        const miiCard = document.createElement('div');
        miiCard.className = `mii-card bg-white p-4 rounded-xl shadow-md cursor-pointer hover:bg-gray-100 transition duration-150 ${mii.isIll ? 'border-4 border-red-500' : ''}`;
        miiCard.dataset.index = index;

        const happinessBarWidth = Math.max(0, mii.happiness);
        const energyBarWidth = Math.max(0, mii.energy);

        let statusIcons = '';
        if (mii.isIll) {
            statusIcons += '<span class="text-red-500 text-lg ml-2" title="Ill">🤒</span>';
        }
        if (mii.relationship.partnerId) {
            statusIcons += '<span class="text-pink-500 text-lg ml-2" title="In Relationship">💖</span>';
        }

        miiCard.innerHTML = `
            <h3 class="font-bold text-lg text-gray-800">${mii.name} ${statusIcons}</h3>
            <p class="text-sm text-gray-600">Job: ${JOBS[mii.job].name}</p>
            <p class="text-xs text-gray-500 mb-2">Personality: ${mii.personality}</p>
            
            <div class="mb-1">
                <span class="text-xs font-medium">❤️ Happiness: ${Math.floor(mii.happiness)}%</span>
                <div class="w-full bg-gray-200 rounded-full h-2.5">
                    <div class="bg-green-500 h-2.5 rounded-full" style="width: ${happinessBarWidth}%"></div>
                </div>
            </div>
            
            <div class="mb-2">
                <span class="text-xs font-medium">⚡ Energy: ${Math.floor(mii.energy)}%</span>
                <div class="w-full bg-gray-200 rounded-full h-2.5">
                    <div class="bg-yellow-500 h-2.5 rounded-full" style="width: ${energyBarWidth}%"></div>
                </div>
            </div>

            <p class="text-xs text-blue-700">Level: ${Math.floor(mii.skill)}</p>
            <div class="flex space-x-2 mt-2">
                <button class="action-btn text-xs bg-blue-500 hover:bg-blue-600 text-white p-1 rounded-lg" onclick="showJobAssignmentModal(${index})">Work</button>
                <button class="action-btn text-xs bg-green-500 hover:bg-green-600 text-white p-1 rounded-lg" onclick="showGiftModal(${index})">Gift</button>
                <button class="action-btn text-xs bg-pink-500 hover:bg-pink-600 text-white p-1 rounded-lg" onclick="showRelationshipModal(${index})">Social</button>
            </div>
        `;
        miiCard.onclick = () => selectMii(index);
        miiListElement.appendChild(miiCard);
    });
}

/**
 * Updates the inventory display.
 */
function renderInventory() {
    inventoryList.innerHTML = `
        <li class="p-2 border-b font-semibold">Inventory</li>
    `;
    for (const itemKey in gameData.inventory) {
        if (gameData.inventory[itemKey] > 0) {
            const item = INVENTORY_ITEMS[itemKey];
            const li = document.createElement('li');
            li.className = 'p-2 flex justify-between items-center';
            li.innerHTML = `
                <span>${item.name}</span>
                <span class="font-bold">${gameData.inventory[itemKey]}</span>
            `;
            inventoryList.appendChild(li);
        }
    }
}

/**
 * Updates the game clock and season display.
 */
function renderClock() {
    const tickDay = Math.floor(gameData.gameTickCount / 12) + 1;
    const tickHour = (gameData.gameTickCount % 12) * 2;
    const hourDisplay = tickHour === 0 ? '12 AM' : (tickHour > 12 ? `${tickHour - 12} PM` : `${tickHour} AM`);

    clockDisplay.textContent = `Day ${tickDay} - ${hourDisplay}`;
    seasonDisplay.textContent = `Season: ${gameData.currentSeason.charAt(0).toUpperCase() + gameData.currentSeason.slice(1)}`;
}

/**
 * Updates the goal list display.
 */
function renderGoals() {
    goalsList.innerHTML = '<li class="p-2 border-b font-semibold">Current Goals</li>';
    if (gameData.currentGoals.length === 0) {
        goalsList.innerHTML += '<li class="p-2 text-gray-500 text-sm">No active goals.</li>';
    } else {
        gameData.currentGoals.forEach(goal => {
            const li = document.createElement('li');
            li.className = 'p-2 text-sm';
            li.textContent = `✅ ${goal.description}`;
            goalsList.appendChild(li);
        });
    }
}

/**
 * Main function to update all UI elements.
 */
function updateUI() {
    moneyDisplay.textContent = gameData.money.toFixed(0);
    renderMiiList();
    renderInventory();
    renderClock();
    renderGoals();
    updateInvestmentModalUI();
    updateBankModalUI();
    updateStoreModalUI();
    updateTownHallModalUI();
    saveGame();
}

// --- Game Logic Functions ---

/**
 * The core game loop function. Executed every UPDATE_INTERVAL.
 */
function gameTick() {
    gameData.gameTickCount++;
    const prevSeason = gameData.currentSeason;
    
    // Update season every 48 ticks (4 days)
    if (gameData.gameTickCount % 48 === 0) {
        const seasons = ['spring', 'summer', 'fall', 'winter'];
        const currentSeasonIndex = seasons.indexOf(gameData.currentSeason);
        gameData.currentSeason = seasons[(currentSeasonIndex + 1) % seasons.length];
        statusMessage.textContent = `It is now ${gameData.currentSeason}!`;

        // Apply seasonal effects (e.g., higher chance of illness in winter)
        if (gameData.currentSeason === 'winter') {
            statusMessage.textContent += " Colder weather increases the chance of illness.";
        }
    }

    // Apply interest on savings at the start of a new day (every 12 ticks)
    if (gameData.gameTickCount % 12 === 0) {
        const interestRate = gameData.researchCompleted.includes('advanced_banking') ? SAVINGS_INTEREST_RATE * 1.5 : SAVINGS_INTEREST_RATE;
        const interest = Math.floor(gameData.savingsTotal * interestRate);
        gameData.savingsTotal += interest;
        if (interest > 0) {
            statusMessage.textContent = `Bank interest earned: +${interest} in savings!`;
        }
    }
    
    // Mii Status Updates & Actions
    miiList.forEach(mii => {
        // 1. Decay
        let happinessDecay = DECAY_RATE;
        let energyDecay = ENERGY_DECAY_RATE;
        
        // Efficient Work research reduces energy decay
        if (mii.job !== 'none' && gameData.researchCompleted.includes('efficient_work')) {
            energyDecay *= 0.75;
        }

        mii.happiness = Math.max(0, mii.happiness - happinessDecay);
        mii.energy = Math.max(0, mii.energy - energyDecay);
        
        // 2. Illness
        if (!mii.isIll && mii.happiness < 20 && Math.random() < 0.05) {
            mii.isIll = true;
            statusMessage.textContent = `${mii.name} has fallen ill! Treat them quickly!`;
        } else if (mii.isIll) {
            // Illness continues to decay happiness faster
            mii.happiness = Math.max(0, mii.happiness - 5);
        }

        // 3. Automatic Actions (if mode is 'automatic' or caretaker is active)
        if (gameData.mode === 'automatic' || gameData.isCaretakerActive) {
            handleAutomaticActions(mii);
        }

        // 4. Job Pay
        if (mii.job !== 'none' && mii.energy >= 20 && Math.random() < AUTOMATIC_WORK_CHANCE) {
            const pay = calculatePay(mii);
            gameData.money += pay;
            mii.energy = Math.max(0, mii.energy - 10); // Spend energy to work
            mii.skill = Math.min(MAX_SKILL, mii.skill + SKILL_GAIN_RATE);
            statusMessage.textContent = `${mii.name} worked and earned ${pay} coins! Skill increased.`;
        }
        
        // 5. Relationship Decay (if in relationship)
        if (mii.relationship.partnerId) {
            const partner = miiList.find(m => m.id === mii.relationship.partnerId);
            if (partner) {
                // Decay love score slowly
                mii.relationship.loveScore = Math.max(0, mii.relationship.loveScore - 1); 
            }
        }
    });

    // Investment Check (Quarterly: every 12 ticks * 4 = 48 ticks)
    if (gameData.gameTickCount % 48 === 1) {
        processInvestments();
    }
    
    // Check Goals
    checkGoals();
    
    updateUI();
}

/**
 * Handles automatic actions for Miis in automatic mode or with caretaker.
 * @param {object} mii The Mii object.
 */
function handleAutomaticActions(mii) {
    // 1. Healing an ill Mii (Caretaker only)
    if (mii.isIll && gameData.isCaretakerActive) {
        if (gameData.inventory['apple'] >= 1) {
            gameData.inventory['apple']--;
            mii.isIll = false;
            mii.happiness = 50; // Restore base health
            statusMessage.textContent = `Caretaker healed ${mii.name}. (1 Apple used)`;
            return;
        }
    }
    
    // 2. Food/Mood (Caretaker or Automatic Mode)
    if (gameData.inventory[CARETAKER_FOOD] && mii.energy < CARETAKER_THRESHOLD) {
        const item = INVENTORY_ITEMS[CARETAKER_FOOD];
        gameData.inventory[CARETAKER_FOOD]--;
        mii.energy = Math.min(100, mii.energy + item.energy);
        statusMessage.textContent = `Caretaker fed ${mii.name}. (1 Apple used)`;
        return;
    }
    
    if (gameData.inventory[CARETAKER_MOOD] && mii.happiness < CARETAKER_THRESHOLD) {
        const item = INVENTORY_ITEMS[CARETAKER_MOOD];
        gameData.inventory[CARETAKER_MOOD]--;
        mii.happiness = Math.min(100, mii.happiness + item.happiness);
        statusMessage.textContent = `Caretaker cheered up ${mii.name}. (1 Coffee used)`;
        return;
    }
    
    // 3. Automatic Dating (Automatic Mode only, for Miis without partner)
    if (gameData.mode === 'automatic' && !mii.relationship.partnerId && Math.random() < AUTOMATIC_DATING_CHANCE) {
        // Find a potential partner (different gender, no partner)
        const potentialPartners = miiList.filter(m => 
            m.gender !== mii.gender && 
            !m.relationship.partnerId && 
            m.id !== mii.id
        );

        if (potentialPartners.length > 0) {
            const partner = potentialPartners[Math.floor(Math.random() * potentialPartners.length)];
            const success = Math.random() > 0.3; // 70% chance of success
            if (success) {
                establishRelationship(mii, partner, 15);
                statusMessage.textContent = `Automatic mode: ${mii.name} and ${partner.name} started dating!`;
            } else {
                statusMessage.textContent = `Automatic mode: ${mii.name}'s attempt to date failed.`;
            }
        }
    }
}

/**
 * Creates a new Mii and adds it to the list.
 * @param {string} name - The Mii's name.
 * @param {string} personality - The Mii's personality.
 * @param {string} gender - The Mii's gender.
 */
function createMii(name, personality, gender) {
    const newMii = {
        id: crypto.randomUUID(), // Unique identifier
        name: name,
        personality: personality,
        gender: gender,
        happiness: 50,
        energy: 50,
        skill: 0,
        job: 'none',
        isChild: false, // All starting Miis are adults
        isIll: false,
        relationship: {
            partnerId: null, // ID of partner Mii
            loveScore: 0
        },
        requests: [] // Future expansion: Mii requests
    };
    miiList.push(newMii);
    saveGame();
    updateUI();
    
    if (miiList.length === 1) {
        showMainScreen(); // Transition to main screen after first Mii is created
    }
}

// --- Investment Logic ---

/**
 * Handles the investment submission from the modal.
 */
function investMoney() {
    const amount = parseInt(investmentAmountInput.value, 10);
    if (isNaN(amount) || amount <= 0) {
        investmentStatus.textContent = "Please enter a valid positive amount.";
        return;
    }
    if (gameData.money < amount) {
        investmentStatus.textContent = "You don't have enough money!";
        return;
    }

    gameData.money -= amount;
    gameData.investmentTotal += amount;
    investmentStatus.textContent = `${amount} coins invested! Wait for the quarterly update.`;
    
    investmentAmountInput.value = '';
    updateUI();
}

/**
 * Processes investment returns or losses based on a random factor.
 */
function processInvestments() {
    if (gameData.investmentTotal === 0) return;

    // Base return is -5% to +15%
    const investmentFactor = Math.random() * 0.20 - 0.05; 
    const returnAmount = Math.floor(gameData.investmentTotal * investmentFactor);

    if (returnAmount > 0) {
        gameData.money += returnAmount;
        statusMessage.textContent = `Investment Success! Gained ${returnAmount} coins (${(investmentFactor * 100).toFixed(1)}%).`;
    } else if (returnAmount < 0) {
        gameData.investmentTotal += returnAmount; // Reduce total investment
        statusMessage.textContent = `Investment Loss! Lost ${Math.abs(returnAmount)} from total investment.`;
    } else {
        statusMessage.textContent = `Investment remained neutral this quarter.`;
    }
    
    updateUI();
}

/**
 * Updates the Investment Modal UI with current totals.
 */
function updateInvestmentModalUI() {
    investmentTotalDisplay.textContent = gameData.investmentTotal;
    investmentReturnDisplay.textContent = `Quarterly return: -5% to +15% (Invested: ${gameData.investmentTotal})`;
}

// --- Bank Logic (Savings) ---

/**
 * Handles the deposit to savings.
 */
function depositSavings() {
    const amount = parseInt(savingsAmountInput.value, 10);
    if (isNaN(amount) || amount <= 0) {
        document.getElementById('savings-status').textContent = "Please enter a valid positive amount.";
        return;
    }
    if (gameData.money < amount) {
        document.getElementById('savings-status').textContent = "You don't have enough money!";
        return;
    }

    gameData.money -= amount;
    gameData.savingsTotal += amount;
    document.getElementById('savings-status').textContent = `${amount} coins deposited into savings.`;
    
    savingsAmountInput.value = '';
    updateUI();
}

/**
 * Handles the withdrawal from savings.
 */
function withdrawSavings() {
    const amount = parseInt(savingsAmountInput.value, 10);
    if (isNaN(amount) || amount <= 0) {
        document.getElementById('savings-status').textContent = "Please enter a valid positive amount.";
        return;
    }
    if (gameData.savingsTotal < amount) {
        document.getElementById('savings-status').textContent = "You don't have enough in savings to withdraw that amount!";
        return;
    }

    gameData.money += amount;
    gameData.savingsTotal -= amount;
    document.getElementById('savings-status').textContent = `${amount} coins withdrawn from savings.`;

    savingsAmountInput.value = '';
    updateUI();
}

/**
 * Updates the Bank Modal UI with current totals and interest rate.
 */
function updateBankModalUI() {
    savingsTotalDisplay.textContent = gameData.savingsTotal;
    let rate = SAVINGS_INTEREST_RATE;
    if (gameData.researchCompleted.includes('advanced_banking')) {
        rate *= 1.5;
        savingsInterestDisplay.textContent = `Quarterly Interest Rate: ${(rate * 100).toFixed(1)}% (Research Active)`;
    } else {
        savingsInterestDisplay.textContent = `Quarterly Interest Rate: ${(rate * 100).toFixed(1)}%`;
    }
}

// --- Store Logic ---

/**
 * Renders the items available in the store modal.
 */
function updateStoreModalUI() {
    storeItemsList.innerHTML = '';
    
    // Regular Items
    for (const key in INVENTORY_ITEMS) {
        const item = INVENTORY_ITEMS[key];
        const li = document.createElement('li');
        li.className = 'flex justify-between items-center p-2 border-b';
        li.innerHTML = `
            <span>${item.name} (${item.price} coins)</span>
            <button class="action-btn text-xs bg-purple-500 hover:bg-purple-600 text-white p-1 rounded-lg" onclick="buyItem('${key}')">Buy</button>
        `;
        storeItemsList.appendChild(li);
    }

    // Caretaker
    if (!gameData.isCaretakerActive) {
        caretakerStatus.innerHTML = `
            <p class="font-bold text-lg">Caretaker</p>
            <p>Purchase the Caretaker for ${CARETAKER_PURCHASE_PRICE} coins to automate basic Mii care (feeding, cheering up, and healing the sick) when they fall below ${CARETAKER_THRESHOLD}% status.</p>
            <button class="action-btn bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded-lg mt-2" onclick="buyCaretaker()">Hire Caretaker</button>
        `;
    } else {
        caretakerStatus.innerHTML = '<p class="font-bold text-lg text-green-600">Caretaker Active!</p>';
    }
}

/**
 * Handles buying an item from the store.
 * @param {string} itemKey - Key of the item to buy.
 */
function buyItem(itemKey) {
    const item = INVENTORY_ITEMS[itemKey];
    if (gameData.money >= item.price) {
        gameData.money -= item.price;
        gameData.inventory[itemKey] = (gameData.inventory[itemKey] || 0) + 1;
        statusMessage.textContent = `Bought 1 ${item.name}.`;
        updateUI();
    } else {
        statusMessage.textContent = `Not enough money to buy ${item.name}.`;
    }
}

/**
 * Handles purchasing the Caretaker service.
 */
function buyCaretaker() {
    if (gameData.money >= CARETAKER_PURCHASE_PRICE) {
        gameData.money -= CARETAKER_PURCHASE_PRICE;
        gameData.isCaretakerActive = true;
        statusMessage.textContent = `Caretaker hired! Basic Mii needs are now automated.`;
        updateUI();
    } else {
        statusMessage.textContent = `Not enough money to hire the Caretaker.`;
    }
}

// --- Town Hall Logic ---

/**
 * Renders the Town Hall modal content, including research and investments.
 */
function updateTownHallModalUI() {
    townHallContent.innerHTML = '';
    researchList.innerHTML = '';

    if (!gameData.townHallOwned) {
        townHallContent.innerHTML = `
            <p class="text-xl font-bold mb-4">Town Hall</p>
            <p>The Town Hall is the center for civic improvement and long-term research. You must purchase the land for 5000 coins to begin building and research.</p>
            <button class="action-btn bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg mt-4" onclick="buyTownHall()">Purchase Town Hall Land (5000 coins)</button>
        `;
        return;
    }

    townHallContent.innerHTML = `
        <p class="text-xl font-bold mb-4 text-green-700">Town Hall Operational</p>
        <p class="mb-4">Invest money into the Town Hall for general town improvements. These funds are used for long-term projects and may offer a small, steady return.</p>
        <div class="flex items-center space-x-2">
            <input type="number" id="town-hall-money" placeholder="Amount to Invest" class="p-2 border rounded-lg w-full">
            <button class="action-btn bg-indigo-500 hover:bg-indigo-600 text-white p-2 rounded-lg" onclick="investTownHall()">Invest</button>
        </div>
    `;
    
    // Research Section
    for (const key in TOWN_HALL_RESEARCH) {
        const [description, cost, prereq] = TOWN_HALL_RESEARCH[key];
        const isCompleted = gameData.researchCompleted.includes(key);
        const prereqMet = !prereq || gameData.researchCompleted.includes(prereq);
        
        const li = document.createElement('li');
        li.className = 'p-2 border-b flex justify-between items-center';
        
        if (isCompleted) {
            li.innerHTML = `
                <span>${description}</span>
                <span class="text-green-600 font-bold">Completed ✅</span>
            `;
        } else if (!prereqMet) {
            li.innerHTML = `
                <span>${description} (${cost} coins)</span>
                <span class="text-red-500 text-sm">Requires: ${TOWN_HALL_RESEARCH[prereq][0]}</span>
            `;
        } else {
            li.innerHTML = `
                <span>${description} (${cost} coins)</span>
                <button class="action-btn text-xs bg-teal-500 hover:bg-teal-600 text-white p-1 rounded-lg" onclick="startResearch('${key}', ${cost})">Research</button>
            `;
        }
        researchList.appendChild(li);
    }
}

/**
 * Handles the purchase of the Town Hall.
 */
function buyTownHall() {
    const cost = 5000;
    if (gameData.money >= cost) {
        gameData.money -= cost;
        gameData.townHallOwned = true;
        statusMessage.textContent = `Town Hall land purchased! You can now start research and investments.`;
        updateUI();
    } else {
        statusMessage.textContent = `Not enough money to buy the Town Hall land (Requires ${cost} coins).`;
    }
}

/**
 * Handles investing money into the Town Hall.
 */
function investTownHall() {
    const input = document.getElementById('town-hall-money');
    const amount = parseInt(input.value, 10);
    if (isNaN(amount) || amount <= 0) {
        statusMessage.textContent = "Please enter a valid positive amount for Town Hall investment.";
        return;
    }
    if (gameData.money < amount) {
        statusMessage.textContent = "You don't have enough money!";
        return;
    }

    gameData.money -= amount;
    // This is purely for flavor and future expansion; it doesn't currently affect gameData.investmentTotal
    statusMessage.textContent = `${amount} coins invested into Town Hall improvements. Thank you!`;
    
    input.value = '';
    updateUI();
}

/**
 * Handles starting a research project.
 * @param {string} researchKey - Key of the research to start.
 * @param {number} cost - Cost of the research.
 */
function startResearch(researchKey, cost) {
    if (gameData.money >= cost) {
        const [, , prereq] = TOWN_HALL_RESEARCH[researchKey];
        const prereqMet = !prereq || gameData.researchCompleted.includes(prereq);
        
        if (!prereqMet) {
            statusMessage.textContent = `Cannot start research: Prerequisite not met.`;
            return;
        }

        gameData.money -= cost;
        gameData.researchCompleted.push(researchKey);
        statusMessage.textContent = `${TOWN_HALL_RESEARCH[researchKey][0]} research completed!`;
        updateUI();
    } else {
        statusMessage.textContent = `Not enough money to start research (Requires ${cost} coins).`;
    }
}

// --- Mii Interaction Logic: Jobs ---

/**
 * Shows the job assignment modal for a selected Mii.
 * @param {number} index - Index of the Mii in miiList.
 */
function showJobAssignmentModal(index) {
    currentMiiIndex = index;
    const mii = miiList[index];
    
    jobMiiName.textContent = mii.name;
    jobAssignmentSelect.innerHTML = ''; // Clear previous options
    
    for (const key in JOBS) {
        const job = JOBS[key];
        const option = document.createElement('option');
        option.value = key;
        option.textContent = `${job.name} (Req. Skill: ${job.requiredSkill})`;
        if (mii.job === key) {
            option.selected = true;
        }
        if (mii.skill < job.requiredSkill) {
            option.disabled = true;
            option.textContent += ' - Skill Too Low';
        }
        jobAssignmentSelect.appendChild(option);
    }
    
    jobAssignmentModal.classList.remove('hidden');
}

/**
 * Assigns the selected job to the Mii.
 */
function assignJob() {
    const mii = miiList[currentMiiIndex];
    const newJobKey = jobAssignmentSelect.value;
    const job = JOBS[newJobKey];

    if (mii.skill < job.requiredSkill) {
        statusMessage.textContent = `${mii.name}'s skill is too low for ${job.name}.`;
        return;
    }

    mii.job = newJobKey;
    statusMessage.textContent = `${mii.name} is now a ${job.name}.`;
    
    jobAssignmentModal.classList.add('hidden');
    updateUI();
}

/**
 * Allows a Mii to perform their job immediately (manual mode action).
 * @param {number} index - Index of the Mii in miiList.
 */
function manualWork(index) {
    const mii = miiList[index];
    if (mii.energy < 20) {
        statusMessage.textContent = `${mii.name} is too tired to work! Energy is too low.`;
        return;
    }

    if (mii.job === 'none') {
        statusMessage.textContent = `${mii.name} needs a job before they can work.`;
        return;
    }

    const pay = calculatePay(mii);
    gameData.money += pay;
    mii.energy = Math.max(0, mii.energy - 15); // Higher energy cost for manual work
    mii.skill = Math.min(MAX_SKILL, mii.skill + SKILL_GAIN_RATE * 2); // Higher skill gain for manual
    statusMessage.textContent = `${mii.name} manually worked and earned ${pay} coins! Skill significantly increased.`;
    
    updateUI();
}

// --- Mii Interaction Logic: Gifts ---

/**
 * Shows the gift modal for a selected Mii.
 * @param {number} index - Index of the Mii in miiList.
 */
function showGiftModal(index) {
    currentMiiIndex = index;
    const mii = miiList[index];
    
    giftMiiName.textContent = mii.name;
    giftSelect.innerHTML = '';
    
    let hasItems = false;
    for (const key in gameData.inventory) {
        if (gameData.inventory[key] > 0) {
            hasItems = true;
            const item = INVENTORY_ITEMS[key];
            const option = document.createElement('option');
            option.value = key;
            option.textContent = `${item.name} (${gameData.inventory[key]} in stock)`;
            giftSelect.appendChild(option);
        }
    }
    
    if (!hasItems) {
        giftSelect.innerHTML = '<option value="" disabled selected>No items to gift</option>';
    }
    
    giftModal.classList.remove('hidden');
}

/**
 * Gives the selected gift to the Mii.
 */
function giveGift() {
    const mii = miiList[currentMiiIndex];
    const itemKey = giftSelect.value;
    
    if (!itemKey) {
        statusMessage.textContent = "Please select an item to give.";
        return;
    }

    if (gameData.inventory[itemKey] > 0) {
        const item = INVENTORY_ITEMS[itemKey];
        gameData.inventory[itemKey]--;
        
        // Apply effects
        if (item.happiness) {
            mii.happiness = Math.min(100, mii.happiness + item.happiness);
        }
        if (item.energy) {
            mii.energy = Math.min(100, mii.energy + item.energy);
        }
        if (item.skill) {
            mii.skill = Math.min(MAX_SKILL, mii.skill + item.skill);
        }
        if (item.love) {
            // Apply a small happiness bonus too for any love gift
            mii.happiness = Math.min(100, mii.happiness + 5); 
        }

        // Special handling for curing illness
        if (mii.isIll && itemKey === 'apple') {
            mii.isIll = false;
            statusMessage.textContent = `${mii.name} was cured by the Apple!`;
        }

        statusMessage.textContent = `${mii.name} used 1 ${item.name}. Status updated.`;
        
        giftModal.classList.add('hidden');
        updateUI();

    } else {
        statusMessage.textContent = `You do not have a ${INVENTORY_ITEMS[itemKey].name} to give.`;
    }
}

// --- Mii Interaction Logic: Relationships ---

/**
 * Shows the relationship modal for a selected Mii.
 * @param {number} index - Index of the Mii in miiList.
 */
function showRelationshipModal(index) {
    currentMiiIndex = index;
    const mii = miiList[index];
    
    miiNameRel.textContent = mii.name;
    relationshipList.innerHTML = '';
    
    // Only show potential partners who are adults, not the Mii itself
    const potentialPartners = miiList.filter(m => m.id !== mii.id && !m.isChild); 

    if (potentialPartners.length === 0) {
        relationshipList.innerHTML = '<p class="p-2 text-gray-500">No other Miis available for interaction.</p>';
    }

    potentialPartners.forEach(partner => {
        const isPartner = mii.relationship.partnerId === partner.id;
        const currentLoveScore = isPartner ? mii.relationship.loveScore : 0;
        
        const li = document.createElement('li');
        li.className = 'p-2 border-b flex justify-between items-center';
        li.innerHTML = `
            <span>${partner.name} (${partner.gender})</span>
            <div class="flex items-center space-x-2">
                ${isPartner 
                    ? `<span class="text-pink-600 font-bold mr-2">💖 Love: ${currentLoveScore}</span>`
                    : ''}
                <button class="action-btn text-xs bg-pink-500 hover:bg-pink-600 text-white p-1 rounded-lg" onclick="interactWithMii('${mii.id}', '${partner.id}', 'flirt')">Flirt</button>
                <button class="action-btn text-xs bg-green-500 hover:bg-green-600 text-white p-1 rounded-lg" onclick="interactWithMii('${mii.id}', '${partner.id}', 'gift_love')">Gift (Love)</button>
                ${isPartner && currentLoveScore >= 80 
                    ? `<button class="action-btn text-xs bg-red-600 hover:bg-red-700 text-white p-1 rounded-lg" onclick="attemptProposal('${mii.id}', '${partner.id}')">Propose</button>`
                    : ''}
            </div>
        `;
        relationshipList.appendChild(li);
    });
    
    // Add Party button
    const partyLi = document.createElement('li');
    partyLi.className = 'p-2 border-t mt-2 flex justify-between items-center bg-yellow-100 rounded-lg';
    partyLi.innerHTML = `
        <span>Throw a Town Party (${PARTY_COST} coins)</span>
        <button class="action-btn text-xs bg-yellow-500 hover:bg-yellow-600 text-white p-1 rounded-lg" onclick="throwParty()">Throw Party</button>
    `;
    relationshipList.appendChild(partyLi);

    relationshipModal.classList.remove('hidden');
}

/**
 * Handles social interaction between two Miis.
 * @param {string} miiId1 - ID of the acting Mii.
 * @param {string} miiId2 - ID of the target Mii.
 * @param {string} interactionType - 'flirt' or 'gift_love'.
 */
function interactWithMii(miiId1, miiId2, interactionType) {
    const mii1 = miiList.find(m => m.id === miiId1);
    const mii2 = miiList.find(m => m.id === miiId2);
    
    if (mii1.energy < 10) {
        statusMessage.textContent = `${mii1.name} is too tired to socialize.`;
        return;
    }
    
    mii1.energy = Math.max(0, mii1.energy - 10);
    let loveGain = 0;
    
    // Check if they are already in a relationship
    let isCouple = mii1.relationship.partnerId === mii2.id;
    
    if (interactionType === 'flirt') {
        const success = Math.random() > 0.4; // 60% chance of success
        if (success) {
            loveGain = isCouple ? 5 : 10; // Higher gain if not yet a couple
            statusMessage.textContent = `${mii1.name} successfully flirted with ${mii2.name}.`;
        } else {
            loveGain = isCouple ? -2 : -5;
            statusMessage.textContent = `${mii1.name}'s flirt attempt failed. Awkward.`;
        }
    } else if (interactionType === 'gift_love') {
        if (gameData.inventory.flower > 0) {
            gameData.inventory.flower--;
            loveGain = isCouple ? 15 : 20;
            statusMessage.textContent = `${mii1.name} gave ${mii2.name} a Flower. Romantic!`;
        } else {
            statusMessage.textContent = `${mii1.name} needs a Flower to give!`;
            mii1.energy = Math.min(100, mii1.energy + 10); // Refund energy
            updateUI();
            return;
        }
    }
    
    // Social Science research increases relationship gains
    if (gameData.researchCompleted.includes('social_science')) {
        loveGain = Math.floor(loveGain * 1.5);
    }
    
    if (isCouple) {
        mii1.relationship.loveScore = Math.min(100, mii1.relationship.loveScore + loveGain);
        mii2.relationship.loveScore = mii1.relationship.loveScore; // Keep scores symmetrical
        
        if (mii1.relationship.loveScore >= 100) {
            statusMessage.textContent = `${mii1.name} and ${mii2.name} are madly in love! Time to propose?`;
        }
    } else if (loveGain > 0) {
        // Attempt to start a relationship if loveScore reaches 50
        const currentLoveScoreMii1 = mii1.requests.find(r => r.type === 'love_score' && r.targetId === mii2.id)?.value || 0;
        const newLoveScoreMii1 = Math.min(100, currentLoveScoreMii1 + loveGain);
        
        // Use requests array to track unrequited or developing pre-relationship feelings
        let reqIndex = mii1.requests.findIndex(r => r.type === 'love_score' && r.targetId === mii2.id);
        if (reqIndex !== -1) {
            mii1.requests[reqIndex].value = newLoveScoreMii1;
        } else {
            mii1.requests.push({ type: 'love_score', targetId: mii2.id, value: newLoveScoreMii1 });
        }
        
        if (newLoveScoreMii1 >= 50) {
            establishRelationship(mii1, mii2, newLoveScoreMii1);
            statusMessage.textContent = `${mii1.name} and ${mii2.name} started dating!`;
        } else {
            statusMessage.textContent += ` (${mii2.name} likes ${mii1.name} more now: ${newLoveScoreMii1})`;
        }
    }
    
    updateUI();
    showRelationshipModal(currentMiiIndex); // Re-render the modal to show updated score
}

/**
 * Throws a town-wide party, boosting all Mii happiness.
 */
function throwParty() {
    if (gameData.money < PARTY_COST) {
        statusMessage.textContent = `Need ${PARTY_COST} coins to throw a party!`;
        return;
    }

    gameData.money -= PARTY_COST;
    miiList.forEach(mii => {
        mii.happiness = Math.min(100, mii.happiness + PARTY_HAPPINESS_BONUS);
    });
    
    statusMessage.textContent = `A massive party was thrown! Everyone's happiness increased by ${PARTY_HAPPINESS_BONUS}!`;
    relationshipModal.classList.add('hidden');
    updateUI();
}

/**
 * Formalizes a dating/committed relationship between two Miis.
 * @param {object} mii1 
 * @param {object} mii2 
 * @param {number} initialLoveScore 
 */
function establishRelationship(mii1, mii2, initialLoveScore) {
    // Set up relationship for Mii 1
    mii1.relationship.partnerId = mii2.id;
    mii1.relationship.loveScore = initialLoveScore;
    
    // Set up relationship for Mii 2 (symmetrical)
    mii2.relationship.partnerId = mii1.id;
    mii2.relationship.loveScore = initialLoveScore;
    
    // Remove temporary love_score requests
    mii1.requests = mii1.requests.filter(r => !(r.type === 'love_score' && r.targetId === mii2.id));
    mii2.requests = mii2.requests.filter(r => !(r.type === 'love_score' && r.targetId === mii1.id));
}

/**
 * Handles a marriage proposal attempt.
 * @param {string} miiId1 - ID of the proposing Mii.
 * @param {string} miiId2 - ID of the target Mii.
 */
function attemptProposal(miiId1, miiId2) {
    const mii1 = miiList.find(m => m.id === miiId1);
    const mii2 = miiList.find(m => m.id === miiId2);

    if (mii1.relationship.loveScore < 80) {
        statusMessage.textContent = `The love score is too low (${mii1.relationship.loveScore}). They need to be closer to propose!`;
        return;
    }

    // High success chance if love score is high
    const successChance = mii1.relationship.loveScore / 100;
    const success = Math.random() < successChance;

    if (success) {
        // Marriage! Future expansion: baby creation, shared house, etc.
        mii1.job = 'none'; // Unemployed to focus on family
        mii2.job = 'none';
        mii1.happiness = 100;
        mii2.happiness = 100;
        
        statusMessage.textContent = `🎉 CONGRATULATIONS! ${mii1.name} and ${mii2.name} are married!`;
        // In a more complex game, you would change partnerId to marriageId/houseId, but here we just leave partnerId.
    } else {
        // Failed proposal
        mii1.happiness = Math.max(0, mii1.happiness - 20);
        mii2.relationship.loveScore = Math.max(0, mii2.relationship.loveScore - 15);
        statusMessage.textContent = `💔 ${mii2.name} rejected ${mii1.name}'s proposal! This has severely impacted their relationship and happiness.`;
    }

    relationshipModal.classList.add('hidden');
    updateUI();
}

// --- Goal & Achievement Logic (Basic) ---

/**
 * Checks if any goals have been achieved and adds new ones.
 */
function checkGoals() {
    // Goal 1: First Mii
    if (miiList.length >= 1 && !gameData.currentGoals.find(g => g.id === 'first_mii')) {
        gameData.currentGoals.push({ id: 'first_mii', description: 'Created your first Mii.' });
        gameData.money += 25; // Reward
    }

    // Goal 2: First 1000 coins
    if (gameData.money >= 1000 && !gameData.currentGoals.find(g => g.id === 'first_k')) {
        gameData.currentGoals.push({ id: 'first_k', description: 'Reached 1000 coins.' });
        gameData.money += 100;
    }

    // Goal 3: First job assigned
    if (miiList.some(mii => mii.job !== 'none') && !gameData.currentGoals.find(g => g.id === 'first_job')) {
        gameData.currentGoals.push({ id: 'first_job', description: 'Assigned your first job.' });
        gameData.money += 50;
    }
}

// --- Event Listeners and Setup ---

/**
 * Sets up all necessary DOM event listeners.
 */
function setupEventListeners() {
    // Creation Screen Listener
    createMiiBtn.addEventListener('click', () => {
        const name = newMiiNameInput.value.trim();
        const personality = newMiiPersonalitySelect.value;
        const gender = newMiiGenderSelect.value;
        
        if (name && personality && gender) {
            createMii(name, personality, gender);
            newMiiNameInput.value = '';
            newMiiModal.classList.add('hidden');
        } else {
            alert("Please fill in all Mii details.");
        }
    });

    // Button Listeners to open modals
    document.getElementById('open-new-mii-modal').addEventListener('click', () => newMiiModal.classList.remove('hidden'));
    document.getElementById('open-store-modal').addEventListener('click', () => {
        updateStoreModalUI();
        storeModal.classList.remove('hidden');
    });
    document.getElementById('open-investment-modal').addEventListener('click', () => {
        updateInvestmentModalUI();
        investmentModal.classList.remove('hidden');
    });
    document.getElementById('open-bank-modal').addEventListener('click', () => {
        updateBankModalUI();
        bankModal.classList.remove('hidden');
    });
    document.getElementById('open-town-hall-modal').addEventListener('click', () => {
        updateTownHallModalUI();
        townHallModal.classList.remove('hidden');
    });
    document.getElementById('reset-game-btn').addEventListener('click', resetGame);
    
    // Modal Interaction Listeners
    document.getElementById('invest-btn').addEventListener('click', investMoney);
    document.getElementById('deposit-btn').addEventListener('click', depositSavings);
    document.getElementById('withdraw-btn').addEventListener('click', withdrawSavings);
    document.getElementById('assign-job-btn').addEventListener('click', assignJob);
    document.getElementById('give-gift-btn').addEventListener('click', giveGift);
    
    // Modal Closing Listeners (General)
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.add('hidden');
        });
    });

    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.classList.add('hidden');
        }
    });
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const modals = [storeModal, newMiiModal, investmentModal, relationshipModal, bankModal, townHallModal, jobAssignmentModal, giftModal];
            modals.forEach(modal => modal.classList.add('hidden'));
        }
    });
    
    // Auto-save every 30 seconds
    setInterval(saveGame, 30000);
}

// --- Application Entry Point ---
// This listener resolves the error by ensuring the initGame function is called 
// only after the entire script (including the function definition) has been parsed.
document.addEventListener('DOMContentLoaded', initGame);
