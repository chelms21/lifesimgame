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
const JOB_STATS = {
    'none': { income: 0, skillCap: 0, skillStat: 'none' },
    'cashier': { income: 5, skillCap: 20, skillStat: 'intellect' },
    'programmer': { income: 15, skillCap: 100, skillStat: 'intellect' },
    'chef': { income: 10, skillCap: 50, skillStat: 'creativity' },
    'artist': { income: 8, skillCap: 40, skillStat: 'creativity' },
    'construction': { income: 12, skillCap: 70, skillStat: 'strength' },
};


// --- Item Constants ---
const ITEMS = {
    'apple': { name: 'Apple 🍎', type: 'food', happiness: 5, hunger: 20, cost: 5, description: 'Basic food to fill hunger.' },
    'steak': { name: 'Steak 🥩', type: 'food', happiness: 20, hunger: 50, cost: 25, description: 'A hearty meal for maximum satisfaction.' },
    'medicine': { name: 'Medicine 💊', type: 'mood', happiness: 10, cost: 50, cureIllness: true, description: 'Cures illness and gives a small boost.' },
    'coffee': { name: 'Coffee ☕', type: 'mood', happiness: 5, cost: 10, description: 'Gives a small energy boost.' },
    'book': { name: 'Book 📚', type: 'skill', skillBoost: 5, cost: 40, description: 'Boosts intellect skill.' },
    'paint_set': { name: 'Paint Set 🎨', type: 'skill', skillBoost: 5, cost: 40, description: 'Boosts creativity skill.' },
    'weights': { name: 'Weights 🏋️', type: 'skill', skillBoost: 5, cost: 40, description: 'Boosts strength skill.' },
    'concert_ticket': { name: 'Concert Ticket 🎫', type: 'mood', happiness: 40, cost: 100, description: 'A huge happiness booster.' },
};

// --- Town Hall Research Constants ---
const RESEARCH_OPTIONS = {
    'bank_upgrade': {
        name: "Bank Upgrade (2% Interest)",
        cost: 200,
        prerequisite: null,
        description: "Increases bank savings interest to 2%.",
        effect: () => { gameData.savingsInterestRate = 0.02; }
    },
    'auto_work': {
        name: "Automatic Work Assignment",
        cost: 500,
        prerequisite: null,
        description: "Miis can autonomously decide to work to earn money.",
        effect: () => { /* Logic integrated into town loop */ }
    },
    'dating_app': {
        name: "Town Dating Service",
        cost: 1000,
        prerequisite: null,
        description: "Miis can autonomously search for romantic partners.",
        effect: () => { /* Logic integrated into town loop */ }
    }
};

// --- Mii Personality Constants ---
const PERSONALITY_TRAITS = {
    normal: { emoji: '😊', workEfficiency: 1.0, datingChance: 1.0, decayRate: 1.0 },
    stubborn: { emoji: '😠', workEfficiency: 1.2, datingChance: 0.8, decayRate: 1.2 }, // Harder to please, more efficient
    friendly: { emoji: '😀', workEfficiency: 0.8, datingChance: 1.5, decayRate: 0.8 }, // Easier to please, less efficient
};

// --- DOM Elements ---
const creationScreen = document.getElementById('creation-screen');
const gameScreen = document.getElementById('game-screen');
const residentCount = document.getElementById('resident-count');
const startTownButton = document.getElementById('start-town-button');

const moneyStat = document.getElementById('money-stat');
const miiSelect = document.getElementById('mii-select');
const miiName = document.getElementById('mii-name');
const miiMessage = document.getElementById('mii-message');
const saveMessage = document.getElementById('save-message');
const residentList = document.getElementById('resident-list');
const caretakerStatus = document.getElementById('caretaker-status');

const happinessBar = document.getElementById('happiness-bar');
const hungerBar = document.getElementById('hunger-bar');
const energyBar = document.getElementById('energy-bar');
const happinessStat = document.getElementById('happiness-stat');
const hungerStat = document.getElementById('hunger-stat');
const energyStat = document.getElementById('energy-stat');

const inventoryList = document.getElementById('inventory-list');
const miiRequestBox = document.getElementById('mii-request-box');
const requestedItemName = document.getElementById('requested-item-name');

const storeModal = document.getElementById('store-modal');
const townHallModal = document.getElementById('town-hall-modal');
const investmentModal = document.getElementById('investment-modal');
const bankModal = document.getElementById('bank-modal');
const relationshipModal = document.getElementById('relationship-modal');
const jobAssignmentModal = document.getElementById('job-assignment-modal');
const giftModal = document.getElementById('gift-modal');

const currentSeasonDisplay = document.getElementById('current-season');
const seasonTicksRemainingDisplay = document.getElementById('season-ticks-remaining');
const goalsList = document.getElementById('goals-list');


// --- Mii Class and Setup ---
class Mii {
    constructor(id, name, gender, personality) {
        this.id = id;
        this.name = name;
        this.gender = gender;
        this.personality = personality;
        this.age = 18;
        this.isChild = false;
        
        // Stats (0-100)
        this.happiness = 100;
        this.hunger = 100;
        this.energy = 100;

        // Skills (0-100)
        this.intellect = Math.floor(Math.random() * 20) + 10;
        this.creativity = Math.floor(Math.random() * 20) + 10;
        this.strength = Math.floor(Math.random() * 20) + 10;

        this.job = 'none';
        this.skill = 0; // The active skill level for the current job

        this.isSleeping = false;
        this.isDead = false;
        this.isIll = false;
        this.currentRequest = null; // Item key

        // Relationships
        this.relationship = {
            partnerId: null,
            loveScore: 0,
            friends: {} // { miiId: score (0-100) }
        };
    }
    
    get avatar() {
        if (this.isDead) return '💀';
        if (this.isSleeping) return '💤';
        if (this.isIll) return '🤒';
        if (this.hunger < 20) return '😩';
        if (this.happiness < 30) return '😔';
        return PERSONALITY_TRAITS[this.personality].emoji;
    }
    
    get skillStatName() {
        const jobStat = JOB_STATS[this.job].skillStat;
        if (jobStat === 'intellect') return 'Intellect';
        if (jobStat === 'creativity') return 'Creativity';
        if (jobStat === 'strength') return 'Strength';
        return 'N/A';
    }

