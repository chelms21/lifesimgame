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
const TOWN_HALL_COST = 5000;
const INITIAL_WORK_INCOME = 10;
const SKILL_GAIN_RATE = 1;      
const SKILL_INCOME_MULTIPLIER = 0.05; 
const MAX_SKILL = 100;

const JOB_DEFINITIONS = {
    'none': { name: 'Unemployed', rate: 0 },
    'farmer': { name: 'Farmer 🧑‍🌾', rate: 0.1 },      
    'shopkeeper': { name: 'Shopkeeper 🏪', rate: 0.15 }, 
    'miner': { name: 'Miner ⛏️', rate: 0.08 }
};

// --- Relationship/Child Constants ---
const DATING_THRESHOLD = 50;      
const MARRIAGE_THRESHOLD = 80;    
const LOVE_SCORE_DECAY = 0.5;     
const CHILD_BIRTH_CHANCE = 0.005; 
const CHILD_AGE_START = 0;
const CHILD_ADULT_AGE = 50;       

const DATING_HAPPINESS_BONUS = 15;
const SPOUSE_HAPPINESS_BONUS = 25;
const BREAKUP_HAPPINESS_PENALTY = 40;
const ARGUE_CHANCE = 0.02;         
const ARGUE_HAPPINESS_LOSS = 20;

// --- Seasonal & Event Constants ---
const DAYS_PER_SEASON = 20;
const SEASON_ORDER = ['spring', 'summer', 'autumn', 'winter'];

const SEASON_MODIFIERS = {
    'spring': { name: 'Spring 🌸', hungerMod: -0.1, happinessMod: 0.1, illnessChance: 0.005 },
    'summer': { name: 'Summer ☀️', hungerMod: 0.2, happinessMod: 0.0, illnessChance: 0.01 },
    'autumn': { name: 'Autumn 🍂', hungerMod: 0.0, happinessMod: 0.05, illnessChance: 0.008 },
    'winter': { name: 'Winter ❄️', hungerMod: 0.0, happinessMod: -0.15, illnessChance: 0.02 }
};

const RANDOM_EVENTS = {
    'festival': { 
        name: 'Town Festival 🎉', 
        cost: 300, 
        happinessBoost: 20, 
        chance: 0.01,
        duration: 3 
    },
    'economic_slump': { 
        name: 'Economic Slump 📉', 
        incomeMultiplier: 0.5, 
        chance: 0.005,
        duration: 5 
    },
    'illness_outbreak': {
        name: 'Illness Outbreak 🤒',
        decayMod: -5,
        chance: 0.01,
        duration: 4
    }
};

const RESEARCH_DEFINITIONS = {
    'better_plumbing': { 
        name: 'Better Plumbing', 
        cost: 2000, 
        effect: { hungerDecay: -0.2 } 
    },
    'social_training': { 
        name: 'Social Training', 
        cost: 3500, 
        effect: { argumentChance: -0.005 } 
    },
    'energy_boost': { 
        name: 'Energy Efficiency', 
        cost: 4000, 
        effect: { energyDecay: -0.1 } 
    }
};

const GOAL_DEFINITIONS = [
    { 
        text: "Help 3 Miis reach 100% Happiness.", 
        check: (mii) => mii.happiness >= 99, 
        count: 3, 
        reward: 200,
        type: 'count_match' // Fixed for goal check
    },
    { 
        text: "Successfully date/marry 1 Mii.", 
        check: (mii) => mii.relationship.status !== 'single', 
        count: 1, 
        reward: 500,
        type: 'count_match' // Fixed for goal check
    },
    { 
        text: "Have 5 Miis sleeping at once.", 
        check: (mii) => mii.isSleeping, 
        count: 5, 
        reward: 150,
        type: 'count_match' // Fixed for goal check
    },
    { 
        text: "Achieve a total Mii Skill of 500.", 
        check: (mii) => mii.skill, 
        count: 500, 
        reward: 750,
        type: 'aggregate_skill' // Fixed for goal check
    },
];

// --- Item Definitions ---
const ITEMS = {
    'apple': { name: 'Apple 🍎', type: 'food', cost: 10, hunger: 20, happiness: 5},
    'sandwich': { name: 'Sandwich 🥪', type: 'food', cost: 30, hunger: 40, happiness: 10 },
    'steak': { name: 'Gourmet Steak 🥩', type: 'food', cost: 100, hunger: 90, happiness: 20 },
    'coffee': { name: 'Coffee ☕', type: 'mood', cost: 15, happiness: 20 },
    'toy_car': { name: 'Toy Car 🚗', type: 'mood', cost: 50, happiness: 40 },
    'medicine': { name: 'Medicine 💊', type: 'mood', cost: 75, happiness: 10, cureIllness: true },
};
const REQUESTABLE_ITEMS = ['apple', 'sandwich', 'coffee', 'medicine']; 

// --- DOM Element References ---
const creationScreen = document.getElementById('creation-screen');
const gameScreen = document.getElementById('game-screen');
const miiNameDisplay = document.getElementById('mii-name');
const personalityStat = document.getElementById('personality-stat');
const genderStat = document.getElementById('gender-stat'); 
const relationshipStat = document.getElementById('relationship-stat'); 
const happinessStat = document.getElementById('happiness-stat');
const hungerStat = document.getElementById('hunger-stat');
const energyStat = document.getElementById('energy-stat'); 
const energyBar = document.getElementById('energy-bar'); 
const happinessBar = document.getElementById('happiness-bar');
const hungerBar = document.getElementById('hunger-bar');
const miiMessage = document.getElementById('mii-message');
const saveMessage = document.getElementById('save-message');
const moneyStat = document.getElementById('money-stat');
const inventoryList = document.getElementById('inventory-list');
const storeModal = document.getElementById('store-modal');
const storeMoney = document.getElementById('store-money');
const storeItemsDiv = document.getElementById('store-items');
const miiAvatar = document.querySelector('.mii-avatar');
const requestBox = document.getElementById('mii-request-box');
const requestedItemName = document.getElementById('requested-item-name');
const miiSelector = document.getElementById('mii-select');
const residentCountSpan = document.getElementById('resident-count');
const startTownButton = document.getElementById('start-town-button');
const newMiiModal = document.getElementById('new-mii-modal');

