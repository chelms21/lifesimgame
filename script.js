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
    townEvents: [], 
    houses: [], // NEW: [{ id: number, occupants: [miiId1, miiId2] }]
    facilities: {} // NEW: { park: true, restaurant: false }
}

let gameLoop = null; 
const SAVE_KEY = 'miiLifeSaveDataV9'; // Updated Save Key
const DECAY_RATE = 2; 
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

// --- NEW Town Structure Constants ---
const HOUSE_COST = 300;
const HOUSE_CAPACITY = 2; // Max Miis per house
const HOMELESS_HAPPINESS_PENALTY = 5;

const FACILITY_COSTS = {
    'park': 500,
    'restaurant': 1000,
    // 'hospital': 1500 // Deferred for next step (Illness)
};
const FACILITY_BONUSES = {
    'park': { happiness: 2, log: 'A beautiful park makes everyone a little happier.', icon: '🌳' },
    'restaurant': { foodQuality: 1.5, log: 'The new restaurant means better food is available!', icon: '🍽️' },
    // 'hospital': { health: 0, log: 'The hospital will help with sickness. (Feature coming soon)', icon: '🏥' }
};
// --- END NEW Town Structure Constants ---

// --- Job Definitions ---
const JOBS = {
    'unemployed': { name: 'Unemployed', basePay: 5, icon: '🛌' },
    'gardener': { name: 'Gardener', basePay: 15, icon: '🌿' },
    'cashier': { name: 'Cashier', basePay: 25, icon: '🛒' },
    'chef': { name: 'Chef', basePay: 40, icon: '🧑‍🍳' },
    'software_dev': { name: 'Software Dev', basePay: 60, icon: '💻' }
};
const BASE_JOB = 'unemployed'; 

// --- Relationship Constants ---
const FRIENDSHIP_SUCCESS_CHANCE = 0.6;
const FRIENDSHIP_HAPPINESS_BONUS = 5;
const DATING_HAPPINESS_BONUS = 15;
const SPOUSE_HAPPINESS_BONUS = 25;
const BREAKUP_HAPPINESS_PENALTY = 40;
const DATING_FAIL_CHANCE = 0.4;
const PROPOSAL_CHANCE = 0.5;

// --- DYNAMIC RELATIONSHIP EVENT CONSTANTS ---
const ARGUE_CHANCE = 0.02;         
const ARGUE_HAPPINESS_LOSS = 20;
const MAKEUP_CHANCE = 0.15;        
const MAKEUP_HAPPINESS_GAIN = 40;
const JEALOUSY_CHANCE = 0.10;      
const JEALOUSY_HAPPINESS_LOSS = 10;
const FRIEND_ARGUE_CHANCE = 0.01;  
const FRIEND_ARGUE_LOSS = 15;

// --- Investment Constants ---
const INVESTMENT_RATE = 100; 
const INVESTMENT_MIN = 10;

// --- Item Definitions ---
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
const genderStat = document.getElementById('gender-stat'); 
const relationshipStat = document.getElementById('relationship-stat'); 
const jobStat = document.getElementById('job-stat'); 
const happinessStat = document.getElementById('happiness-stat');
const hungerStat = document.getElementById('hunger-stat');
const happinessBar = document.getElementById('happiness-bar');
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
const investmentModal = document.getElementById('investment-modal'); 
const investmentTotal = document.getElementById('investment-total'); 
const investmentRate = document.getElementById('investment-rate'); 
const investmentAmountInput = document.getElementById('investment-amount'); 
const residentListDiv = document.getElementById('resident-list'); 
const caretakerStatusSpan = document.getElementById('caretaker-status'); 

// Bank Modal Elements
const bankModal = document.getElementById('bank-modal');
const savingsTotalDisplay = document.getElementById('savings-total');
const savingsDepositInput = document.getElementById('savings-deposit-amount');
const savingsWithdrawInput = document.getElementById('savings-withdraw-amount');
const partyButton = document.getElementById('party-button');
const eventLogContainer = document.getElementById('event-log-container'); 

// Relationship Modal Elements
const relationshipModal = document.getElementById('relationship-modal');
const relFriendsUl = document.getElementById('rel-friends-ul');

// Job Modal Elements 
const jobModal = document.getElementById('job-modal');
const jobMiiName = document.getElementById('job-mii-name');
const jobCurrentJob = document.getElementById('job-current-job');
const jobListDiv = document.getElementById('job-list');

// Build Modal Elements // NEW
const buildModal = document.getElementById('build-modal');
const buildMoney = document.getElementById('build-money');
const houseCapacitySpan = document.getElementById('house-capacity');
const miiCountHousingSpan = document.getElementById('mii-count-housing');
const homelessCountSpan = document.getElementById('homeless-count');
const facilityListDiv = document.getElementById('facility-list');


// --- CORE RENDERING FUNCTIONS ---

function renderMoney() {
    moneyStat.textContent = gameData.money;
}

const MAX_EVENTS_DISPLAY = 5; 

function logEvent(message) {
    gameData.townEvents.push({ timestamp: Date.now(), message: message });
    if (gameData.townEvents.length > 20) {
        gameData.townEvents.shift(); 
    }
    renderEvents();
    saveGame(); 
}