    get skillStatValue() {
        const jobStat = JOB_STATS[this.job].skillStat;
        return this[jobStat];
    }

    // Helper to calculate income based on skill and job
    calculateIncome() {
        const baseIncome = JOB_STATS[this.job].income;
        const skillFactor = this.skillStatValue / 100;
        const efficiency = PERSONALITY_TRAITS[this.personality].workEfficiency;
        
        return Math.floor(baseIncome * skillFactor * efficiency);
    }
}

// --- Initialization ---

// Elements must be defined before calling init
const elements = {
    miiNameInput: document.getElementById('mii-name-input'),
    miiGenderSelect: document.getElementById('mii-gender-select'),
    miiPersonalitySelect: document.getElementById('mii-personality-select'),
    newMiiNameInput: document.getElementById('new-mii-name-input'),
    newMiiGenderSelect: document.getElementById('new-mii-gender-select'),
    newMiiPersonalitySelect: document.getElementById('new-mii-personality-select'),
};

document.addEventListener('DOMContentLoaded', init);

function init() {
    loadGame();
}

function startGame() {
    gameData.mode = document.getElementById('game-mode-select').value;
    gameData.difficulty = document.getElementById('game-difficulty-select').value;
    
    // Set initial money based on difficulty
    if (gameData.difficulty === 'easy') {
        gameData.money = 500;
        gameData.isCaretakerActive = true; 
    } else {
        gameData.money = 50;
        gameData.isCaretakerActive = false;
    }

    // Assign initial job to the first Mii
    if (miiList.length > 0) {
        miiList[0].job = 'cashier';
        miiList[0].skill = miiList[0].intellect;
    }
    
    creationScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    // Select the first Mii automatically
    if (miiList.length > 0) {
        currentMiiIndex = 0;
        renderGame();
    } else {
        renderGame(); // Still render to show empty stats
    }
    
    startTownLoop();
    saveGame();
}

function showCreationScreen() {
    creationScreen.classList.remove('hidden');
    gameScreen.classList.add('hidden');
    updateCreationScreen();
}

function updateCreationScreen() {
    residentCount.textContent = miiList.length;
    startTownButton.disabled = miiList.length === 0;
}

function addMiiToTown() {
    const name = elements.miiNameInput.value.trim();
    const gender = elements.miiGenderSelect.value;
    const personality = elements.miiPersonalitySelect.value;
    
    if (name.length < 2) {
        alert("Please enter a valid name.");
        return;
    }

    const newMii = new Mii(Date.now().toString() + Math.random().toFixed(2), name, gender, personality);
    miiList.push(newMii);
    elements.miiNameInput.value = '';
    updateCreationScreen();
}

function addNewMii() {
    const name = elements.newMiiNameInput.value.trim();
    const gender = elements.newMiiGenderSelect.value;
    const personality = elements.newMiiPersonalitySelect.value;
    
    if (name.length < 2) {
        alert("Please enter a valid name.");
        return;
    }

    const newMii = new Mii(Date.now().toString() + Math.random().toFixed(2), name, gender, personality);
    miiList.push(newMii);
    elements.newMiiNameInput.value = '';
    
    closeNewMiiModal();
    renderGame();
    saveGame();
}


// --- Main Game Loop ---

function startTownLoop() {
    if (gameLoop) {
        clearInterval(gameLoop);
    }
    gameLoop = setInterval(gameTick, UPDATE_INTERVAL);
}

function gameTick() {
    gameData.gameTickCount++;
    
    miiList.forEach(mii => {
        if (mii.isDead) return;

        // 1. Stat Decay
        const decayFactor = PERSONALITY_TRAITS[mii.personality].decayRate;
        if (!mii.isSleeping) {
            mii.hunger = Math.max(0, mii.hunger - DECAY_RATE * decayFactor);
            mii.energy = Math.max(0, mii.energy - ENERGY_DECAY_RATE * decayFactor);
        }
        mii.happiness = Math.max(0, mii.happiness - (DECAY_RATE * 0.5) * decayFactor);

        // 2. Health & Status Checks
        if (mii.hunger === 0 || mii.happiness === 0) {
            mii.isDead = true;
            miiMessage.textContent = `${mii.name} has passed away due to neglect. 😢`;
            if (currentMiiIndex > -1 && miiList[currentMiiIndex].id === mii.id) {
                currentMiiIndex = -1; // Deselect dead Mii
            }
            return;
        }
        
        // 3. Status Effects
        if (mii.hunger < 20 || mii.energy < 20) {
             if (Math.random() < 0.05) {
                mii.isIll = true; // Chance to get sick if stats are too low
             }
        } else if (mii.isIll && Math.random() < 0.02) {
            // Chance to recover naturally, but slow
            mii.isIll = false;
        }

        // 4. Job Income (Passive)
        if (mii.job !== 'none' && !mii.isSleeping && !mii.isIll) {
            const income = mii.calculateIncome();
            gameData.money += income;
        }
        
        // 5. Mii Request Check
        if (mii.currentRequest === null && Math.random() < REQUEST_CHANCE) {
            const potentialRequests = Object.keys(ITEMS).filter(key => ITEMS[key].type !== 'skill');
            mii.currentRequest = potentialRequests[Math.floor(Math.random() * potentialRequests.length)];
            if (currentMiiIndex > -1 && miiList[currentMiiIndex].id === mii.id) {
                renderCurrentMiiState(); // Update request box if this Mii is selected
            }
        }
        
        // 6. Automatic Actions (if mode is automatic or caretaker active)
        if (gameData.mode === 'automatic' || gameData.isCaretakerActive) {
            automaticMiiAction(mii);
        }

        // 7. Relationship Decay
        if (mii.relationship.partnerId && mii.relationship.loveScore > 0) {
            mii.relationship.loveScore = Math.max(0, mii.relationship.loveScore - 1);
        }
        for (const friendId in mii.relationship.friends) {
            mii.relationship.friends[friendId] = Math.max(0, mii.relationship.friends[friendId] - 1);
        }
    });

    // 8. Town Investment/Savings Interest
    if (gameData.savingsTotal > 0) {
        const interest = Math.floor(gameData.savingsTotal * (gameData.researchCompleted.includes('bank_upgrade') ? 0.02 : SAVINGS_INTEREST_RATE));
        gameData.savingsTotal += interest;
    }
    gameData.money += Math.floor(gameData.investmentTotal * 0.05);

    // 9. Season Check
    if (gameData.gameTickCount % 50 === 0) {
        advanceSeason();
        processGoals();
    }
    
    // 10. Render and Save
    renderGame();
    saveGame();
}