// Investment Modal Elements
const investmentModal = document.getElementById('investment-modal'); 
const investmentTotal = document.getElementById('investment-total'); 
const investmentRate = document.getElementById('investment-rate'); 
const investmentAmountInput = document.getElementById('investment-amount'); 

const residentListDiv = document.getElementById('resident-list'); 
const caretakerStatusSpan = document.getElementById('caretaker-status'); 

// Bank Modal Elements
const bankModal = document.getElementById('bank-modal');
const bankCurrentMoney = document.getElementById('bank-current-money');
const savingsTotalDisplay = document.getElementById('savings-total');
const savingsDepositInput = document.getElementById('savings-deposit-amount');
const savingsWithdrawInput = document.getElementById('savings-withdraw-amount');

// Relationship Modal Elements
const relationshipModal = document.getElementById('relationship-modal');
const relMiiName = document.getElementById('rel-mii-name');
const relStatus = document.getElementById('rel-status');
const relActionsDiv = document.getElementById('rel-actions');
const relFriendsUl = document.getElementById('rel-friends-ul');

// Town Hall Elements
const townHallModal = document.getElementById('town-hall-modal');
const townHallTitle = document.getElementById('town-hall-title');
const townHallContent = document.getElementById('town-hall-content');

// Job Assignment Elements
const jobAssignmentModal = document.getElementById('job-assignment-modal');
const jobMiiName = document.getElementById('job-mii-name');
const jobListOptions = document.getElementById('job-list-options');
const maxSkillDisplay = document.getElementById('max-skill-display');

// Gift Modal Elements
let targetMiiForGift = null;
const giftModal = document.getElementById('gift-modal');
const giftTargetName = document.getElementById('gift-target-name');
const giftInventoryList = document.getElementById('gift-inventory-list');

// Season/Event/Goal Elements
const currentSeasonSpan = document.getElementById('current-season');
const activeEventStatus = document.getElementById('active-event-status');
const goalsList = document.getElementById('goals-list');
const seasonTicksRemaining = document.getElementById('season-ticks-remaining');


// --- CORE RENDERING FUNCTIONS ---

function renderMoney() {
    moneyStat.textContent = gameData.money;
}