function renderEvents() {
    if (!eventLogContainer) return; 
    eventLogContainer.innerHTML = '';
    
    if (gameData.townEvents.length === 0) {
        eventLogContainer.innerHTML = '<p class="event-message">No events yet. Start the town!</p>';
        return;
    }
    
    const eventsToDisplay = gameData.townEvents.slice(-MAX_EVENTS_DISPLAY);

    eventsToDisplay.forEach(event => {
        const eventElement = document.createElement('p');
        eventElement.className = 'event-message';
        const date = new Date(event.timestamp);
        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        eventElement.textContent = `[${timeString}] ${event.message}`;
        eventLogContainer.appendChild(eventElement);
    });
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

function getHouseStatus(mii) {
    if (mii.houseId) {
        const house = gameData.houses.find(h => h.id === mii.houseId);
        if (house) {
            return `🏠 House ${mii.houseId} (${house.occupants.length}/${HOUSE_CAPACITY})`;
        }
    }
    return `⚠️ Homeless`;
}

function renderCurrentMiiState() {
    const mii = miiList[currentMiiIndex];

    if (!mii) {
        miiNameDisplay.textContent = "No Active Resident";
        [happinessStat, hungerStat, personalityStat, genderStat, relationshipStat, jobStat].forEach(el => el.textContent = '---');
        [happinessBar, hungerBar].forEach(bar => bar.style.width = '0%');
        requestBox.classList.add('hidden');
        miiAvatar.classList.remove('sad', 'starving', 'sleeping');
        return;
    }
    
    // Update Mii Card Details
    const partner = mii.relationship.partnerId ? miiList.find(m => m.id === mii.relationship.partnerId) : null;
    const job = JOBS[mii.job] || JOBS[BASE_JOB]; 

    miiNameDisplay.textContent = mii.name;
    genderStat.textContent = mii.gender === 'male' ? 'Male ♂️' : 'Female ♀️'; 
    personalityStat.textContent = mii.personality.charAt(0).toUpperCase() + mii.personality.slice(1);
    jobStat.textContent = `${job.icon} ${job.name} (💰${job.basePay}/hr)`; 
    
    // Update Relationship Status Display
    let statusText = 'Single';
    if (mii.relationship.status === 'dating') {
        statusText = `Dating ${partner ? partner.name : 'Unknown'} ❤️`;
    } else if (mii.relationship.status === 'spouse') {
        statusText = `Spouse of ${partner ? partner.name : 'Unknown'} 💍`;
    }
    relationshipStat.textContent = statusText;
    
    // NEW: Display Housing Status
    document.getElementById('housing-stat').textContent = getHouseStatus(mii);

    happinessStat.textContent = Math.round(mii.happiness);
    hungerStat.textContent = Math.round(mii.hunger);

    happinessBar.style.width = `${mii.happiness}%`;
    hungerBar.style.width = `${mii.hunger}%`;

    // --- Visuals and Messages ---
    miiAvatar.classList.remove('sad', 'starving', 'sleeping');
    happinessBar.classList.remove('low');
    hungerBar.classList.remove('low');
    
    updateSleepStateVisuals(mii); 
    
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
    
    // Prioritize the homeless message
    if (!mii.houseId) {
        miiMessage.textContent = `${mii.name} is homeless and very sad! Build a house immediately.`;
        miiAvatar.classList.add('sad');
        happinessBar.classList.add('low');
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


// --- Initialization and Screen Management ---

function initGame() {
    const savedData = localStorage.getItem(SAVE_KEY);
    if (savedData) {
        loadGame(savedData);
        showGameScreen();
    } else {
        // Automatically build the first house when starting a new town
        gameData.houses.push({ id: 1, occupants: [] });
        logEvent(`The town started with one apartment building (House 1)!`);
        showCreationScreen();
    }
}

function showCreationScreen() {
    creationScreen.classList.remove('hidden');
    gameScreen.classList.add('hidden');
    // Hide all modals
    [newMiiModal, investmentModal, relationshipModal, bankModal, jobModal, buildModal].forEach(m => m.classList.add('hidden'));
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
            logEvent("👑 Easy Mode Activated: Caretaker unlocked and starting funds boosted!");
        }

        currentMiiIndex = 0; 
        showGameScreen();
    }
}

function showGameScreen() {
    // Hide all modals
    [creationScreen, newMiiModal, investmentModal, relationshipModal, bankModal, jobModal, buildModal].forEach(m => m.classList.add('hidden'));
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
    renderEvents(); 
}

// --- Mii Creation/Management ---

function assignMiiToHouse(mii) {
    // Try to find a house with space
    const availableHouse = gameData.houses.find(h => h.occupants.length < HOUSE_CAPACITY);
    
    if (availableHouse) {
        mii.houseId = availableHouse.id;
        availableHouse.occupants.push(mii.id);
        return true;
    }
    
    // If no house found, mii remains homeless
    mii.houseId = null; 
    return false;
}

function unassignMiiFromHouse(mii) {
     if (mii.houseId) {
        const house = gameData.houses.find(h => h.id === mii.houseId);
        if (house) {
            // Remove Mii ID from the house's occupant list
            house.occupants = house.occupants.filter(id => id !== mii.id);
        }
        mii.houseId = null;
    }
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

    const newMii = {
        id: Date.now(), 
        name: name,
        gender: gender, 
        personality: personality,
        happiness: 100,
        hunger: 100,
        isSleeping: false,
        currentRequest: null,
        isDead: false,
        relationship: {
            status: 'single', 
            partnerId: null,
            friends: [] 
        },
        job: BASE_JOB,
        houseId: null // NEW
    };
    
    miiList.push(newMii);
    
    // NEW: Assign house on creation
    assignMiiToHouse(newMii);
    
    nameInput.value = '';
    
    updateCreationScreenState();
    logEvent(`${name} has moved into the apartment! (House: ${newMii.houseId || 'None'})`); 
}

function openNewMiiCreation() {
    newMiiModal.classList.remove('hidden');
    document.getElementById('new-mii-name-input').value = '';
}

function closeNewMiiModal() {
    newMiiModal.classList.add('hidden');
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

    const newMii = {
        id: Date.now(), 
        name: name,
        gender: gender, 
        personality: personality,
        happiness: 100,
        hunger: 100,
        isSleeping: false,
        currentRequest: null,
        isDead: false,
        relationship: {
            status: 'single', 
            partnerId: null,
            friends: [] 
        },
        job: BASE_JOB, 
        houseId: null // NEW
    };
    
    miiList.push(newMii);
    
    // NEW: Assign house on creation
    assignMiiToHouse(newMii);

    closeNewMiiModal();
    renderMiiSelector(); 
    renderResidentList();
    logEvent(`👶 New Resident: ${name} has joined the town! (House: ${newMii.houseId || 'None'})`); 
    saveGame();
}

function renderMiiSelector() {
    miiSelector.innerHTML = '';
    miiList.forEach((mii, index) => {
        if (!mii.isDead) {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = mii.name;
            if (index === currentMiiIndex) {
                option.selected = true;
            }
            miiSelector.appendChild(option);
        }
    });
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

// --- Resident List Rendering ---

function renderResidentList() {
    residentListDiv.innerHTML = '';
    const activeMiis = miiList.filter(m => !m.isDead);

    if (activeMiis.length === 0) {
        residentListDiv.innerHTML = '<p>No active residents. Start a new Mii!</p>';
        return;
    }

    activeMiis.forEach(mii => {
        const originalIndex = miiList.findIndex(m => m.id === mii.id); 
        
        const card = document.createElement('div');
        card.className = 'resident-mini-card';
        
        let statusIcon = mii.gender === 'male' ? '♂️' : '♀️';
        let statusClass = '';

        if (!mii.houseId) { // NEW: Homeless status takes priority
            statusIcon = '🚨';
            statusClass = 'homeless';
        } else if (mii.relationship.status !== 'single') {
            statusIcon = mii.relationship.status === 'dating' ? '❤️' : '💍';
        } else if (mii.isSleeping) {
            statusIcon = '😴';
            statusClass = 'asleep';
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
            <p>${Math.round(mii.happiness)}❤️ ${Math.round(mii.hunger)}🍔</p>
        `;
        residentListDiv.appendChild(card);
    });
}

// --- Caretaker Status ---

function renderCaretakerStatus() {
    if (gameData.isCaretakerActive) {
        caretakerStatusSpan.textContent = "ACTIVE";
        caretakerStatusSpan.classList.add('active');
        caretakerStatusSpan.classList.remove('inactive');
    } else {
        caretakerStatusSpan.textContent = `INACTIVE (Click to buy for 💰${CARETAKER_PURCHASE_PRICE})`;
        caretakerStatusSpan.classList.add('inactive');
        caretakerStatusSpan.classList.remove('active');
        caretakerStatusSpan.onclick = buyCaretaker;
    }
}

function buyCaretaker() {
    if (gameData.money >= CARETAKER_PURCHASE_PRICE) {
        gameData.money -= CARETAKER_PURCHASE_PRICE;
        gameData.isCaretakerActive = true;
        logEvent(`🤖 Caretaker System unlocked for 💰${CARETAKER_PURCHASE_PRICE}!`);
        renderMoney();
        renderCaretakerStatus();
        saveGame();
    } else {
        alert(`You need 💰${CARETAKER_PURCHASE_PRICE} to hire the Caretaker!`);
    }
}

// --- Job Management System --- 

function openJobModal() {
    const mii = miiList[currentMiiIndex];
    if (!mii) return;

    jobMiiName.textContent = mii.name;
    jobCurrentJob.textContent = JOBS[mii.job].name;
    jobListDiv.innerHTML = '';
    
    for (const jobKey in JOBS) {
        const job = JOBS[jobKey];
        const isCurrent = mii.job === jobKey;
        
        const card = document.createElement('div');
        card.className = `item-slot ${isCurrent ? 'selected-job' : ''}`;
        
        card.innerHTML = `
            <h4>${job.icon} ${job.name}</h4>
            <p>Pay: 💰${job.basePay}/hr</p>
        `;
        
        if (!isCurrent) {
            card.setAttribute('onclick', `assignJob('${jobKey}')`);
        } else {
            card.style.cursor = 'default';
        }
        
        jobListDiv.appendChild(card);
    }
    
    jobModal.classList.remove('hidden');
}

function closeJobModal() {
    jobModal.classList.add('hidden');
}

function assignJob(jobKey) {
    const mii = miiList[currentMiiIndex];
    if (!mii || mii.isDead) return;

    const oldJob = JOBS[mii.job].name;
    const newJob = JOBS[jobKey].name;

    mii.job = jobKey;
    logEvent(`💼 Career Change: ${mii.name} switched from ${oldJob} to ${newJob}!`);
    renderCurrentMiiState();
    openJobModal(); 
    saveGame();
}

// --- NEW: Build Management System (Houses & Facilities) ---

function openBuildModal() {
    buildModal.classList.remove('hidden');
    renderBuildModal();
}

function closeBuildModal() {
    buildModal.classList.add('hidden');
}

function renderBuildModal() {
    buildMoney.textContent = gameData.money;
    
    // Housing Stats
    const totalCapacity = gameData.houses.length * HOUSE_CAPACITY;
    const totalMiis = miiList.filter(m => !m.isDead).length;
    const homelessMiis = miiList.filter(m => !m.isDead && !m.houseId).length;

    houseCapacitySpan.textContent = `${gameData.houses.length} houses (${totalCapacity} slots)`;
    miiCountHousingSpan.textContent = totalMiis;
    homelessCountSpan.textContent = homelessMiis;
    
    // Facility List
    facilityListDiv.innerHTML = '';
    
    for (const key in FACILITY_COSTS) {
        const cost = FACILITY_COSTS[key];
        const info = FACILITY_BONUSES[key];
        const isBuilt = gameData.facilities[key];
        
        const card = document.createElement('div');
        card.className = `item-slot facility-card ${isBuilt ? 'built' : ''}`;
        
        card.innerHTML = `
            <h4>${info.icon} ${key.charAt(0).toUpperCase() + key.slice(1)}</h4>
            <p>${isBuilt ? 'Status: BUILT' : `Cost: 💰${cost}`}</p>
            <small>${info.log.split('.')[0]}.</small>
        `;
        
        if (!isBuilt) {
            card.setAttribute('onclick', `buildFacility('${key}', ${cost})`);
            card.style.cursor = 'pointer';
        } else {
            card.style.cursor = 'default';
        }
        
        facilityListDiv.appendChild(card);
    }
}

function buildHouse() {
    if (gameData.money < HOUSE_COST) {
        alert(`You need 💰${HOUSE_COST} to build a new house.`);
        return;
    }
    
    gameData.money -= HOUSE_COST;
    
    const newHouseId = gameData.houses.length + 1;
    gameData.houses.push({
        id: newHouseId,
        occupants: []
    });
    
    logEvent(`🏡 Construction: A new house (House ${newHouseId}) was built for 💰${HOUSE_COST}!`);
    
    // Attempt to move one homeless Mii in
    const homelessMii = miiList.find(m => !m.isDead && !m.houseId);
    if (homelessMii) {
        assignMiiToHouse(homelessMii);
        logEvent(`📦 Moving Day: ${homelessMii.name} moved into the new house!`);
    }

    renderMoney();
    renderBuildModal();
    renderCurrentMiiState();
    renderResidentList();
    saveGame();
}

function buildFacility(key, cost) {
    if (gameData.facilities[key]) return; // Already built
    
    if (gameData.money < cost) {
        alert(`You need 💰${cost} to build the ${key}.`);
        return;
    }
    
    gameData.money -= cost;
    gameData.facilities[key] = true;
    
    const info = FACILITY_BONUSES[key];
    logEvent(`🏗️ Facility Built: The ${key.toUpperCase()} was built for 💰${cost}! ${info.log}`);
    
    renderMoney();
    renderBuildModal();
    saveGame();
}

// --- Relationship System ---

function openRelationshipModal() {
    const mii = miiList[currentMiiIndex];
    if (!mii) return;

    document.getElementById('rel-mii-name').textContent = mii.name;
    document.getElementById('rel-status').textContent = mii.relationship.status.toUpperCase();
    
    renderRelationshipActions(mii);
    renderFriendList(mii);
    
    relationshipModal.classList.remove('hidden');
}

function closeRelationshipModal() {
    relationshipModal.classList.add('hidden');
}

function renderRelationshipActions(mii) {
    const relActionsDiv = document.getElementById('rel-actions');
    relActionsDiv.innerHTML = '';
    
    const potentialPartners = miiList.filter(
        m => m.id !== mii.id && 
             !m.isDead &&
             m.relationship.status === 'single' &&
             m.gender !== mii.gender
    );
    
    if (mii.relationship.status === 'single') {
        // Dating Actions
        if (potentialPartners.length > 0) {
            const select = document.createElement('select');
            select.id = 'date-target-select';
            
            const defaultOption = document.createElement('option');
            defaultOption.textContent = "Select Mii to Ask Out";
            defaultOption.value = "";
            select.appendChild(defaultOption);
            
            potentialPartners.forEach(p => {
                const option = document.createElement('option');
                option.value = p.id;
                option.textContent = p.name;
                select.appendChild(option);
            });
            
            const button = document.createElement('button');
            button.textContent = "Ask to Date ❤️";
            button.onclick = () => {
                const targetId = document.getElementById('date-target-select').value;
                if (targetId) attemptDating(targetId);
            };

            relActionsDiv.appendChild(select);
            relActionsDiv.appendChild(button);

        } else {
            relActionsDiv.innerHTML = '<p>No available Miis to ask out right now.</p>';
        }
        
    } else if (mii.relationship.status === 'dating') {
        // Proposal/Breakup Actions (Dating)
        const partner = miiList.find(m => m.id === mii.relationship.partnerId);
        
        relActionsDiv.innerHTML = `
            <p>Dating: ${partner ? partner.name : 'Unknown Mii'}</p>
            <button class="propose" onclick="attemptProposal(${partner.id})">Propose Marriage 💍</button>
            <button onclick="attemptBreakup(${partner.id})">Break Up 💔</button>
        `;
        
    } else if (mii.relationship.status === 'spouse') {
        // Breakup Actions (Spouse)
        const partner = miiList.find(m => m.id === mii.relationship.partnerId);
        
        relActionsDiv.innerHTML = `
            <p>Married to: ${partner ? partner.name : 'Unknown Mii'} 💍</p>
            <button onclick="attemptBreakup(${partner.id})">Divorce 💔 (Major Happiness Loss!)</button>
        `;
    }
    
    // Friendship Section
    const potentialFriends = miiList.filter(
        m => m.id !== mii.id && 
             !mii.relationship.friends.includes(m.id) &&
             !m.isDead
    );
    
    if (potentialFriends.length > 0) {
        const friendSelect = document.createElement('select');
        friendSelect.id = 'friend-target-select';
        
        const defaultOption = document.createElement('option');
        defaultOption.textContent = "Select Mii to Befriend";
        defaultOption.value = "";
        friendSelect.appendChild(defaultOption);
        
        potentialFriends.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = p.name;
            friendSelect.appendChild(option);
        });
        
        const friendButton = document.createElement('button');
        friendButton.textContent = "Ask to Be Friends 🤝";
        friendButton.onclick = () => {
            const targetId = document.getElementById('friend-target-select').value;
            if (targetId) attemptFriendship(targetId);
        };
        
        relActionsDiv.appendChild(document.createElement('hr'));
        relActionsDiv.appendChild(friendSelect);
        relActionsDiv.appendChild(friendButton);

    }
}

function renderFriendList(mii) {
    relFriendsUl.innerHTML = '';
    
    if (mii.relationship.friends.length === 0) {
        relFriendsUl.innerHTML = '<li>No friends yet.</li>';
        return;
    }
    
    mii.relationship.friends.forEach(friendId => {
        const friend = miiList.find(m => m.id === friendId);
        if (friend && !friend.isDead) {
            const li = document.createElement('li');
            let icon = '🤝';
            if (mii.relationship.partnerId === friendId) {
                icon = mii.relationship.status === 'spouse' ? '💍' : '❤️';
            }
            li.textContent = `${icon} ${friend.name} (${friend.gender === 'male' ? '♂️' : '♀️'})`;
            relFriendsUl.appendChild(li);
        }
    });
}

function attemptFriendship(targetId) {
    const mii = miiList[currentMiiIndex];
    const target = miiList.find(m => m.id === parseInt(targetId)); 

    if (!mii || !target) return;

    if (Math.random() < FRIENDSHIP_SUCCESS_CHANCE) {
        // Success
        mii.relationship.friends.push(target.id);
        target.relationship.friends.push(mii.id);
        
        mii.happiness = Math.min(100, mii.happiness + FRIENDSHIP_HAPPINESS_BONUS);
        target.happiness = Math.min(100, target.happiness + FRIENDSHIP_HAPPINESS_BONUS);
        
        logEvent(`🤝 Friendship: ${mii.name} and ${target.name} are now friends!`);
    } else {
        // Failure
        mii.happiness = Math.max(0, mii.happiness - 5);
        logEvent(`😔 ${mii.name}'s attempt to befriend ${target.name} failed.`);
    }
    
    renderCurrentMiiState();
    openRelationshipModal();
    saveGame();
}

function attemptDating(targetId) {
    const mii = miiList[currentMiiIndex];
    const target = miiList.find(m => m.id === parseInt(targetId)); 

    if (!mii || !target || mii.relationship.status !== 'single' || target.relationship.status !== 'single' || mii.gender === target.gender) {
        miiMessage.textContent = "Cannot attempt dating. Check status and gender requirements.";
        return;
    }

    const happinessFactor = (mii.happiness + target.happiness) / 200;
    const successChance = (1 - DATING_FAIL_CHANCE) * happinessFactor;

    if (Math.random() < successChance) {
        // Success
        mii.relationship.status = 'dating';
        mii.relationship.partnerId = target.id;
        target.relationship.status = 'dating';
        target.relationship.partnerId = mii.id;

        mii.happiness = Math.min(100, mii.happiness + DATING_HAPPINESS_BONUS);
        target.happiness = Math.min(100, target.happiness + DATING_HAPPINESS_BONUS);
        
        // NEW: Try to move target into Mii's house, or find a new house
        if (mii.houseId) {
            unassignMiiFromHouse(target); // Ensure they leave their old home if they had one
            assignMiiToHouse(target); // Try to move into Mii's house (will only work if Mii's house is not full)
            if (target.houseId !== mii.houseId) {
                 logEvent(`❤️ ${mii.name} and ${target.name} are dating, but there was no room to move in!`);
            } else {
                 logEvent(`❤️ ${mii.name} and ${target.name} are now dating and moved in together!`); 
            }
        } else {
             // If mii is homeless, they both become homeless or move to an empty house.
             unassignMiiFromHouse(mii); 
             unassignMiiFromHouse(target);
             const emptyHouse = gameData.houses.find(h => h.occupants.length === 0);
             if (emptyHouse) {
                 assignMiiToHouse(mii);
                 assignMiiToHouse(target);
                 logEvent(`❤️ ${mii.name} and ${target.name} are dating and moved into an empty house!`);
             } else {
                 logEvent(`❤️ ${mii.name} and ${target.name} are dating but are now homeless!`);
             }
        }
        
    } else {
        // Failure
        mii.happiness = Math.max(0, mii.happiness - 15);
        miiMessage.textContent = `💔 ${target.name} gently let ${mii.name} down. Ouch.`;
        logEvent(`💔 ${mii.name} was rejected by ${target.name}.`); 
    }
    
    renderCurrentMiiState();
    openRelationshipModal();
    saveGame();
}

function attemptBreakup(partnerId) {
    const mii = miiList[currentMiiIndex];
    const partner = miiList.find(m => m.id === parseInt(partnerId)); 
    
    if (!mii || !partner || mii.relationship.partnerId !== partner.id) return;
    
    if (confirm(`Are you sure ${mii.name} wants to break up with ${partner.name}? This will cause sadness!`)) {
        
        // Find which house the partner is leaving
        const oldHouseId = partner.houseId;

        // Clear Mii's status (Mii stays in the house for now)
        mii.relationship.status = 'single';
        mii.relationship.partnerId = null;
        mii.happiness = Math.max(0, mii.happiness - BREAKUP_HAPPINESS_PENALTY);
        
        // Clear Partner's status
        partner.relationship.status = 'single';
        partner.relationship.partnerId = null;
        partner.happiness = Math.max(0, partner.happiness - BREAKUP_HAPPINESS_PENALTY);
        
        // NEW: Partner leaves the house
        unassignMiiFromHouse(partner);
        
        // Try to re-assign partner to another available house
        assignMiiToHouse(partner);

        logEvent(`😭 ${mii.name} and ${partner.name} broke up! ${partner.name} moved out (House: ${partner.houseId || 'None'}).`); 
    }

    renderCurrentMiiState();
    openRelationshipModal();
    saveGame();
}

function attemptProposal(partnerId) {
    const mii = miiList[currentMiiIndex];
    const partner = miiList.find(m => m.id === parseInt(partnerId)); 

    if (!mii || !partner) {
        miiMessage.textContent = "Error: Mii or partner not found for proposal.";
        return;
    }

    if (mii.relationship.status !== 'dating') {
        miiMessage.textContent = "Only dating Miis can propose marriage.";
        return;
    }

    const successChance = (mii.happiness + partner.happiness) / 200 * PROPOSAL_CHANCE;

    if (Math.random() < successChance) {
        // Success
        mii.relationship.status = 'spouse';
        partner.relationship.status = 'spouse';
        mii.happiness = Math.min(100, mii.happiness + SPOUSE_HAPPINESS_BONUS);
        partner.happiness = Math.min(100, partner.happiness + SPOUSE_HAPPINESS_BONUS);
        
        // NEW: Ensure they are in the same house (redundant if dating, but good for stability)
        if (mii.houseId && partner.houseId !== mii.houseId) {
            unassignMiiFromHouse(partner);
            assignMiiToHouse(partner); // Try to move partner back in
        }

        logEvent(`🔔 ${partner.name} said YES! ${mii.name} and ${partner.name} are now happily married! 💍`); 
    } else {
        mii.happiness = Math.max(0, mii.happiness - 20);
        miiMessage.textContent = `😔 ${partner.name} needs more time before marriage.`;
    }

    renderCurrentMiiState();
    openRelationshipModal();
    saveGame();
}

// --- Main Game Loop Functions ---

function updateAllMiiStats() {
    // 1. Check for passive income
    gameData.money += Math.floor(gameData.investmentTotal / INVESTMENT_RATE);

    // 2. Savings interest
    gameData.savingsTotal = Math.floor(gameData.savingsTotal * (1 + SAVINGS_INTEREST_RATE));

    const activeMiis = miiList.filter(m => !m.isDead);

    // 3. Handle Caretaker if active
    if (gameData.isCaretakerActive) {
        handleCaretaker(activeMiis);
    }
    
    // 4. Handle autonomous Mii events (if in automatic mode)
    if (gameData.mode === 'automatic') {
        handleAutonomousActions(activeMiis);
    }

    // 5. Handle decay and death
    activeMiis.forEach(mii => {
        let happinessDecay = DECAY_RATE;
        let hungerDecay = DECAY_RATE;

        if (mii.isSleeping) {
            // Regeneration when sleeping
            mii.happiness = Math.min(100, mii.happiness + 3);
            mii.hunger = Math.max(0, mii.hunger - 1); // small hunger decay even when sleeping
            return; 
        }

        // --- NEW: Decay Modifiers ---
        
        // A. Homeless Penalty
        if (!mii.houseId) {
            happinessDecay += HOMELESS_HAPPINESS_PENALTY;
        }

        // B. Apply Facility Bonuses
        if (gameData.facilities.park) {
            happinessDecay -= FACILITY_BONUSES.park.happiness;
        }

        // C. Standard Decay Modifiers
        if (mii.hunger < 50) {
            happinessDecay += 2; // Sadder when hungry
        }

        if (mii.relationship.status === 'dating') {
            happinessDecay -= 1; // Happier when dating
        } else if (mii.relationship.status === 'spouse') {
            happinessDecay -= 2; // Even happier when married
        }
        
        if (mii.job === BASE_JOB) {
            happinessDecay += 1; // Unemployed Miis decay faster
        }
        // --- END NEW: Decay Modifiers ---


        mii.hunger = Math.max(0, mii.hunger - hungerDecay);
        mii.happiness = Math.max(0, mii.happiness - happinessDecay);

        // Request Generation & Decay
        if (!mii.currentRequest && Math.random() < REQUEST_CHANCE && mii.happiness < 70) {
            mii.currentRequest = REQUESTABLE_ITEMS[Math.floor(Math.random() * REQUESTABLE_ITEMS.length)];
        }
        if (mii.currentRequest) {
            mii.happiness = Math.max(0, mii.happiness - 1);
        }

        // Check for Game Over (Death)
        if (mii.happiness <= 0 && !mii.isDead) {
            mii.isDead = true;
            // NEW: Unassign house on death
            unassignMiiFromHouse(mii);

            if (mii.id === miiList[currentMiiIndex]?.id) {
                miiMessage.textContent = `💔 Oh no! ${mii.name} has passed away due to extreme sadness.`;
            }
            logEvent(`💀 Death: ${mii.name} has passed away due to extreme sadness.`); 

            // Partner grief: Break relationship and heavily penalize happiness
            if (mii.relationship.partnerId) {
                const partner = miiList.find(m => m.id === mii.relationship.partnerId);
                if (partner) {
                    partner.relationship.status = 'single';
                    partner.relationship.partnerId = null;
                    partner.happiness = Math.max(0, partner.happiness - 60);
                    logEvent(`😔 Grief: ${partner.name} is deeply saddened by the passing of ${mii.name}.`); 
                }
            }
        }
    });

    // 6. Handle Relationship Events (Arguments, Make-ups)
    handleRelationshipEvents(activeMiis);

    renderMoney();
    renderCurrentMiiState();
    renderMiiSelector();
    renderResidentList();
    renderEvents(); 
    checkIfTownIsOver();
    saveGame();
}

// --- Dynamic Relationship Event Handlers ---

function handleRelationshipEvents(activeMiis) {
    activeMiis.forEach(mii => {
        if (mii.relationship.partnerId) {
            const partner = activeMiis.find(m => m.id === mii.relationship.partnerId);
            if (!partner) return;

            // Argument Check
            if (Math.random() < ARGUE_CHANCE) {
                mii.happiness = Math.max(0, mii.happiness - ARGUE_HAPPINESS_LOSS);
                partner.happiness = Math.max(0, partner.happiness - ARGUE_HAPPINESS_LOSS);
                logEvent(`💥 Argument: ${mii.name} and ${partner.name} had a huge fight!`);
            } 
            
            // Make-up Check (only if happiness is low)
            else if ((mii.happiness < 50 || partner.happiness < 50) && Math.random() < MAKEUP_CHANCE) {
                mii.happiness = Math.min(100, mii.happiness + MAKEUP_HAPPINESS_GAIN);
                partner.happiness = Math.min(100, partner.happiness + MAKEUP_HAPPINESS_GAIN);
                logEvent(`🤗 Make-up: ${mii.name} and ${partner.name} made up after a tough time!`);
            }

            // Jealousy Check (only for dating/married couples who have friends)
            if (mii.relationship.friends.length > 0 && Math.random() < JEALOUSY_CHANCE) {
                const friendId = mii.relationship.friends[Math.floor(Math.random() * mii.relationship.friends.length)];
                if (friendId !== partner.id) {
                     // Minor jealousy loss
                    partner.happiness = Math.max(0, partner.happiness - JEALOUSY_HAPPINESS_LOSS);
                    logEvent(`😬 Jealousy: ${partner.name} got jealous of ${mii.name}'s relationship with a friend.`);
                }
            }
        }
        
        // Friend Arguments
        mii.relationship.friends.forEach(friendId => {
            const friend = activeMiis.find(m => m.id === friendId);
            if (friend && Math.random() < FRIEND_ARGUE_CHANCE) {
                // Ensure they are friends, not just acquaintances or partners
                if (friend.relationship.friends.includes(mii.id)) {
                    // Argument happens
                    mii.happiness = Math.max(0, mii.happiness - FRIEND_ARGUE_LOSS);
                    friend.happiness = Math.max(0, friend.happiness - FRIEND_ARGUE_LOSS);
                    
                    // Break friendship
                    mii.relationship.friends = mii.relationship.friends.filter(id => id !== friendId);
                    friend.relationship.friends = friend.relationship.friends.filter(id => id !== mii.id);

                    logEvent(`😤 Friend Fight: ${mii.name} and ${friend.name} had a falling out and broke their friendship.`);
                }
            }
        });

    });
}

function handleCaretaker(activeMiis) {
    activeMiis.forEach(mii => {
        if (mii.isDead) return;
        
        // 1. Manage Requests
        if (mii.currentRequest && gameData.inventory[mii.currentRequest] && mii.happiness < CARETAKER_THRESHOLD) {
            useItem(mii.currentRequest, mii, true);
        }
        
        // 2. Manage Hunger
        if (mii.hunger < CARETAKER_THRESHOLD) {
            if (gameData.inventory[CARETAKER_FOOD]) {
                useItem(CARETAKER_FOOD, mii, true);
            }
        }
        
        // 3. Manage Happiness (only if hunger is ok)
        if (mii.hunger > CARETAKER_THRESHOLD && mii.happiness < CARETAKER_THRESHOLD) {
            if (gameData.inventory[CARETAKER_MOOD]) {
                useItem(CARETAKER_MOOD, mii, true);
            }
        }
        
        // 4. Manage Sleep
        if (mii.happiness < 40 && mii.hunger > 60 && !mii.isSleeping && Math.random() < 0.1) {
            mii.isSleeping = true;
            logEvent(`💤 Caretaker put ${mii.name} to sleep to rest.`);
        }
        
        // 5. Manage Wake Up
        if (mii.isSleeping && mii.happiness >= 90) {
            mii.isSleeping = false;
            logEvent(`☀️ Caretaker woke ${mii.name} up after a good rest.`);
        }
    });
}

function handleAutonomousActions(activeMiis) {
    activeMiis.forEach(mii => {
        if (mii.isDead || mii.isSleeping) return;

        // Autonomous Work
        if (mii.job !== BASE_JOB && Math.random() < AUTOMATIC_WORK_CHANCE) {
            workForMoney(mii);
        }

        // Autonomous Dating
        if (mii.relationship.status === 'single' && Math.random() < AUTOMATIC_DATING_CHANCE) {
            const potentialPartner = activeMiis.find(
                m => m.id !== mii.id && 
                     !m.isDead &&
                     m.relationship.status === 'single' &&
                     m.gender !== mii.gender &&
                     m.happiness > 50 
            );
            if (potentialPartner) {
                // To keep the function DRY, we replicate the dating logic here slightly simpler
                if (Math.random() < 0.5) { 
                    mii.relationship.status = 'dating';
                    mii.relationship.partnerId = potentialPartner.id;
                    potentialPartner.relationship.status = 'dating';
                    potentialPartner.relationship.partnerId = mii.id;
                    mii.happiness = Math.min(100, mii.happiness + DATING_HAPPINESS_BONUS);
                    potentialPartner.happiness = Math.min(100, potentialPartner.happiness + DATING_HAPPINESS_BONUS);
                    
                    // NEW: Autonomous House Assignment
                    if (mii.houseId) {
                         unassignMiiFromHouse(potentialPartner);
                         assignMiiToHouse(potentialPartner);
                    }
                    
                    logEvent(`❤️ Auto-Love: ${mii.name} and ${potentialPartner.name} started dating!`);
                } else {
                    mii.happiness = Math.max(0, mii.happiness - 10);
                    logEvent(`💔 Auto-Rejection: ${mii.name} was rejected by ${potentialPartner.name}.`);
                }
            }
        }
    });
}

function checkIfTownIsOver() {
    const activeMiis = miiList.filter(m => !m.isDead);
    if (activeMiis.length === 0 && miiList.length > 0) {
        if (confirm("🚨 TOWN FAILURE! All Miis have passed away. Do you want to reset the game?")) {
            resetGame();
        } else {
            // Keep the town loaded in the failed state
        }
    }
}


// --- Investment System ---

function openInvestmentModal() {
    investmentModal.classList.remove('hidden');
    renderInvestmentModal();
}

function closeInvestmentModal() {
    investmentModal.classList.add('hidden');
}

function renderInvestmentModal() {
    document.getElementById('investment-money').textContent = gameData.money;
    investmentTotal.textContent = gameData.investmentTotal;
    investmentRate.textContent = Math.floor(gameData.investmentTotal / INVESTMENT_RATE);
    investmentAmountInput.value = INVESTMENT_MIN;
}

function makeInvestment() {
    const amount = parseInt(investmentAmountInput.value);
    
    if (isNaN(amount) || amount < INVESTMENT_MIN) {
        alert(`Investment must be at least 💰${INVESTMENT_MIN}.`);
        return;
    }

    if (gameData.money < amount) {
        alert("You don't have enough money for that investment!");
        return;
    }

    gameData.money -= amount;
    gameData.investmentTotal += amount;
    
    logEvent(`📈 Investment: 💰${amount} was added to the fund!`);

    renderMoney();
    renderInvestmentModal();
    saveGame();
}

// --- Bank Savings System ---

function openBankModal() {
    bankModal.classList.remove('hidden');
    renderBankModal();
}

function closeBankModal() {
    bankModal.classList.add('hidden');
}

function renderBankModal() {
    document.getElementById('bank-current-money').textContent = gameData.money;
    savingsTotalDisplay.textContent = gameData.savingsTotal;
    savingsDepositInput.value = 10;
    savingsWithdrawInput.value = 10;
}

function depositSavings() {
    const amount = parseInt(savingsDepositInput.value);
    
    if (isNaN(amount) || amount < 1) {
        alert("Deposit amount must be at least 💰1.");
        return;
    }

    if (gameData.money < amount) {
        alert("You don't have enough money to deposit that amount!");
        return;
    }

    gameData.money -= amount;
    gameData.savingsTotal += amount;
    
    logEvent(`🏦 Deposit: 💰${amount} was moved to savings.`);

    renderMoney();
    renderBankModal();
    saveGame();
}

function withdrawSavings() {
    const amount = parseInt(savingsWithdrawInput.value);
    
    if (isNaN(amount) || amount < 1) {
        alert("Withdrawal amount must be at least 💰1.");
        return;
    }

    if (gameData.savingsTotal < amount) {
        alert("You don't have enough in savings to withdraw that amount!");
        return;
    }

    gameData.savingsTotal -= amount;
    gameData.money += amount;
    
    logEvent(`🏦 Withdrawal: 💰${amount} was withdrawn from savings.`);

    renderMoney();
    renderBankModal();
    saveGame();
}

// --- Town Actions ---

function throwParty() {
    if (gameData.money < PARTY_COST) {
        alert(`A town party costs 💰${PARTY_COST}!`);
        return;
    }
    
    gameData.money -= PARTY_COST;
    logEvent(`🎉 Party! The town threw a massive party for 💰${PARTY_COST}!`);

    miiList.forEach(mii => {
        if (!mii.isDead) {
            mii.happiness = Math.min(100, mii.happiness + PARTY_HAPPINESS_BONUS);
        }
    });

    renderMoney();
    renderCurrentMiiState();
    saveGame();
}

function workForMoney(mii = miiList[currentMiiIndex]) {
    if (!mii || mii.isDead || mii.isSleeping) return;

    const job = JOBS[mii.job];
    if (!job) return;

    const happinessBonus = mii.happiness / 100;
    const hungerPenalty = (100 - mii.hunger) / 100 * 0.5; // Up to 50% penalty
    const basePay = job.basePay;
    
    // Facility check: Restaurant increases food quality, which can be seen as a minor work bonus
    const restaurantBonus = gameData.facilities.restaurant ? 1.05 : 1;
    
    let actualPay = Math.round(basePay * happinessBonus * (1 - hungerPenalty) * restaurantBonus);
    
    if (actualPay < 0) actualPay = 0;

    gameData.money += actualPay;
    mii.hunger = Math.max(0, mii.hunger - 15);
    mii.happiness = Math.max(0, mii.happiness - 5);

    logEvent(`💼 ${mii.name} worked as a ${job.name} and earned 💰${actualPay}.`);
    
    renderMoney();
    renderCurrentMiiState();
    saveGame();
}

function toggleSleep() {
    const mii = miiList[currentMiiIndex];
    if (!mii || mii.isDead) return;

    mii.isSleeping = !mii.isSleeping;
    
    if (mii.isSleeping) {
        logEvent(`💤 ${mii.name} went to sleep to rest.`);
    } else {
        logEvent(`☀️ ${mii.name} woke up.`);
    }

    updateSleepStateVisuals(mii);
    saveGame();
}

function renderInventory() {
    inventoryList.innerHTML = '';
    for (const key in gameData.inventory) {
        const count = gameData.inventory[key];
        if (count > 0) {
            const item = ITEMS[key];
            const itemSlot = document.createElement('div');
            itemSlot.className = 'item-slot';
            itemSlot.setAttribute('onclick', `useItem('${key}')`);
            itemSlot.innerHTML = `
                <h4>${item.name.split(' ')[0]}</h4>
                <p>${item.name.split(' ')[1]}</p>
                <p class="count">x${count}</p>
            `;
            inventoryList.appendChild(itemSlot);
        }
    }
    if (inventoryList.children.length === 0) {
        inventoryList.innerHTML = '<p>Inventory is empty.</p>';
    }
}

function useItem(key, mii = miiList[currentMiiIndex], isCaretaker = false) {
    if (!mii || mii.isDead || mii.isSleeping || gameData.inventory[key] < 1) return;

    const item = ITEMS[key];

    if (item.type === 'food' && mii.hunger === 100) {
        if (!isCaretaker) alert(`${mii.name} isn't hungry right now.`);
        return;
    }
    
    if (mii.currentRequest === key) {
        mii.currentRequest = null;
        mii.happiness = Math.min(100, mii.happiness + 20); // Extra happiness for request fulfillment
        logEvent(`${mii.name} is happy you gave them what they wanted!`);
    }

    if (item.type === 'food') {
        let hungerGain = item.hunger;
        
        // Facility check: Restaurant increases the quality/effectiveness of food
        if (gameData.facilities.restaurant) {
            hungerGain = Math.round(hungerGain * FACILITY_BONUSES.restaurant.foodQuality);
        }
        
        mii.hunger = Math.min(100, mii.hunger + hungerGain);
        logEvent(`${mii.name} ate a ${item.name.split(' ')[0]}. Hunger +${hungerGain}.`);
    }

    // Happiness bonus always applies
    mii.happiness = Math.min(100, mii.happiness + item.happiness);
    logEvent(`${mii.name} is happier. Happiness +${item.happiness}.`);
    
    gameData.inventory[key]--;

    renderInventory();
    renderCurrentMiiState();
    saveGame();
}

function openStore() {
    storeModal.classList.remove('hidden');
    renderStore();
}

function closeStore() {
    storeModal.classList.add('hidden');
}

function buyItem(key, cost) {
    if (gameData.money < cost) {
        alert("You don't have enough money!");
        return;
    }

    gameData.money -= cost;
    gameData.inventory[key] = (gameData.inventory[key] || 0) + 1;
    logEvent(`🛍️ Store: Bought ${ITEMS[key].name.split(' ')[0]} for 💰${cost}.`);

    renderMoney();
    renderStore();
    renderInventory();
    saveGame();
}

function renderStore() {
    storeMoney.textContent = gameData.money;
    storeItemsDiv.innerHTML = '';

    for (const key in ITEMS) {
        const item = ITEMS[key];
        const itemSlot = document.createElement('div');
        itemSlot.className = 'item-slot';
        itemSlot.setAttribute('onclick', `buyItem('${key}', ${item.cost})`);
        itemSlot.innerHTML = `
            <h4>${item.name.split(' ')[0]}</h4>
            <p>${item.name.split(' ')[1]}</p>
            <p class="count">💰${item.cost}</p>
        `;
        storeItemsDiv.appendChild(itemSlot);
    }
}


// --- Save/Load System ---

function saveGame() {
    try {
        const saveData = JSON.stringify(gameData);
        localStorage.setItem(SAVE_KEY, saveData);
        
        const miiListSave = JSON.stringify(miiList);
        localStorage.setItem('miiListSave', miiListSave);

        saveMessage.textContent = `Game saved! (${new Date().toLocaleTimeString()})`;
    } catch (e) {
        console.error("Could not save game data", e);
        saveMessage.textContent = "Error saving game.";
    }
}

function loadGame(savedData) {
    try {
        const loadedGameData = JSON.parse(savedData);
        gameData = { ...gameData, ...loadedGameData };

        const miiListSave = localStorage.getItem('miiListSave');
        
        if (miiListSave) {
             miiList = JSON.parse(miiListSave); 
        } else {
            miiList = [];
        }
        
        // Ensure new properties exist on old save files
        miiList = miiList.map(mii => ({
            ...mii,
            isDead: mii.isDead || false,
            relationship: mii.relationship || { status: 'single', partnerId: null, friends: [] },
            job: mii.job || BASE_JOB, 
            houseId: mii.houseId === undefined ? null : mii.houseId // NEW: Add houseId property
        }));
        
        // Ensure townEvents, houses, and facilities exist on old save files
        if (!gameData.townEvents) gameData.townEvents = [];
        if (!gameData.houses) gameData.houses = [];
        if (!gameData.facilities) gameData.facilities = {};
        
        // If loading a very old save without houses, add the initial house
        if (gameData.houses.length === 0) {
            gameData.houses.push({ id: 1, occupants: [] });
            logEvent("New Town Log initialized, added starting House 1!");
        } else {
             renderEvents();
        }

        saveMessage.textContent = `Town data loaded. Mode: ${gameData.mode.toUpperCase()}, Difficulty: ${gameData.difficulty.toUpperCase()}.`;
    } catch (e) {
        saveMessage.textContent = "Error loading game data. Starting new town.";
        console.error("Could not parse saved data", e);
        miiList = []; 
        showCreationScreen();
    }
}

function resetGame() {
    if (confirm("Are you sure you want to delete your entire town and reset the game?")) {
        localStorage.removeItem(SAVE_KEY);
        localStorage.removeItem('miiListSave');
        
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
    if (event.target === investmentModal && !investmentModal.classList.contains('hidden')) {
        closeInvestmentModal();
    }
    if (event.target === relationshipModal && !relationshipModal.classList.contains('hidden')) {
        closeRelationshipModal();
    }
    if (event.target === bankModal && !bankModal.classList.contains('hidden')) {
        closeBankModal();
    }
    if (event.target === jobModal && !jobModal.classList.contains('hidden')) { 
        closeJobModal();
    }
    if (event.target === buildModal && !buildModal.classList.contains('hidden')) { // NEW
        closeBuildModal();
    }
});

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        if (!storeModal.classList.contains('hidden')) {
            closeStore();
        } else if (!newMiiModal.classList.contains('hidden')) {
            closeNewMiiModal();
        } else if (!investmentModal.classList.contains('hidden')) {
            closeInvestmentModal();
        } else if (!relationshipModal.classList.contains('hidden')) {
            closeRelationshipModal();
        } 
        else if (!bankModal.classList.contains('hidden')) {
            closeBankModal();
        }
        else if (!jobModal.classList.contains('hidden')) { 
            closeJobModal();
        }
        else if (!buildModal.classList.contains('hidden')) { // NEW
            closeBuildModal();
        }
    }
});


// Start the whole process when the script loads
initGame();