function automaticMiiAction(mii) {
    // Caretaker acts if Mii stats are low (only applies if caretaker is active)
    if (gameData.isCaretakerActive) {
        if (mii.hunger < CARETAKER_THRESHOLD && gameData.inventory[CARETAKER_FOOD] > 0) {
            mii.hunger = Math.min(100, mii.hunger + ITEMS[CARETAKER_FOOD].hunger);
            gameData.inventory[CARETAKER_FOOD]--;
            miiMessage.textContent = `Caretaker fed ${mii.name} an ${ITEMS[CARETAKER_FOOD].name}.`;
            return;
        }
        if (mii.happiness < CARETAKER_THRESHOLD && gameData.inventory[CARETAKER_MOOD] > 0) {
            mii.happiness = Math.min(100, mii.happiness + ITEMS[CARETAKER_MOOD].happiness);
            gameData.inventory[CARETAKER_MOOD]--;
            miiMessage.textContent = `Caretaker cheered up ${mii.name} with a ${ITEMS[CARETAKER_MOOD].name}.`;
            return;
        }
    }
    
    // Automatic Mode Logic
    if (gameData.mode === 'automatic' && !mii.isSleeping && !mii.isIll) {
        // Work
        if (mii.energy > 30 && mii.job !== 'none' && Math.random() < AUTOMATIC_WORK_CHANCE) {
            work(miiList.indexOf(mii));
            return;
        }
        
        // Sleep
        if (mii.energy < 40 && !mii.isSleeping) {
            mii.isSleeping = true;
            miiMessage.textContent = `${mii.name} went to sleep to recover energy.`;
            return;
        }
        
        // Dating (if research is complete)
        if (gameData.researchCompleted.includes('dating_app') && mii.relationship.partnerId === null && Math.random() < AUTOMATIC_DATING_CHANCE) {
            findPartner(mii.id);
        }
    }
}

function advanceSeason() {
    const seasons = ['spring', 'summer', 'autumn', 'winter'];
    const currentIndex = seasons.indexOf(gameData.currentSeason);
    const nextIndex = (currentIndex + 1) % seasons.length;
    gameData.currentSeason = seasons[nextIndex];
    generateGoals(); // New goals every season
}

function generateGoals() {
    gameData.currentGoals = [];
    const availableGoals = [
        { type: 'money', target: 500, description: 'Earn 500 Town Money.' },
        { type: 'residents', target: 5, description: 'Have 5 or more town residents.' },
        { type: 'skill', target: 50, stat: 'intellect', description: 'Raise one Mii\'s Intellect skill to 50.' },
        { type: 'research', target: 1, description: 'Complete 1 Town Hall Research.' },
    ];

    // Pick 2 random, unique goals
    const goalsToPick = [];
    while (goalsToPick.length < 2 && availableGoals.length > 0) {
        const index = Math.floor(Math.random() * availableGoals.length);
        goalsToPick.push(availableGoals.splice(index, 1)[0]);
    }
    
    gameData.currentGoals = goalsToPick.map(g => ({ ...g, completed: false }));
}

function processGoals() {
    gameData.currentGoals.forEach(goal => {
        if (goal.completed) return;

        let isCompleted = false;
        switch(goal.type) {
            case 'money':
                if (gameData.money >= goal.target) isCompleted = true;
                break;
            case 'residents':
                if (miiList.filter(m => !m.isDead).length >= goal.target) isCompleted = true;
                break;
            case 'skill':
                if (miiList.some(m => !m.isDead && m[goal.stat] >= goal.target)) isCompleted = true;
                break;
            case 'research':
                if (gameData.researchCompleted.length >= goal.target) isCompleted = true;
                break;
        }

        if (isCompleted) {
            goal.completed = true;
            gameData.money += 100; // Reward for goal completion
        }
    });
}


// --- Actions ---

function work(index = currentMiiIndex) {
    const mii = miiList[index];
    if (!mii || mii.isDead) return;

    if (mii.isSleeping) {
        miiMessage.textContent = `${mii.name} is sleeping! Wake them up first.`;
        return;
    }
    
    if (mii.energy < 15) {
        miiMessage.textContent = `${mii.name} is too tired to work! They need to rest or drink coffee.`;
        return;
    }

    if (mii.job === 'none') {
        miiMessage.textContent = `${mii.name} needs a job assigned at the Town Hall first!`;
        return;
    }

    const income = mii.calculateIncome();
    const energyCost = 15;
    
    mii.energy = Math.max(0, mii.energy - energyCost);
    gameData.money += income;
    
    // Skill gains are tied to job/skill type
    const skillName = JOB_STATS[mii.job].skillStat;
    const skillCap = JOB_STATS[mii.job].skillCap;

    if (mii[skillName] < skillCap) {
        mii[skillName] = Math.min(skillCap, mii[skillName] + 1);
        miiMessage.textContent = `${mii.name} earned 💰${income} and gained skill! (${mii.skillStatName}: ${mii[skillName]})`;
    } else {
        miiMessage.textContent = `${mii.name} earned 💰${income}. (Skill Maxed for this job)`;
    }

    renderCurrentMiiState();
    saveGame();
}

function sleep(index = currentMiiIndex) {
    const mii = miiList[index];
    if (!mii || mii.isDead) return;

    if (mii.isSleeping) {
        // Wake up
        mii.isSleeping = false;
        mii.energy = Math.min(100, mii.energy + 30); // Wake up rested
        miiMessage.textContent = `${mii.name} woke up feeling refreshed! (+30 Energy)`;
    } else {
        // Go to sleep
        mii.isSleeping = true;
        miiMessage.textContent = `${mii.name} went to sleep. 😴`;
    }
    renderCurrentMiiState();
    saveGame();
}