function renderInventory() {
    inventoryList.innerHTML = ''; 
    let isEmpty = true;

    for (const key in gameData.inventory) {
        const count = gameData.inventory[key];
        if (count > 0) {
            isEmpty = false;
            const item = ITEMS[key];
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                ${item.name} x${count} 
                <button onclick="useItem('${key}')">Use</button>
            `;
            inventoryList.appendChild(listItem);
        }
    }
    
    if (isEmpty) {
        inventoryList.innerHTML = '<li>Inventory is empty.</li>';
    }
}

function renderMiiSelector() {
    miiSelector.innerHTML = ''; 
    
    miiList.forEach((mii, index) => {
        if (!mii.isDead) { 
            const option = document.createElement('option');
            option.value = index;
            option.textContent = mii.name;
            miiSelector.appendChild(option);
        }
    });
    
    if (currentMiiIndex >= 0 && !miiList[currentMiiIndex]?.isDead) {
        miiSelector.value = currentMiiIndex; 
    } else if (miiList.filter(m => !m.isDead).length > 0) {
        currentMiiIndex = miiList.findIndex(m => !m.isDead);
        miiSelector.value = currentMiiIndex;
    } else {
        currentMiiIndex = -1; 
    }
}

function updateSleepStateVisuals(mii) {
    const sleepButton = document.getElementById('sleep-button');
    if (!mii || !sleepButton) return;
    
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

function renderCurrentMiiState() {
    const mii = miiList[currentMiiIndex];
    const actionsDiv = document.querySelector('.actions');

    if (!mii || mii.isDead) {
        miiNameDisplay.textContent = "No Active Resident";
        actionsDiv.innerHTML = "<p>Select a Mii to see actions.</p>";
        miiAvatar.className = 'mii-avatar'; 
        document.getElementById('mii-message').textContent = mii?.isDead ? `${mii.name} is deceased.` : "Select a Mii to begin.";
        return;
    }
    
    const partner = mii.relationship.partnerId ? miiList.find(m => m.id === mii.relationship.partnerId) : null;
    miiNameDisplay.textContent = mii.name;

    // --- Stats Display ---
    genderStat.textContent = `${mii.gender === 'male' ? 'Male ♂️' : 'Female ♀️'} (Age: ${mii.isChild ? 'Child' : mii.age})`; 
    personalityStat.textContent = `${mii.personality.charAt(0).toUpperCase() + mii.personality.slice(1)} (Skill: ${mii.skill}/${MAX_SKILL})`;
    
    let statusText = mii.isChild ? 'Child' : 'Single';
    if (mii.relationship.status === 'dating') {
        statusText = `Dating ${partner ? partner.name : 'Unknown'} ❤️ (Love: ${mii.relationship.loveScore})`;
    } else if (mii.relationship.status === 'spouse') {
        statusText = `Spouse of ${partner ? partner.name : 'Unknown'} 💍 (Love: ${mii.relationship.loveScore})`;
    }
    relationshipStat.textContent = statusText;

    happinessStat.textContent = Math.round(mii.happiness);
    hungerStat.textContent = Math.round(mii.hunger);
    energyStat.textContent = Math.round(mii.energy); 

    happinessBar.style.width = `${mii.happiness}%`;
    hungerBar.style.width = `${mii.hunger}%`;
    energyBar.style.width = `${mii.energy}%`; 

    // --- Visuals and Messages ---
    miiAvatar.className = 'mii-avatar'; 
    happinessBar.classList.remove('low');
    hungerBar.classList.remove('low');
    energyBar.classList.remove('low'); 

    updateSleepStateVisuals(mii); 
        
    // Actions Section Update
    const jobName = JOB_DEFINITIONS[mii.job]?.name || 'Unemployed';
    actionsDiv.innerHTML = `
        <p><strong>Current Job:</strong> ${jobName}</p>
        ${!mii.isChild ? `<button id="work-button" onclick="workForMoney()">Work (💰)</button>` : ''}
        <button id="sleep-button" onclick="toggleSleep()"></button>
        ${!mii.isChild ? `<button id="rel-button" onclick="openRelationshipModal()">Relationships ❤️</button>` : ''}
        ${!mii.isChild ? `<button id="job-button" onclick="openJobAssignmentModal()">Assign Job 💼</button>` : ''}
    `;
    updateSleepStateVisuals(mii); 

    if (mii.currentRequest) {
        requestedItemName.textContent = ITEMS[mii.currentRequest].name;
        requestBox.classList.remove('hidden');
    } else {
        requestBox.classList.add('hidden');
    }

    // Status Checks (Illness > Energy > Hunger > Happiness)
    if (mii.isIll) {
        miiMessage.textContent = `${mii.name} is sick! Use Medicine 💊 to cure them quickly!`;
        miiAvatar.classList.add('ill');
    } else if (mii.energy < 20) {
        miiMessage.textContent = `${mii.name} is critically exhausted! Put them to sleep!`;
        energyBar.classList.add('low');
        miiAvatar.classList.add('tired'); 
    } else if (mii.hunger < 20) {
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

function renderResidentList() {
    residentListDiv.innerHTML = '';
    const activeMiis = miiList.filter(m => !m.isDead);

    activeMiis.forEach(mii => {
        const originalIndex = miiList.findIndex(m => m.id === mii.id); 
        const card = document.createElement('div');
        card.className = 'resident-mini-card';
        
        let statusIcon = mii.gender === 'male' ? '♂️' : '♀️';
        let statusClass = '';

        if (mii.isChild) {
            statusIcon = '👶';
            statusClass = 'child';
        } else if (mii.isIll) {
            statusIcon = '🤒';
            statusClass = 'ill';
        } else if (mii.relationship.status !== 'single') {
            statusIcon = mii.relationship.status === 'dating' ? '❤️' : '💍';
        } else if (mii.isSleeping) {
            statusIcon = '😴';
            statusClass = 'asleep';
        } else if (mii.energy < CARETAKER_THRESHOLD) { 
            statusIcon = '⚡';
            statusClass = 'tired';
        } else if (mii.hunger < CARETAKER_THRESHOLD) {
            statusIcon = '🍔';
            statusClass = 'hungry';
        } else if (mii.happiness < CARETAKER_THRESHOLD) {
            statusIcon = '😞';
            statusClass = 'sad';
        }

        if (originalIndex === currentMiiIndex) {
            card.classList.add('selected');
        }
        if (statusClass) card.classList.add(statusClass);

        card.setAttribute('onclick', `switchMii(${originalIndex})`);

        card.innerHTML = `
            <h5>${mii.name}</h5>
            <p><span class="status-icon">${statusIcon}</span></p>
            <p>${Math.round(mii.happiness)}❤️ ${Math.round(mii.hunger)}🍔 ${Math.round(mii.energy)}⚡</p>
        `;
        residentListDiv.appendChild(card);
    });
}

function renderGoals() {
    goalsList.innerHTML = '';
    gameData.currentGoals.forEach(goal => {
        const listItem = document.createElement('li');
        listItem.className = 'goal-item';
        if (goal.completed) listItem.classList.add('completed');
        
        let progress = 0;
        
        // Use the explicit type property for reliable checking
        if (goal.type === 'aggregate_skill') {
             progress = miiList.reduce((sum, mii) => sum + mii.skill, 0);
        } else if (goal.type === 'count_match') { 
             progress = miiList.filter(mii => goal.check(mii)).length;
        }

        const progressText = goal.completed 
            ? '(Completed!)' 
            : `(Progress: ${progress}/${goal.count})`;

        listItem.textContent = `${goal.text} - Reward: 💰${goal.reward} ${progressText}`;
        goalsList.appendChild(listItem);
    });
}

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

function updateCreationScreenState() {
    const residentCount = miiList.length;
    residentCountSpan.textContent = residentCount;

    if (residentCount > 0) {
        startTownButton.disabled = false;
    } else {
        startTownButton.disabled = true;
    }
}

function showCreationScreen() {
    creationScreen.classList.remove('hidden');
    gameScreen.classList.add('hidden');
    // Hide all modals
    [storeModal, newMiiModal, investmentModal, relationshipModal, bankModal, townHallModal, jobAssignmentModal, giftModal].forEach(m => m.classList.add('hidden'));
    updateCreationScreenState(); 
}

function startGame() {
    if (miiList.length > 0) {
        const modeSelect = document.getElementById('game-mode-select');
        const difficultySelect = document.getElementById('game-difficulty-select');

        gameData.mode = modeSelect.value;
        gameData.difficulty = difficultySelect.value;
        
        if (gameData.difficulty === 'easy') {
            gameData.isCaretakerActive = true;
            gameData.money = Math.max(gameData.money, 100); 
            alert("Easy Mode activated: Caretaker unlocked and starting funds boosted!");
        }

        currentMiiIndex = 0; 
        showGameScreen();
        generateGoals(); 
    }
}

function showGameScreen() {
    creationScreen.classList.add('hidden');
    // Hide all modals
    [storeModal, newMiiModal, investmentModal, relationshipModal, bankModal, townHallModal, jobAssignmentModal, giftModal].forEach(m => m.classList.add('hidden'));
    gameScreen.classList.remove('hidden');
    
    if (!gameLoop) {
        gameLoop = setInterval(updateAllMiiStats, UPDATE_INTERVAL);
    }
    
    renderMiiSelector(); 
    renderInventory();
    renderMoney(); 
    renderCaretakerStatus(); 
    renderCurrentMiiState(); 
    renderResidentList(); 
}

// --- Mii Creation/Management (Simplified for brevity) ---
function createMiiObject(name, gender, personality) {
    return {
        id: Date.now(), 
        name: name,
        gender: gender, 
        personality: personality,
        happiness: 100,
        hunger: 100,
        energy: 100,
        isSleeping: false,
        currentRequest: null,
        isDead: false,
        age: 18,
        isChild: false,
        isIll: false,
        skill: 0,
        job: 'none',
        relationship: {
            status: 'single', 
            partnerId: null,
            loveScore: 0,
            friends: [] 
        }
    };
}

function addMiiToTown() {
    const nameInput = document.getElementById('mii-name-input');
    const genderSelect = document.getElementById('mii-gender-select');
    const personalitySelect = document.getElementById('mii-personality-select');
    const name = nameInput.value.trim();
    const gender = genderSelect.value;
    const personality = personalitySelect.value;
    
    if (name === "") {
        alert("Please give your Mii a name!");
        return;
    }

    miiList.push(createMiiObject(name, gender, personality));
    nameInput.value = '';
    updateCreationScreenState(); 
    alert(`${name} has moved into the apartment!`);
}

function addNewMii() {
    const nameInput = document.getElementById('new-mii-name-input');
    const genderSelect = document.getElementById('new-mii-gender-select');
    const personalitySelect = document.getElementById('new-mii-personality-select');
    const name = nameInput.value.trim();
    const gender = genderSelect.value;
    const personality = personalitySelect.value;
    
    if (name === "") {
        alert("Please give your Mii a name!");
        return;
    }

    miiList.push(createMiiObject(name, gender, personality));
    
    closeNewMiiModal();
    renderMiiSelector(); 
    renderResidentList();
    miiMessage.textContent = `${name} has joined the town!`;
    saveGame();
}

function switchMii(indexToSelect = null) {
    if (indexToSelect !== null) {
        currentMiiIndex = indexToSelect;
        miiSelector.value = indexToSelect; 
    } else {
        currentMiiIndex = parseInt(miiSelector.value);
    }
    renderCurrentMiiState();
    renderResidentList(); 
}

// --- Caretaker System ---
function renderCaretakerStatus() {
    caretakerStatusSpan.textContent = gameData.isCaretakerActive ? 'Active ✅' : 'Inactive ❌';
}

function handleCaretaker(activeMiis) {
    activeMiis.forEach(mii => {
        if (mii.isDead || mii.isSleeping || mii.isChild) return;

        // Priority 1: Ill Miis need medicine
        if (mii.isIll && gameData.inventory.medicine > 0) {
            useItemOnMii(mii, 'medicine'); 
            return;
        }

        // Priority 2: Low Energy (Put Mii to sleep)
        if (mii.energy < CARETAKER_THRESHOLD) {
            toggleSleep(mii.id); 
            return;
        }

        // Priority 3: Low Hunger (Feed Mii)
        if (mii.hunger < CARETAKER_THRESHOLD && gameData.inventory[CARETAKER_FOOD] > 0) {
            useItemOnMii(mii, CARETAKER_FOOD); 
            return;
        }
        
        // Priority 4: Low Happiness (Mood Item)
        if (mii.happiness < CARETAKER_THRESHOLD && gameData.inventory[CARETAKER_MOOD] > 0) {
            useItemOnMii(mii, CARETAKER_MOOD); 
            return;
        }
    });
}

function useItemOnMii(mii, key) {
    if (mii.isDead || mii.isSleeping) return;

    const item = ITEMS[key];
    if (gameData.inventory[key] <= 0) return;

    gameData.inventory[key] -= 1; 

    let happinessBoost = item.happiness || 0;
    
    if (item.cureIllness && mii.isIll) {
        mii.isIll = false;
        happinessBoost += 20; 
    }

    if (item.type === 'food') {
        mii.hunger = Math.min(100, mii.hunger + (item.hunger || 0));
    }
    
    if (key === 'coffee') {
        mii.energy = Math.min(100, mii.energy + item.happiness * 0.5); 
    }

    mii.happiness = Math.min(100, mii.happiness + happinessBoost);
    
    if (mii.id === miiList[currentMiiIndex]?.id) {
        miiMessage.textContent = `The caretaker used ${item.name} on ${mii.name}.`;
    }
}
// --- End Caretaker System ---

// --- Store Management ---
function openStore() {
    storeMoney.textContent = gameData.money;
    renderStoreItems();
    storeModal.classList.remove('hidden');
}

function closeStore() {
    storeModal.classList.add('hidden');
}

function renderStoreItems() {
    storeItemsDiv.innerHTML = '';
    
    for (const key in ITEMS) {
        const item = ITEMS[key];
        const itemDiv = document.createElement('div');
        itemDiv.className = 'item-card';
        itemDiv.innerHTML = `
            <h4>${item.name}</h4>
            <p>Type: ${item.type.charAt(0).toUpperCase() + item.type.slice(1)}</p>
            <p>Cost: 💰${item.cost}</p>
            <button onclick="buyItem('${key}')">Buy</button>
        `;
        storeItemsDiv.appendChild(itemDiv);
    }
}

function buyItem(key) {
    const item = ITEMS[key];
    if (gameData.money >= item.cost) {
        gameData.money -= item.cost;
        gameData.inventory[key] = (gameData.inventory[key] || 0) + 1;
        
        renderMoney();
        renderStoreItems(); 
        renderInventory();
        miiMessage.textContent = `Purchased one ${item.name}.`;
        saveGame();
    } else {
        alert("Not enough money!");
    }
}
// --- End Store Management ---

// --- Bank/Investment Modals ---

function openBankModal() {
    bankCurrentMoney.textContent = gameData.money;
    savingsTotalDisplay.textContent = gameData.savingsTotal;
    bankModal.classList.remove('hidden');
}

function closeBankModal() {
    bankModal.classList.add('hidden');
}

function openInvestmentModal() {
    investmentTotal.textContent = gameData.investmentTotal;
    // Simple placeholder rate
    investmentRate.textContent = '10%'; 
    investmentModal.classList.remove('hidden');
}

function closeInvestmentModal() {
    investmentModal.classList.add('hidden');
}

function throwParty() {
    if (gameData.money >= PARTY_COST) {
        if (!confirm(`Are you sure you want to throw a Town Party for 💰${PARTY_COST}? All Miis will get a Happiness boost!`)) {
            return;
        }

        gameData.money -= PARTY_COST;
        
        miiList.filter(m => !m.isDead).forEach(mii => {
            mii.happiness = Math.min(100, mii.happiness + PARTY_HAPPINESS_BONUS);
        });
        
        miiMessage.textContent = `🎉 The town threw an epic party! Happiness +${PARTY_HAPPINESS_BONUS} for everyone!`;
        renderMoney();
        renderCurrentMiiState();
        saveGame();
    } else {
        miiMessage.textContent = `Need 💰${PARTY_COST} to throw a party!`;
    }
}


// --- Relationship System (Gifting) ---
function openRelationshipModal() {
    const mii = miiList[currentMiiIndex];
    if (!mii || mii.isChild || mii.isDead) {
        miiMessage.textContent = "Please select an adult resident to view relationships.";
        return;
    }
    // ... (rest of relationship modal logic) ...
    relMiiName.textContent = mii.name;
    let statusText = mii.isChild ? 'Child' : 'Single';
    if (mii.relationship.status !== 'single') {
        const partner = miiList.find(m => m.id === mii.relationship.partnerId);
        if (partner) {
            statusText = `${mii.relationship.status.charAt(0).toUpperCase() + mii.relationship.status.slice(1)} with ${partner.name} ${mii.relationship.status === 'dating' ? '❤️' : '💍'}`;
        }
    }
    relStatus.textContent = statusText;

    // These functions need to be defined to fully use this modal:
    // renderRelationshipActions();
    // renderFriendList();
    
    relationshipModal.classList.remove('hidden');
}
function openGiftModal(targetId, targetName) {
    targetMiiForGift = parseInt(targetId);
    giftTargetName.textContent = targetName;
    giftModal.classList.remove('hidden');
    renderGiftInventory();
}

function renderGiftInventory() {
    giftInventoryList.innerHTML = ''; 
    
    for (const key in gameData.inventory) {
        const count = gameData.inventory[key];
        if (count > 0) {
            const item = ITEMS[key];
            const slot = document.createElement('div');
            slot.className = 'item-slot';
            // Use item on the target Mii
            slot.setAttribute('onclick', `useItemOnTarget('${key}', ${targetMiiForGift})`);
            slot.innerHTML = `
                <h4>${item.name}</h4>
                <p>Qty: <span class="count">${count}</span></p>
                <small>Cost: 💰${item.cost}</small>
            `;
            giftInventoryList.appendChild(slot);
        }
    }

    if (Object.keys(gameData.inventory).filter(k => gameData.inventory[k] > 0).length === 0) {
        giftInventoryList.innerHTML = '<p>Town inventory is empty. Visit the Maple Store!</p>';
    }
}

function useItemOnTarget(key, targetId) {
    const mii = miiList[currentMiiIndex];
    const target = miiList.find(m => m.id === targetId);

    if (!mii || !target || mii.isDead || mii.isSleeping || target.isDead) return;

    const item = ITEMS[key];
    if (gameData.inventory[key] <= 0) {
        miiMessage.textContent = `No ${item.name} left to give!`;
        return;
    }

    gameData.inventory[key] -= 1; 

    let happinessGain = item.happiness || 0;
    let loveGain = 0;
    
    if (mii.relationship.partnerId !== targetId) {
        happinessGain *= 0.5;
        // Non-partner love gain is small, useful for reaching DATING_THRESHOLD
        loveGain = item.cost / 20; 
    } else {
        // Partner gifting: Stronger love gain
        loveGain = item.cost / 5;
    }
    
    // Apply gains
    target.happiness = Math.min(100, target.happiness + happinessGain);
    
    if (mii.relationship.partnerId === targetId || target.relationship.status === 'single') {
        // Only update the initiating Mii's score toward the target Mii
        mii.relationship.loveScore = Math.min(100, mii.relationship.loveScore + loveGain);
    }
    
    miiMessage.textContent = `${mii.name} gave ${target.name} a ${item.name}. (Love +${loveGain.toFixed(1)})`;
    
    giftModal.classList.add('hidden');
    renderInventory();
    renderCurrentMiiState();
    openRelationshipModal(); 
    saveGame();
}

// --- Town Hall & Research (Simplified for brevity) ---
function openTownHall() {
    townHallModal.classList.remove('hidden');
    renderTownHall();
}
function closeTownHall() {
    townHallModal.classList.add('hidden');
}
function renderTownHall() {
    townHallTitle.textContent = `Town Hall 🏛️ (Funds: 💰${gameData.money})`;
    
    if (!gameData.townHallOwned) {
        // ... (Buy Town Hall Button HTML) ...
        townHallContent.innerHTML = `<p>Cost: 💰${TOWN_HALL_COST}</p><button onclick="buyTownHall()">Buy Town Hall</button>`;
    } else {
        // ... (Research Options HTML) ...
        let researchHTML = '<h3>Completed Research:</h3>';
        
        Object.keys(RESEARCH_DEFINITIONS).forEach(key => {
            const research = RESEARCH_DEFINITIONS[key];
            const isCompleted = gameData.researchCompleted.includes(key);

            if (isCompleted) {
                researchHTML += `<p>✅ ${research.name} (Active)</p>`;
            } else {
                researchHTML += `
                    <div><h4>${research.name}</h4><p>Cost: 💰${research.cost}</p>
                    <button onclick="startResearch('${key}', ${research.cost})">Start Research</button></div>
                `;
            }
        });
        townHallContent.innerHTML = researchHTML;
    }
}
function buyTownHall() {
    if (gameData.money >= TOWN_HALL_COST) {
        gameData.money -= TOWN_HALL_COST;
        gameData.townHallOwned = true;
        miiMessage.textContent = `🎉 The Town Hall is now open!`;
        renderMoney();
        renderTownHall();
        saveGame();
    } else {
        alert(`You need 💰${TOWN_HALL_COST} to buy the Town Hall.`);
    }
}
function startResearch(key, cost) {
    if (gameData.money >= cost) {
        gameData.money -= cost;
        gameData.researchCompleted.push(key);
        miiMessage.textContent = `🔬 Research on ${RESEARCH_DEFINITIONS[key].name} complete!`;
        renderMoney();
        renderTownHall();
        saveGame();
    } else {
        alert(`You need 💰${cost} to start this research.`);
    }
}

// --- Job Assignment ---
function openJobAssignmentModal() {
    const mii = miiList[currentMiiIndex];
    if (mii.isChild) {
        miiMessage.textContent = `${mii.name} is too young to get a job!`;
        return;
    }
    jobMiiName.textContent = mii.name;
    maxSkillDisplay.textContent = MAX_SKILL;
    renderJobOptions(mii);
    jobAssignmentModal.classList.remove('hidden');
}
function closeJobAssignmentModal() {
    jobAssignmentModal.classList.add('hidden');
}
function renderJobOptions(mii) {
    jobListOptions.innerHTML = '';
    
    Object.keys(JOB_DEFINITIONS).forEach(key => {
        const job = JOB_DEFINITIONS[key];
        const isCurrentJob = mii.job === key;
        
        let buttonText = isCurrentJob ? 'Current Job' : 'Assign Job';
        let buttonStyle = isCurrentJob ? 'background-color: #555;' : 'background-color: #007bff;';

        const listItem = document.createElement('div');
        listItem.style.border = '1px solid #ddd';
        listItem.style.padding = '10px';
        listItem.style.marginBottom = '5px';
        
        listItem.innerHTML = `
            <h4>${job.name}</h4>
            <p>Passive Income Rate: ${job.rate * 100}% of Skill per tick.</p>
            <button onclick="assignJob('${key}')" ${isCurrentJob ? 'disabled' : ''} style="${buttonStyle}">${buttonText}</button>
        `;
        jobListOptions.appendChild(listItem);
    });
}
function assignJob(key) {
    const mii = miiList[currentMiiIndex];
    mii.job = key;
    miiMessage.textContent = `${mii.name} is now working as a ${JOB_DEFINITIONS[key].name}.`;
    closeJobAssignmentModal();
    renderCurrentMiiState(); 
    saveGame();
}

// --- Core Game Loop Functions ---

function updateAllMiiStats() {
    const activeMiis = miiList.filter(mii => !mii.isDead);
    
    gameData.gameTickCount += 1; 

    // 1. **Season/Clock Management**
    handleSeasonChange();
    
    // 2. **Random Event Triggering and Decay**
    handleRandomEvents(activeMiis);

    // 3. **Caretaker System Action**
    if (gameData.isCaretakerActive) {
        handleCaretaker(activeMiis); 
    }
    
    // 4. **Automatic Mode Actions (Work/Dating)**
    if (gameData.mode === 'automatic') {
        // Assuming handleAutomaticActions is defined elsewhere
        // handleAutomaticActions(activeMiis);
    }

    // 5. **Investment & Savings Income**
    const passiveInvestment = Math.floor(gameData.investmentTotal / 100);
    gameData.money += passiveInvestment;
    if (gameData.savingsTotal > 0) {
        const interest = Math.floor(gameData.savingsTotal * SAVINGS_INTEREST_RATE);
        gameData.savingsTotal += interest;
    }
    
    // 6. **Goals Check**
    checkGoals();

    // 7. **Calculate Global Modifiers (Research & Seasons)**
    let hungerDecayMod = 0;
    let energyDecayMod = 0;
    let argumentChanceMod = 0;
    
    gameData.researchCompleted.forEach(key => {
        const research = RESEARCH_DEFINITIONS[key];
        hungerDecayMod += research.effect.hungerDecay || 0;
        energyDecayMod += research.effect.energyDecay || 0;
        argumentChanceMod += research.effect.argumentChance || 0;
    });

    const seasonMods = SEASON_MODIFIERS[gameData.currentSeason];
    let finalHappinessDecayMod = seasonMods.happinessMod;

    // Apply active event decay (Illness Outbreak)
    if (gameData.activeEvent && gameData.activeEvent.key === 'illness_outbreak') {
         finalHappinessDecayMod += RANDOM_EVENTS['illness_outbreak'].decayMod;
    }

    // 8. **Mii Stat Decay, Relationship Buffs, and Requests**
    miiList.forEach(mii => {
        if (mii.isDead) return;

        mii.age += 1;
        
        // Children grow up
        if (mii.isChild && mii.age >= CHILD_ADULT_AGE) {
            mii.isChild = false;
            mii.age = 18;
            miiMessage.textContent = `${mii.name} has grown up and is now an adult resident!`;
        }
        
        // Passive Job Income
        if (mii.job !== 'none' && !mii.isSleeping && !mii.isChild) {
            const job = JOB_DEFINITIONS[mii.job];
            const passiveIncome = Math.round(mii.skill * job.rate);
            if (passiveIncome > 0) {
                 gameData.money += passiveIncome;
            }
        }

        // Apply Relationship Buffs and Decay
        if (mii.relationship.status !== 'single') {
            if (mii.relationship.status === 'dating') {
                mii.happiness = Math.min(100, mii.happiness + 1); 
                mii.relationship.loveScore = Math.max(0, mii.relationship.loveScore - LOVE_SCORE_DECAY);
            } else if (mii.relationship.status === 'spouse') {
                mii.happiness = Math.min(100, mii.happiness + 2); 
            }
        }
        
        if (mii.isSleeping) {
            mii.energy = Math.min(100, mii.energy + 5); 
            mii.happiness = Math.min(100, mii.happiness + 0.5); 
            return; 
        }

        // Decay logic
        const finalHungerDecay = Math.max(0, DECAY_RATE + hungerDecayMod + (DECAY_RATE * seasonMods.hungerMod));
        const finalEnergyDecay = Math.max(0, ENERGY_DECAY_RATE + energyDecayMod);

        mii.hunger = Math.max(0, mii.hunger - finalHungerDecay);
        mii.energy = Math.max(0, mii.energy - finalEnergyDecay); 

        let happinessDecay = mii.hunger < 30 ? DECAY_RATE * 2 : DECAY_RATE;
        if (mii.energy < 20 || mii.isIll) happinessDecay *= 1.5; 

        if (mii.personality === 'stubborn') happinessDecay *= 0.7; 
        
        happinessDecay -= finalHappinessDecayMod;
        
        mii.happiness = Math.max(0, mii.happiness - happinessDecay);
        
        // Request Generation & Decay
        if (!mii.currentRequest && Math.random() < REQUEST_CHANCE && mii.happiness < 70) {
            mii.currentRequest = REQUESTABLE_ITEMS[Math.floor(Math.random() * REQUESTABLE_ITEMS.length)];
        }
        if (mii.currentRequest) {
            mii.happiness = Math.max(0, mii.happiness - 1); 
        }
        
        // Death Check
        if (mii.happiness <= 0 && !mii.isDead) {
            mii.isDead = true;
            // ... (partner grief logic unchanged) ...
        }
    });
    
    // 9. **Relationship Event Handling (Birth & Arguments)**
    // handleRelationshipEvents(activeMiis, argumentChanceMod); // Assuming this is defined elsewhere
    
    // 10. **UI Updates**
    renderMoney(); 
    renderCurrentMiiState(); 
    renderMiiSelector(); 
    renderResidentList(); 
    // checkIfTownIsOver(); // Assuming this is defined elsewhere
    saveGame(); 
}

function handleSeasonChange() {
    const currentSeasonIndex = SEASON_ORDER.indexOf(gameData.currentSeason);

    const ticksUntilNextSeason = DAYS_PER_SEASON - (gameData.gameTickCount % DAYS_PER_SEASON);
    seasonTicksRemaining.textContent = ticksUntilNextSeason;

    if (gameData.gameTickCount > 0 && gameData.gameTickCount % DAYS_PER_SEASON === 0) {
        const nextIndex = (currentSeasonIndex + 1) % SEASON_ORDER.length;
        gameData.currentSeason = SEASON_ORDER[nextIndex];
        
        const newSeasonName = SEASON_MODIFIERS[gameData.currentSeason].name;
        miiMessage.textContent = `🔔 A new season has arrived: ${newSeasonName}! Check the modifiers!`;
        currentSeasonSpan.textContent = newSeasonName;
        
        if (currentSeasonIndex === 0) { // Start of Spring/Year
            generateGoals();
        }
    }
    currentSeasonSpan.textContent = SEASON_MODIFIERS[gameData.currentSeason].name;
}

function handleRandomEvents(activeMiis) {
    if (gameData.activeEvent) {
        gameData.activeEvent.ticksRemaining -= 1;
        
        if (gameData.activeEvent.ticksRemaining <= 0) {
            // Check the event definition BEFORE setting activeEvent to null
            const eventDef = RANDOM_EVENTS[gameData.activeEvent.key]; 
            miiMessage.textContent = `✅ ${eventDef.name} has concluded.`;
            
            if (gameData.activeEvent.key === 'illness_outbreak') {
                 activeMiis.forEach(mii => mii.isIll = false);
            }
            
            gameData.activeEvent = null; 
        }

        // CRITICAL FIX: Only update status if activeEvent is NOT null (meaning the event hasn't just ended)
        if (gameData.activeEvent) {
            activeEventStatus.textContent = `${RANDOM_EVENTS[gameData.activeEvent.key].name} (${gameData.activeEvent.ticksRemaining} ticks left)`;
            return;
        } else {
            activeEventStatus.textContent = 'None';
        }
    }
    
    activeEventStatus.textContent = 'None';

    for (const key in RANDOM_EVENTS) {
        const eventDef = RANDOM_EVENTS[key];
        
        if (Math.random() < eventDef.chance) {
            gameData.activeEvent = { key: key, ticksRemaining: eventDef.duration };
            miiMessage.textContent = `🚨 TOWN ALERT: ${eventDef.name} has begun!`;
            
            if (key === 'festival') {
                activeMiis.forEach(mii => {
                    mii.happiness = Math.min(100, mii.happiness + eventDef.happinessBoost);
                    mii.isSleeping = false; 
                });
            } else if (key === 'illness_outbreak') {
                 activeMiis.sort(() => 0.5 - Math.random()).slice(0, Math.min(3, activeMiis.length)).forEach(mii => {
                     mii.isIll = true;
                 });
            }
            break; 
        }
    }
}


function workForMoney(miiId = null) {
    const mii = miiId ? miiList.find(m => m.id === miiId) : miiList[currentMiiIndex];
    if (!mii || mii.isDead || mii.isSleeping || mii.isChild) return;

    if (mii.happiness < 30) {
        if (!miiId) miiMessage.textContent = `${mii.name} is too sad to work right now.`;
        return;
    }
    if (mii.energy < 15) {
        if (!miiId) miiMessage.textContent = `${mii.name} is too exhausted to work.`;
        return;
    }
    
    const earned = INITIAL_WORK_INCOME;
    const skillBonus = Math.floor(mii.skill / 10) * SKILL_INCOME_MULTIPLIER; 
    let incomeFactor = mii.energy < 40 ? 0.5 : 1; 

    // Apply Economic Slump modifier
    if (gameData.activeEvent && gameData.activeEvent.key === 'economic_slump') {
        incomeFactor *= RANDOM_EVENTS['economic_slump'].incomeMultiplier;
    }
    
    const finalIncome = Math.round(earned * incomeFactor * (1 + skillBonus));
    
    gameData.money += finalIncome;
    
    mii.happiness = Math.max(0, mii.happiness - 5); 
    mii.energy = Math.max(0, mii.energy - 20); 
    
    // Skill Gain
    mii.skill = Math.min(MAX_SKILL, mii.skill + SKILL_GAIN_RATE);

    if (!miiId) {
        renderMoney(); 
        renderCurrentMiiState();
        miiMessage.textContent = `${mii.name} worked hard and earned 💰${finalIncome} gold for the town! (Skill +${SKILL_GAIN_RATE})`;
    }
    saveGame();
}

function useItem(key) {
    const mii = miiList[currentMiiIndex];
    if (!mii || mii.isDead || mii.isSleeping) return;

    const item = ITEMS[key];
    
    if (gameData.inventory[key] > 0) {
        gameData.inventory[key] -= 1; 

        let isFulfillingRequest = mii.currentRequest === key;
        let happinessBoost = item.happiness || 0;
        
        if (item.cureIllness && mii.isIll) {
            mii.isIll = false;
            miiMessage.textContent = `${mii.name} feels much better after taking the Medicine!`;
            happinessBoost += 20; // Bonus for curing illness
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
            mii.energy = Math.min(100, mii.energy + item.happiness * 0.5); 
        }

        if (mii.personality === 'stubborn' && item.type === 'mood' && !isFulfillingRequest) {
            happinessBoost *= 0.5; 
        }

        mii.happiness = Math.min(100, mii.happiness + happinessBoost);
        
        if (!isFulfillingRequest && !item.cureIllness) {
            miiMessage.textContent = `${mii.name} used the ${item.name}.`;
        }
        
        renderCurrentMiiState();
        renderInventory();
        saveGame();
    } else {
        miiMessage.textContent = `The town inventory doesn't have any ${item.name}!`;
    }
}

function toggleSleep(miiId = null) {
    const mii = miiId ? miiList.find(m => m.id === miiId) : miiList[currentMiiIndex];
    if (!mii || mii.isDead || mii.isChild) return;

    mii.isSleeping = !mii.isSleeping;
    
    if (mii.isSleeping) {
        if (!miiId) miiMessage.textContent = `${mii.name} is now sleeping 😴.`;
    } else {
        if (!miiId) miiMessage.textContent = `${mii.name} woke up, feeling refreshed.`;
    }

    if (!miiId || mii.id === miiList[currentMiiIndex]?.id) {
        renderCurrentMiiState();
    }
    saveGame();
}

function handleRelationshipEvents(activeMiis, argumentChanceMod) {
    // 1. Child Birth (Only married adults)
    activeMiis.filter(m => m.relationship.status === 'spouse' && !m.isDead && !m.isSleeping && !m.isChild).forEach(parent1 => {
        const parent2 = miiList.find(m => m.id === parent1.relationship.partnerId);

        if (parent2 && !parent2.isDead && parent1.id < parent2.id && parent1.age < 150) { 
            if (Math.random() < CHILD_BIRTH_CHANCE) {
                birthChild(parent1, parent2);
            }
        }
    });

    // 2. Arguments (Dating/Spouse)
    activeMiis.forEach(mii => {
        if (mii.isSleeping || mii.isDead) return;

        if (mii.relationship.status !== 'single') {
             const finalArgChance = ARGUE_CHANCE + argumentChanceMod;
            if (Math.random() < finalArgChance) {
                const partner = miiList.find(m => m.id === mii.relationship.partnerId);
                if (partner && !partner.isDead) {
                    if (mii.happiness > 40 || partner.happiness > 40) { 
                        mii.happiness = Math.max(0, mii.happiness - ARGUE_HAPPINESS_LOSS);
                        partner.happiness = Math.max(0, partner.happiness - ARGUE_HAPPINESS_LOSS);
                        
                        if (mii.id === miiList[currentMiiIndex]?.id || partner.id === miiList[currentMiiIndex]?.id) {
                            miiMessage.textContent = `🚨 ${mii.name} and ${partner.name} had a nasty argument!`;
                        }
                    }
                }
            }
        }
    });
}

function createChildMii(parent1, parent2) {
    const childName = `${parent1.name.split(' ')[0]} Jr.`; 
    const randomGender = Math.random() < 0.5 ? 'male' : 'female';
    const personalities = ['normal', 'stubborn', 'friendly'];
    const personality = personalities[Math.floor(Math.random() * personalities.length)];

    return {
        id: Date.now(), 
        name: childName,
        gender: randomGender, 
        personality: personality,
        happiness: 100,
        hunger: 100,
        energy: 100, 
        isSleeping: false,
        currentRequest: null,
        isDead: false,
        age: CHILD_AGE_START, 
        isChild: true, 
        isIll: false,
        skill: 0,
        job: 'none',
        relationship: {
            status: 'single', 
            partnerId: null,
            loveScore: 0,
            friends: [] 
        }
    };
}

function birthChild(parent1, parent2) {
    const child = createChildMii(parent1, parent2);
    miiList.push(child);

    parent1.happiness = Math.max(0, parent1.happiness - 10);
    parent2.happiness = Math.max(0, parent2.happiness - 10);
    parent1.happiness = Math.min(100, parent1.happiness + 5);
    parent2.happiness = Math.min(100, parent2.happiness + 5);

    miiMessage.textContent = `👶 Congratulations! ${parent1.name} and ${parent2.name} welcomed their new child, ${child.name}!`;
    
    renderMiiSelector();
    renderResidentList();
    saveGame();
}

function generateGoals() {
    gameData.currentGoals = [];
    const possibleGoals = [...GOAL_DEFINITIONS].sort(() => 0.5 - Math.random());
    
    for(let i = 0; i < 3 && i < possibleGoals.length; i++) {
        gameData.currentGoals.push({
            ...possibleGoals[i],
            progress: 0,
            completed: false
        });
    }
    renderGoals();
}

function checkGoals() {
    let allCompleted = true;
    
    gameData.currentGoals.forEach(goal => {
        if (goal.completed) return;

        let currentProgress = 0;
        
        // FIX for Uncaught TypeError: Cannot read properties of undefined (reading 'name')
        if (goal.type === 'aggregate_skill') {
            // Aggregate check for skill total
             currentProgress = miiList.reduce((sum, mii) => sum + mii.skill, 0);
        } else if (goal.type === 'count_match') {
             // Check individual Miis for boolean/count based goals
            currentProgress = miiList.filter(mii => goal.check(mii)).length;
        }

        // Simple completion check
        if (currentProgress >= goal.count) {
            goal.completed = true;
            gameData.money += goal.reward;
            miiMessage.textContent = `🎯 GOAL COMPLETE! Earned 💰${goal.reward} for "${goal.text}"`;
        }
        
        if (!goal.completed) {
            allCompleted = false;
        }
    });
    renderGoals();
}

// --- Save/Load/Reset ---

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
        
        // Load Core Data
        miiList = loaded.miiList || [];
        currentMiiIndex = loaded.currentMiiIndex || 0;
        
        // Load Game Data (with fallback for new properties)
        Object.assign(gameData, loaded.gameData);
        
        // Ensure compatibility with older saves
        miiList.forEach(mii => {
            mii.age = mii.age === undefined ? 18 : mii.age;
            mii.isChild = mii.isChild || false;
            mii.skill = mii.skill || 0;
            mii.job = mii.job || 'none';
            mii.isIll = mii.isIll || false;
            
            if (mii.relationship && mii.relationship.loveScore === undefined) {
                 mii.relationship.loveScore = 0;
            }
        });

        saveMessage.textContent = `Town data loaded. Mode: ${gameData.mode.toUpperCase()}, Difficulty: ${gameData.difficulty.toUpperCase()}.`;
        
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