function throwParty() {
    if (gameData.activeEvent !== null) {
        miiMessage.textContent = "An event is already active in town!";
        return;
    }

    if (gameData.money < PARTY_COST) {
        miiMessage.textContent = `You need 💰${PARTY_COST} to throw a party!`;
        return;
    }

    gameData.money -= PARTY_COST;
    gameData.activeEvent = {
        name: "Town Festival",
        duration: 5, // 5 ticks
        effect: (mii) => {
            mii.happiness = Math.min(100, mii.happiness + PARTY_HAPPINESS_BONUS);
            mii.energy = Math.min(100, mii.energy + 10);
            mii.isSleeping = false; // Party wakes Miis up
        }
    };
    
    // Apply initial effect
    miiList.forEach(mii => {
        if (!mii.isDead) gameData.activeEvent.effect(mii);
    });

    miiMessage.textContent = `🥳 The Town Festival has begun! Everyone's happiness is boosted!`;
    renderGame();
    saveGame();
}

// --- Item Usage (Fixed logic and added debugging) ---
function useItem(key) {
    console.log(`[DEBUG] Attempting to use item: ${key}`); // Requested Debug Log
    
    const mii = miiList[currentMiiIndex];
    
    // FIX: Check currentMiiIndex explicitly, which is -1 if no Mii is selected
    if (currentMiiIndex === -1 || !mii) { 
        miiMessage.textContent = "⚠️ Please select a resident to use an item on.";
        console.error("[DEBUG] useItem failed: No Mii selected (currentMiiIndex is -1 or Mii undefined).");
        return;
    }
    if (mii.isDead) {
        miiMessage.textContent = `${mii.name} is deceased and cannot use items.`;
        return;
    }
    if (mii.isSleeping) {
        miiMessage.textContent = `${mii.name} is sleeping 😴 and cannot use items.`;
        return;
    }

    const item = ITEMS[key];
    
    if (gameData.inventory[key] > 0) {
        console.log(`[DEBUG] Inventory count: ${gameData.inventory[key]}. Proceeding with usage.`);
        
        gameData.inventory[key] -= 1; 

        let isFulfillingRequest = mii.currentRequest === key;
        let happinessBoost = item.happiness || 0;
        
        if (item.cureIllness && mii.isIll) {
            mii.isIll = false;
            miiMessage.textContent = `${mii.name} feels much better after taking the Medicine!`;
            happinessBoost += 20; 
        }

        if (isFulfillingRequest) {
            happinessBoost += 30; 
            miiMessage.textContent = `🎉 ${mii.name} got exactly what they wanted! Huge happiness boost!`;
            mii.currentRequest = null;
        }

        if (item.type === 'food') {
            mii.hunger = Math.min(100, mii.hunger + (item.hunger || 0));
        }
        
        if (key === 'coffee') {
            // Apply energy boost
            mii.energy = Math.min(100, mii.energy + 20); 
        }
        
        if (item.type === 'skill') {
            const skillName = (key === 'book') ? 'intellect' : (key === 'paint_set' ? 'creativity' : 'strength');
            mii[skillName] = Math.min(100, mii[skillName] + (item.skillBoost || 5));
            miiMessage.textContent = `${mii.name} studied the ${item.name} and gained ${skillName} skill!`;
        }

        if (mii.personality === 'stubborn' && item.type === 'mood' && !isFulfillingRequest) {
            happinessBoost *= 0.5; // Stubborn Miis dislike generic mood items
        }

        mii.happiness = Math.min(100, mii.happiness + happinessBoost);
        
        if (!isFulfillingRequest && !item.cureIllness && item.type !== 'skill') {
            miiMessage.textContent = `${mii.name} used the ${item.name}.`;
        }
        
        renderCurrentMiiState();
        renderInventory();
        saveGame();
    } else {
        miiMessage.textContent = `The town inventory doesn't have any ${item.name}!`;
        console.warn(`[DEBUG] Inventory empty for item: ${key}`);
    }
}


// --- Money & Investment ---

function buyItem(key) {
    const item = ITEMS[key];
    if (gameData.money >= item.cost) {
        gameData.money -= item.cost;
        gameData.inventory[key] = (gameData.inventory[key] || 0) + 1;
        document.getElementById('store-money').textContent = gameData.money;
        renderInventory();
        renderGame();
        saveGame();
        miiMessage.textContent = `Purchased ${item.name} for 💰${item.cost}.`;
    } else {
        alert("Not enough money!");
    }
}

function makeInvestment() {
    const amountInput = document.getElementById('investment-amount');
    const amount = parseInt(amountInput.value);

    if (isNaN(amount) || amount < 10) {
        alert("Investment must be at least 10.");
        return;
    }
    if (gameData.money < amount) {
        alert("Not enough town money for this investment.");
        return;
    }

    gameData.money -= amount;
    gameData.investmentTotal += amount;
    
    amountInput.value = 10;
    renderGame();
    saveGame();
    alert(`Successfully invested 💰${amount}. Passive income rate increased.`);
    closeInvestmentModal(); // Added closing call
}

function depositSavings() {
    const amountInput = document.getElementById('savings-deposit-amount');
    const amount = parseInt(amountInput.value);

    if (isNaN(amount) || amount < 10) {
        alert("Deposit must be at least 10.");
        return;
    }
    if (gameData.money < amount) {
        alert("Not enough money to deposit.");
        return;
    }

    gameData.money -= amount;
    gameData.savingsTotal += amount;
    
    amountInput.value = 10;
    renderGame();
    saveGame();
    alert(`Deposited 💰${amount}. Current Savings: 💰${gameData.savingsTotal}.`);
    closeBankModal(); // Added closing call
}

function withdrawSavings() {
    const amountInput = document.getElementById('savings-withdraw-amount');
    const amount = parseInt(amountInput.value);

    if (isNaN(amount) || amount < 10) {
        alert("Withdrawal must be at least 10.");
        return;
    }
    if (gameData.savingsTotal < amount) {
        alert("Not enough money in savings.");
        return;
    }

    gameData.savingsTotal -= amount;
    gameData.money += amount;
    
    amountInput.value = 10;
    renderGame();
    saveGame();
    alert(`Withdrew 💰${amount}. Current Savings: 💰${gameData.savingsTotal}.`);
    closeBankModal(); // Added closing call
}

// --- Relationship Functions ---

function openRelationshipModal() {
    const mii = miiList[currentMiiIndex];
    if (!mii) return;

    document.getElementById('rel-mii-name').textContent = mii.name + "'s Relationships";
    document.getElementById('rel-status').textContent = mii.relationship.partnerId ? 'In a relationship' : 'Single';
    
    const relActions = document.getElementById('rel-actions');
    const friendsList = document.getElementById('rel-friends-ul');
    relActions.innerHTML = '';
    friendsList.innerHTML = '';

    // Add friend buttons (for Miis who are not the current Mii and not the partner)
    miiList.filter(otherMii => otherMii.id !== mii.id && otherMii.id !== mii.relationship.partnerId && !otherMii.isDead).forEach(friend => {
        const score = mii.relationship.friends[friend.id] || 0;
        const button = document.createElement('button');
        button.textContent = `Befriend ${friend.name} (${score}%)`;
        button.onclick = () => attemptFriendship(mii.id, friend.id);
        relActions.appendChild(button);
    });

    // Add partner actions
    if (mii.relationship.partnerId) {
        const partner = miiList.find(m => m.id === mii.relationship.partnerId);
        if (partner) {
            const partnerName = partner.name;
            const score = mii.relationship.loveScore;

            document.getElementById('rel-status').innerHTML = `Partnered with ${partnerName} (Love Score: ${score}%)`;
            
            const breakUpBtn = document.createElement('button');
            breakUpBtn.textContent = `Break Up with ${partnerName}`;
            breakUpBtn.style.backgroundColor = 'red';
            breakUpBtn.onclick = () => breakUp(mii.id, partner.id);
            relActions.appendChild(breakUpBtn);
        }
    } else {
        // Attempt to find partner
        const findPartnerBtn = document.createElement('button');
        findPartnerBtn.textContent = 'Look for a Partner';
        findPartnerBtn.style.backgroundColor = '#ff69b4';
        findPartnerBtn.onclick = () => findPartner(mii.id);
        relActions.appendChild(findPartnerBtn);
    }
    
    relationshipModal.classList.remove('hidden');
}

function findPartner(miiId) {
    const mii = miiList.find(m => m.id === miiId);
    if (!mii || mii.relationship.partnerId) return;

    // Filter potential partners (different gender, not dead, single, not child)
    const potentialPartners = miiList.filter(
        otherMii => otherMii.id !== miiId && 
                    otherMii.gender !== mii.gender && 
                    otherMii.relationship.partnerId === null && 
                    !otherMii.isDead && 
                    !otherMii.isChild
    );

    if (potentialPartners.length === 0) {
        miiMessage.textContent = `${mii.name} couldn't find any potential partners right now.`;
        closeRelationshipModal();
        return;
    }

    const partner = potentialPartners[Math.floor(Math.random() * potentialPartners.length)];
    
    mii.relationship.partnerId = partner.id;
    partner.relationship.partnerId = mii.id;
    mii.relationship.loveScore = 10;
    partner.relationship.loveScore = 10;
    
    mii.happiness = Math.min(100, mii.happiness + 20);
    partner.happiness = Math.min(100, partner.happiness + 20);

    miiMessage.textContent = `💖 ${mii.name} is now dating ${partner.name}!`;
    renderGame();
    closeRelationshipModal();
}

function breakUp(miiId, partnerId) {
    const mii = miiList.find(m => m.id === miiId);
    const partner = miiList.find(m => m.id === partnerId);

    if (mii) {
        mii.relationship.partnerId = null;
        mii.relationship.loveScore = 0;
        mii.happiness = Math.max(0, mii.happiness - 30); // Big sadness hit
    }
    if (partner) {
        partner.relationship.partnerId = null;
        partner.relationship.loveScore = 0;
        partner.happiness = Math.max(0, partner.happiness - 30);
    }
    
    miiMessage.textContent = `💔 ${mii.name} and ${partner.name} have broken up. That's a huge bummer.`;
    renderGame();
    closeRelationshipModal();
}

function attemptFriendship(miiId, friendId) {
    const mii = miiList.find(m => m.id === miiId);
    const friend = miiList.find(m => m.id === friendId);

    if (!mii || !friend) return;

    // Check if Mii is friendly
    const successChance = (mii.personality === 'friendly') ? 0.7 : 0.4;
    
    if (Math.random() < successChance) {
        const boost = 10 + Math.floor(Math.random() * 20);
        mii.relationship.friends[friendId] = Math.min(100, (mii.relationship.friends[friendId] || 0) + boost);
        friend.relationship.friends[miiId] = Math.min(100, (friend.relationship.friends[miiId] || 0) + boost);
        miiMessage.textContent = `🤝 ${mii.name} is now better friends with ${friend.name}!`;
    } else {
        miiMessage.textContent = `😞 ${mii.name}'s attempt to bond with ${friend.name} failed.`;
    }

    renderGame();
    closeRelationshipModal();
}

function openGiftModal(targetId, targetName) {
    document.getElementById('gift-target-name').textContent = targetName;
    const giftList = document.getElementById('gift-inventory-list');
    giftList.innerHTML = '';

    let isEmpty = true;
    for (const key in gameData.inventory) {
        const count = gameData.inventory[key];
        const item = ITEMS[key];
        if (count > 0 && item.type !== 'skill') { // Don't allow gifting skill items
            isEmpty = false;
            const listItem = document.createElement('div');
            listItem.className = 'item-slot';
            listItem.innerHTML = `
                ${item.name} x${count} <br>
                <button onclick="giftItem('${key}', '${targetId}')">Give</button>
            `;
            giftList.appendChild(listItem);
        }
    }

    if (isEmpty) {
        giftList.innerHTML = '<p>Town inventory is empty of giftable items.</p>';
    }

    giftModal.classList.remove('hidden');
}

function giftItem(key, targetId) {
    const giver = miiList[currentMiiIndex];
    const receiver = miiList.find(m => m.id === targetId);

    if (!giver || !receiver || giver.isDead || receiver.isDead) return;
    if (gameData.inventory[key] < 1) return;

    gameData.inventory[key]--;
    const item = ITEMS[key];

    // Gift Score logic
    let scoreBoost = Math.floor(item.cost / 5); // Cost determines base boost
    
    if (receiver.relationship.partnerId === giver.id) {
        // Partner relationship
        receiver.relationship.loveScore = Math.min(100, receiver.relationship.loveScore + scoreBoost);
        giver.relationship.loveScore = receiver.relationship.loveScore; // Sync scores
        miiMessage.textContent = `💕 ${giver.name} gifted ${item.name} to partner ${receiver.name}! Love score increased!`;
    } else if (receiver.relationship.friends[giver.id] !== undefined) {
        // Friend relationship
        receiver.relationship.friends[giver.id] = Math.min(100, receiver.relationship.friends[giver.id] + scoreBoost);
        giver.relationship.friends[receiver.id] = receiver.relationship.friends[giver.id]; // Sync scores
        miiMessage.textContent = `🎁 ${giver.name} gifted ${item.name} to friend ${receiver.name}. Friendship deepened!`;
    } else {
        // New/Acquaintance relationship
        // Automatically start friendship with a small score
        receiver.relationship.friends[giver.id] = scoreBoost;
        giver.relationship.friends[receiver.id] = scoreBoost;
        miiMessage.textContent = `💖 ${giver.name} gifted ${item.name} to ${receiver.name}. They are now acquaintances!`;
    }

    // Happiness boost for receiver
    receiver.happiness = Math.min(100, receiver.happiness + (item.happiness || 5));
    
    renderGame();
    giftModal.classList.add('hidden');
    saveGame();
}


// --- Rendering ---

function renderGame() {
    moneyStat.textContent = gameData.money.toLocaleString();
    renderCaretakerStatus();
    renderResidentList();
    renderCurrentMiiState();
    renderInventory();
    renderGoals();
    
    currentSeasonDisplay.textContent = gameData.currentSeason.toUpperCase();
    seasonTicksRemainingDisplay.textContent = 50 - (gameData.gameTickCount % 50);

    if (gameData.activeEvent) {
        document.getElementById('active-event-status').textContent = `${gameData.activeEvent.name} (${gameData.activeEvent.duration} ticks left)`;
        gameData.activeEvent.duration--;
        if (gameData.activeEvent.duration <= 0) {
            gameData.activeEvent = null;
            document.getElementById('active-event-status').textContent = 'None';
        }
    } else {
        document.getElementById('active-event-status').textContent = 'None';
    }
}

function renderCaretakerStatus() {
    caretakerStatus.textContent = gameData.isCaretakerActive ? 'ACTIVE (Automatic food/mood relief)' : 'INACTIVE';
    caretakerStatus.style.color = gameData.isCaretakerActive ? 'green' : 'red';
}

function renderResidentList() {
    residentList.innerHTML = '';
    miiList.forEach((mii, index) => {
        const card = document.createElement('div');
        card.className = 'resident-mini-card';
        if (index === currentMiiIndex) card.classList.add('selected');
        if (mii.happiness < 30) card.classList.add('sad');
        if (mii.hunger < 30) card.classList.add('hungry');
        if (mii.isSleeping) card.classList.add('asleep');
        if (mii.isIll) card.classList.add('ill');
        if (mii.isChild) card.classList.add('child');
        
        card.onclick = () => switchMii(index);

        let statusText = `${mii.isDead ? '💀 Deceased' : mii.job}`;
        let statusIcon = '';
        if (mii.isIll) statusIcon = '🤒';
        else if (mii.isSleeping) statusIcon = '💤';
        else if (mii.hunger < 20) statusIcon = '😩';
        else if (mii.happiness < 30) statusIcon = '😔';


        card.innerHTML = `
            <h5>${mii.name} ${mii.avatar}</h5>
            <p><span class="status-icon">${statusIcon}</span> ${statusText}</p>
        `;
        residentList.appendChild(card);
    });
}

function renderCurrentMiiState() {
    miiSelect.innerHTML = '';
    miiList.filter(m => !m.isDead).forEach((mii, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = mii.name;
        if (index === currentMiiIndex) {
            option.selected = true;
        }
        miiSelect.appendChild(option);
    });

    const mii = miiList[currentMiiIndex];
    if (!mii) {
        miiName.textContent = 'No Resident Selected';
        document.querySelector('.mii-avatar').textContent = '🤷';
        // Clear all stats
        miiName.textContent = '---';
        document.getElementById('gender-stat').textContent = '---';
        document.getElementById('personality-stat').textContent = '---';
        document.getElementById('relationship-stat').textContent = '---';
        miiRequestBox.classList.add('hidden');
        document.querySelector('.actions').innerHTML = '';
        
        happinessStat.textContent = '0';
        hungerStat.textContent = '0';
        energyStat.textContent = '0';
        happinessBar.style.width = '0%';
        hungerBar.style.width = '0%';
        energyBar.style.width = '0%';
        return;
    }

    miiName.textContent = mii.name;
    document.querySelector('.mii-avatar').textContent = mii.avatar;
    document.getElementById('gender-stat').textContent = `${mii.gender} / Age ${mii.age}`;
    document.getElementById('personality-stat').textContent = `${mii.personality} / ${mii.job} (${mii.skillStatName}: ${mii.skillStatValue})`;
    
    let relStatus = 'Single';
    if (mii.relationship.partnerId) {
        const partner = miiList.find(m => m.id === mii.relationship.partnerId);
        if (partner) {
            relStatus = `Partnered with ${partner.name} (${mii.relationship.loveScore}%)`;
        }
    }
    document.getElementById('relationship-stat').textContent = relStatus;

    // Stats
    happinessStat.textContent = mii.happiness.toFixed(0);
    hungerStat.textContent = mii.hunger.toFixed(0);
    energyStat.textContent = mii.energy.toFixed(0);

    happinessBar.style.width = mii.happiness + '%';
    hungerBar.style.width = mii.hunger + '%';
    energyBar.style.width = mii.energy + '%';
    
    happinessBar.classList.toggle('low', mii.happiness < 30);
    hungerBar.classList.toggle('low', mii.hunger < 30);
    energyBar.classList.toggle('low', mii.energy < 30);

    // Actions
    const actionsDiv = document.querySelector('.actions');
    actionsDiv.innerHTML = '';

    if (!mii.isDead) {
        actionsDiv.innerHTML = `
            <button id="work-button" onclick="work()" style="background-color: #007bff;" ${mii.isSleeping ? 'disabled' : ''}>Work 💼</button>
            <button id="sleep-button" onclick="sleep()" style="background-color: ${mii.isSleeping ? '#dc3545' : '#ff69b4'};">${mii.isSleeping ? 'Wake Up' : 'Sleep 🛌'}</button>
            <button id="rel-button" onclick="openRelationshipModal()" style="background-color: #f06292;">Relationships 🧑‍🤝‍🧑</button>
            <button id="job-button" onclick="openJobAssignmentModal()" style="background-color: #1abc9c;">Change Job 🛠️</button>
            <button id="gift-button" onclick="openGiftModal(miiList[currentMiiIndex].id, mii.name)" style="background-color: #9b59b6;">Receive Gift 🎁</button>
        `;
    } else {
        actionsDiv.textContent = `${mii.name} is deceased.`;
    }

    // Requests
    if (mii.currentRequest) {
        miiRequestBox.classList.remove('hidden');
        requestedItemName.textContent = ITEMS[mii.currentRequest].name;
    } else {
        miiRequestBox.classList.add('hidden');
    }
}

function renderInventory() {
    inventoryList.innerHTML = ''; 
    let isEmpty = true;

    for (const key in gameData.inventory) {
        const count = gameData.inventory[key];
        if (count > 0) {
            isEmpty = false;
            const item = ITEMS[key];
            const listItem = document.createElement('div');
            listItem.className = 'item-slot';
            listItem.innerHTML = `
                <p><strong>${item.name}</strong> x${count}</p>
                <p><small>${item.description}</small></p>
                <!-- This button calls the fixed useItem(key) function -->
                <button onclick="useItem('${key}')">Use</button>
            `; 
            inventoryList.appendChild(listItem);
        }
    }
    
    if (isEmpty) {
        inventoryList.innerHTML = '<p>Town inventory is currently empty.</p>';
    }
    
    // Update store modal inventory display
    if (document.getElementById('gift-inventory-list')) {
        // Rerender gift inventory if modal is open (or just make sure it's closed)
        if (!giftModal.classList.contains('hidden')) {
             // Only force render if open, otherwise let openGiftModal handle it
        }
    }
}

function renderStoreItems() {
    const storeItems = document.getElementById('store-items');
    storeItems.innerHTML = '';
    document.getElementById('store-money').textContent = gameData.money.toLocaleString();

    for (const key in ITEMS) {
        const item = ITEMS[key];
        const itemDiv = document.createElement('div');
        itemDiv.className = 'item-slot';
        itemDiv.style.width = '150px';
        itemDiv.innerHTML = `
            <h4>${item.name}</h4>
            <p>Cost: 💰${item.cost}</p>
            <p><small>${item.description}</small></p>
            <button onclick="buyItem('${key}')" style="background-color: #28a745;">Buy</button>
        `;
        storeItems.appendChild(itemDiv);
    }
}

function renderTownHall() {
    const townHallContent = document.getElementById('town-hall-content');
    townHallContent.innerHTML = '';

    // Caretaker Status/Purchase
    const caretakerDiv = document.createElement('div');
    if (gameData.isCaretakerActive) {
        caretakerDiv.innerHTML = `<p style="color: green; font-weight: bold;">Caretaker Service is ACTIVE!</p>`;
    } else {
        caretakerDiv.innerHTML = `
            <p>Caretaker Service (Costs 💰${CARETAKER_PURCHASE_PRICE}): Automatically uses ${ITEMS[CARETAKER_FOOD].name} and ${ITEMS[CARETAKER_MOOD].name} to prevent Mii stats from dropping too low (<${CARETAKER_THRESHOLD}%).</p>
            <button onclick="buyCaretakerService()" style="background-color: #007bff;">Purchase Service</button>
        `;
    }
    townHallContent.appendChild(caretakerDiv);
    townHallContent.appendChild(document.createElement('hr'));

    // Research Options
    const researchHeader = document.createElement('h3');
    researchHeader.textContent = 'Town Research & Upgrades';
    townHallContent.appendChild(researchHeader);

    for (const key in RESEARCH_OPTIONS) {
        const research = RESEARCH_OPTIONS[key];
        const researchDiv = document.createElement('div');
        researchDiv.style.border = '1px solid #ddd';
        researchDiv.style.padding = '10px';
        researchDiv.style.margin = '10px 0';
        researchDiv.style.borderRadius = '5px';

        if (gameData.researchCompleted.includes(key)) {
            researchDiv.innerHTML = `
                <p style="color: green; font-weight: bold;">✅ ${research.name} (Complete)</p>
                <p><small>${research.description}</small></p>
            `;
        } else {
            researchDiv.innerHTML = `
                <h4>${research.name}</h4>
                <p>Cost: 💰${research.cost}</p>
                <p><small>${research.description}</small></p>
                <button onclick="completeResearch('${key}')" style="background-color: #ff8c00;">Start Research</button>
            `;
        }
        townHallContent.appendChild(researchDiv);
    }
}

function renderGoals() {
    goalsList.innerHTML = '';
    gameData.currentGoals.forEach(goal => {
        const li = document.createElement('li');
        li.className = 'goal-item';
        if (goal.completed) li.classList.add('completed');
        
        li.textContent = `${goal.description} - ${goal.completed ? 'COMPLETED' : 'In Progress'}`;
        
        goalsList.appendChild(li);
    });
}

function renderJobAssignment() {
    const mii = miiList[currentMiiIndex];
    if (!mii) return;

    document.getElementById('job-mii-name').textContent = mii.name;
    document.getElementById('max-skill-display').textContent = `100`; // Max skill is 100

    const jobListOptions = document.getElementById('job-list-options');
    jobListOptions.innerHTML = '';

    for (const key in JOB_STATS) {
        const job = JOB_STATS[key];
        const jobDiv = document.createElement('div');
        jobDiv.style.border = mii.job === key ? '2px solid #007bff' : '1px solid #ccc';
        jobDiv.style.padding = '10px';
        jobDiv.style.margin = '10px 0';
        jobDiv.style.borderRadius = '5px';

        let skillDetail = '';
        if (key !== 'none') {
             const statName = job.skillStat;
             skillDetail = ` (Uses ${statName.toUpperCase()}: ${mii[statName]} / Max Income Skill: ${job.skillCap})`;
        }
        
        jobDiv.innerHTML = `
            <h4>${key.toUpperCase()}</h4>
            <p>Income per Tick: 💰${job.income} ${skillDetail}</p>
            ${mii.job === key ? '<p style="color: green; font-weight: bold;">Current Job</p>' : `<button onclick="assignJob('${key}')" style="background-color: #1abc9c;">Assign Job</button>`}
        `;
        jobListOptions.appendChild(jobDiv);
    }
}

// --- Town Hall Logic ---
function buyCaretakerService() {
    if (gameData.money < CARETAKER_PURCHASE_PRICE) {
        alert("Not enough money to purchase the Caretaker Service.");
        return;
    }
    gameData.money -= CARETAKER_PURCHASE_PRICE;
    gameData.isCaretakerActive = true;
    miiMessage.textContent = "Caretaker Service purchased! Miis will now be automatically maintained.";
    renderGame();
    renderTownHall();
    saveGame();
}

function completeResearch(key) {
    const research = RESEARCH_OPTIONS[key];
    if (gameData.money < research.cost) {
        alert(`You need 💰${research.cost} to complete this research.`);
        return;
    }

    gameData.money -= research.cost;
    gameData.researchCompleted.push(key);
    
    if (research.effect) {
        research.effect();
    }
    
    miiMessage.textContent = `Research completed: ${research.name}!`;
    renderGame();
    renderTownHall();
    saveGame();
}

function assignJob(jobKey) {
    const mii = miiList[currentMiiIndex];
    if (!mii) return;

    mii.job = jobKey;
    const jobData = JOB_STATS[jobKey];
    
    if (jobKey !== 'none') {
        const skillName = jobData.skillStat;
        mii.skill = mii[skillName];
        miiMessage.textContent = `${mii.name} is now a ${jobKey}! Their income is based on their ${mii.skillStatName} skill.`;
    } else {
        mii.skill = 0;
        miiMessage.textContent = `${mii.name} is now unemployed.`;
    }
    
    renderGame();
    closeJobAssignmentModal();
    saveGame();
}

// --- Event Handlers ---

function switchMii(index) {
    if (index === undefined) {
        currentMiiIndex = parseInt(miiSelect.value);
    } else {
        currentMiiIndex = index;
    }
    renderGame();
}

// --- Modal Openers ---
// FIX: These functions were missing or defined in a way that caused issues. 
// Ensuring they properly remove the 'hidden' class fixes the top buttons.

function openNewMiiCreation() {
    elements.newMiiNameInput.value = '';
    newMiiModal.classList.remove('hidden');
}

function openStore() {
    renderStoreItems();
    storeModal.classList.remove('hidden');
}

function openTownHall() {
    renderTownHall();
    townHallModal.classList.remove('hidden');
}

function openBankModal() {
    document.getElementById('bank-current-money').textContent = gameData.money.toLocaleString();
    document.getElementById('savings-total').textContent = gameData.savingsTotal.toLocaleString();
    bankModal.classList.remove('hidden');
}

function openInvestmentModal() {
    document.getElementById('investment-total').textContent = gameData.investmentTotal.toLocaleString();
    document.getElementById('investment-rate').textContent = Math.floor(gameData.investmentTotal * 0.05).toLocaleString();
    investmentModal.classList.remove('hidden');
}

function openJobAssignmentModal() {
    if (currentMiiIndex === -1) {
        miiMessage.textContent = "Please select a resident first.";
        return;
    }
    renderJobAssignment();
    jobAssignmentModal.classList.remove('hidden');
}


// --- Modal Closers (CRITICAL FIX: These were missing or not correctly defined) ---

function closeNewMiiModal() {
    newMiiModal.classList.add('hidden');
}

function closeStore() {
    storeModal.classList.add('hidden');
}

function closeTownHall() {
    townHallModal.classList.add('hidden');
}

function closeInvestmentModal() {
    investmentModal.classList.add('hidden');
}

function closeBankModal() {
    bankModal.classList.add('hidden');
}

function closeRelationshipModal() {
    relationshipModal.classList.add('hidden');
}

function closeJobAssignmentModal() {
    jobAssignmentModal.classList.add('hidden');
}


// --- Saving and Loading ---

function saveGame() {
    try {
        const dataToSave = JSON.stringify({
            gameData: gameData,
            miiList: miiList
        });
        localStorage.setItem(SAVE_KEY, dataToSave);
        saveMessage.textContent = `Game Saved at ${new Date().toLocaleTimeString()}.`;
    } catch (e) {
        saveMessage.textContent = "Error saving game data.";
        console.error("Error saving game:", e);
    }
}

function loadGame() {
    const savedData = localStorage.getItem(SAVE_KEY);
    if (!savedData) {
        showCreationScreen();
        return;
    }

    try {
        const data = JSON.parse(savedData);
        gameData = data.gameData;
        miiList = data.miiList.map(miiData => {
            // Instantiate Mii class for methods and proper structure
            const mii = Object.assign(new Mii(), miiData);
            
            // Ensure all properties exist from the current Mii class definition
            mii.isChild = mii.isChild || false;
            mii.skill = mii.skill || 0;
            mii.job = mii.job || 'none';
            mii.isIll = mii.isIll || false;
            
            // Ensure loveScore exists on old saves
            if (mii.relationship && mii.relationship.loveScore === undefined) {
                 mii.relationship.loveScore = 0;
            }
            return mii;
        });

        // Initialize game loop and rendering
        gameScreen.classList.remove('hidden');
        creationScreen.classList.add('hidden');
        
        // Ensure currentMiiIndex is valid after loading, default to first Mii
        if (miiList.length > 0) {
            currentMiiIndex = 0;
        }

        renderGame();
        startTownLoop();
        saveMessage.textContent = `Town data loaded. Mode: ${gameData.mode.toUpperCase()}, Difficulty: ${gameData.difficulty.toUpperCase()}.`;
        
    } catch (e) {
        saveMessage.textContent = "Error loading game data. Starting new town.";
        console.error("Could not parse saved data", e);
        showCreationScreen();
    }
}

function resetGame() {
    // Replaced alert with custom modal logic
    const confirmation = window.confirm("Are you sure you want to delete your entire town and reset the game?");
    if (confirmation) {
        localStorage.removeItem(SAVE_KEY);
        if (gameLoop) {
            clearInterval(gameLoop);
            gameLoop = null;
        }
        window.location.reload(); 
    }
}


// --- Modal Closing Listeners (Handle ESC key and click outside) ---
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

initGame();
