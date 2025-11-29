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
    townEvents: [] // NEW: Array to hold town events
}

let gameLoop = null; 
const SAVE_KEY = 'miiLifeSaveDataV8'; 
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

// --- NEW: Job Definitions ---
const JOBS = {
    'unemployed': { name: 'Unemployed', basePay: 5, icon: '🛌' },
    'gardener': { name: 'Gardener', basePay: 15, icon: '🌿' },
    'cashier': { name: 'Cashier', basePay: 25, icon: '🛒' },
    'chef': { name: 'Chef', basePay: 40, icon: '🧑‍🍳' },
    'software_dev': { name: 'Software Dev', basePay: 60, icon: '💻' }
};
const BASE_JOB = 'unemployed'; // Default job for new Miis

// --- Relationship Constants ---
const FRIENDSHIP_SUCCESS_CHANCE = 0.6;
const FRIENDSHIP_HAPPINESS_BONUS = 5;
const DATING_HAPPINESS_BONUS = 15;
const SPOUSE_HAPPINESS_BONUS = 25;
const BREAKUP_HAPPINESS_PENALTY = 40;
const DATING_FAIL_CHANCE = 0.4;
const PROPOSAL_CHANCE = 0.5;

// --- NEW RELATIONSHIP EVENT CONSTANTS ---
const ARGUE_CHANCE = 0.02;         // 2% chance for partners to argue per tick
const ARGUE_HAPPINESS_LOSS = 20;
const MAKEUP_CHANCE = 0.15;        // 15% chance to make up if unhappy
const MAKEUP_HAPPINESS_GAIN = 40;
const JEALOUSY_CHANCE = 0.10;      // 10% chance for jealousy if Mii interacts with friend
const JEALOUSY_HAPPINESS_LOSS = 10;
const FRIEND_ARGUE_CHANCE = 0.01;  // 1% chance for friends to argue
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
const jobStat = document.getElementById('job-stat'); // NEW: Job Stat
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
const bankCurrentMoney = document.getElementById('bank-current-money');
const savingsTotalDisplay = document.getElementById('savings-total');
const savingsDepositInput = document.getElementById('savings-deposit-amount');
const savingsWithdrawInput = document.getElementById('savings-withdraw-amount');
const partyButton = document.getElementById('party-button');
const eventLogContainer = document.getElementById('event-log-container'); 

// Relationship Modal Elements
const relationshipModal = document.getElementById('relationship-modal');
const relMiiName = document.getElementById('rel-mii-name');
const relStatus = document.getElementById('rel-status');
const relActionsDiv = document.getElementById('rel-actions');
const relFriendsUl = document.getElementById('rel-friends-ul');

// Job Modal Elements // NEW
const jobModal = document.getElementById('job-modal');
const jobMiiName = document.getElementById('job-mii-name');
const jobCurrentJob = document.getElementById('job-current-job');
const jobListDiv = document.getElementById('job-list');


// --- CORE RENDERING FUNCTIONS ---

function renderMoney() {
    moneyStat.textContent = gameData.money;
}

// --- NEW Event Logging System ---
const MAX_EVENTS_DISPLAY = 5; 

function logEvent(message) {
    // Add timestamped event to the end of the array
    gameData.townEvents.push({ timestamp: Date.now(), message: message });
    
    // Keep the array length manageable (e.g., last 20 events in state)
    if (gameData.townEvents.length > 20) {
        gameData.townEvents.shift(); 
    }
    
    renderEvents();
    saveGame(); // Save on every event
}

function renderEvents() {
    // Ensure the container exists before proceeding
    if (!eventLogContainer) return; 

    eventLogContainer.innerHTML = '';
    
    if (gameData.townEvents.length === 0) {
        eventLogContainer.innerHTML = '<p class="event-message">No events yet. Start the town!</p>';
        return;
    }
    
    // We only want to render the most recent events, limited by MAX_EVENTS_DISPLAY.
    // We slice from the end to get the most recent ones.
    const eventsToDisplay = gameData.townEvents.slice(-MAX_EVENTS_DISPLAY);

    eventsToDisplay.forEach(event => {
        const eventElement = document.createElement('p');
        eventElement.className = 'event-message';
        
        // Add a time prefix for context
        const date = new Date(event.timestamp);
        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        eventElement.textContent = `[${timeString}] ${event.message}`;
        
        eventLogContainer.appendChild(eventElement);
    });
}
// --- END Event Logging System ---

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
    const job = JOBS[mii.job] || JOBS[BASE_JOB]; // Get job info

    miiNameDisplay.textContent = mii.name;
    genderStat.textContent = mii.gender === 'male' ? 'Male ♂️' : 'Female ♀️'; 
    personalityStat.textContent = mii.personality.charAt(0).toUpperCase() + mii.personality.slice(1);
    jobStat.textContent = `${job.icon} ${job.name} (💰${job.basePay}/hr)`; // NEW: Display Job Stat
    
    // Update Relationship Status Display
    let statusText = 'Single';
    if (mii.relationship.status === 'dating') {
        statusText = `Dating ${partner ? partner.name : 'Unknown'} ❤️`;
    } else if (mii.relationship.status === 'spouse') {
        statusText = `Spouse of ${partner ? partner.name : 'Unknown'} 💍`;
    }
    relationshipStat.textContent = statusText;

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
    investmentModal.classList.add('hidden'); 
    relationshipModal.classList.add('hidden');
    bankModal.classList.add('hidden'); 
    jobModal.classList.add('hidden'); // NEW
    updateCreationScreenState();
}

function startGame() {
    if (miiList.length > 0) {
        // --- NEW: Set mode and difficulty from selectors ---
        const modeSelect = document.getElementById('game-mode-select');
        const difficultySelect = document.getElementById('game-difficulty-select');

        gameData.mode = modeSelect.value;
        gameData.difficulty = difficultySelect.value;
        
        // Apply difficulty benefits
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
    creationScreen.classList.add('hidden');
    newMiiModal.classList.add('hidden');
    investmentModal.classList.add('hidden');
    relationshipModal.classList.add('hidden');
    bankModal.classList.add('hidden'); 
    jobModal.classList.add('hidden'); // NEW
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
    renderEvents(); // NEW
}

// --- Mii Creation/Management ---

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

    miiList.push({
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
        job: BASE_JOB // NEW: Default Job
    });
    
    nameInput.value = '';
    
    updateCreationScreenState();
    logEvent(`${name} has moved into the apartment!`); // NEW log
}

function renderMiiSelector() {
    miiSelector.innerHTML = '';
    const activeMiis = miiList.filter(m => !m.isDead);

    activeMiis.forEach(mii => {
        const index = miiList.findIndex(m => m.id === mii.id); 
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${mii.name} (${Math.round(mii.happiness)}❤️)`;
        miiSelector.appendChild(option);
    });

    if (currentMiiIndex >= 0 && miiList[currentMiiIndex] && !miiList[currentMiiIndex].isDead) {
         miiSelector.value = currentMiiIndex;
    } else if (activeMiis.length > 0) {
        currentMiiIndex = miiList.findIndex(m => m.id === activeMiis[0].id);
        miiSelector.value = currentMiiIndex;
    } else {
        currentMiiIndex = -1;
    }

    renderCurrentMiiState(); 
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

    miiList.push({
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
        job: BASE_JOB // NEW: Default Job
    });
    
    closeNewMiiModal();
    renderMiiSelector(); 
    renderResidentList();
    logEvent(`👶 New Resident: ${name} has joined the town!`); // NEW log
    saveGame();
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

        if (mii.relationship.status !== 'single') {
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
    caretakerStatusSpan.classList.remove('active', 'inactive');
    
    if (gameData.isCaretakerActive) {
        caretakerStatusSpan.textContent = 'Active (Permanent)';
        caretakerStatusSpan.classList.add('active');
        caretakerStatusSpan.onclick = null;
    } else {
        caretakerStatusSpan.textContent = `Inactive - Purchase for 💰${CARETAKER_PURCHASE_PRICE}`;
        caretakerStatusSpan.classList.add('inactive');
        caretakerStatusSpan.onclick = buyCaretaker;
    }
}

function buyCaretaker() {
    if (gameData.isCaretakerActive) return;

    if (gameData.money >= CARETAKER_PURCHASE_PRICE) {
        if (confirm(`Do you want to purchase the permanent Caretaker for 💰${CARETAKER_PURCHASE_PRICE}?`)) {
            gameData.money -= CARETAKER_PURCHASE_PRICE;
            gameData.isCaretakerActive = true;
            
            logEvent(`🎉 Caretaker system purchased for 💰${CARETAKER_PURCHASE_PRICE}! All Miis will now be automatically cared for.`); // NEW log
            renderMoney();
            renderCaretakerStatus();
            saveGame();
        }
    } else {
        alert(`You only have 💰${gameData.money}. You need 💰${CARETAKER_PURCHASE_PRICE} to purchase the permanent Caretaker.`);
    }
}

// --- Job Management System --- // NEW

function openJobModal() {
    const mii = miiList[currentMiiIndex];
    if (!mii) return;

    jobMiiName.textContent = `${mii.name}'s Job Assignment`;
    const currentJobInfo = JOBS[mii.job] || JOBS[BASE_JOB];
    jobCurrentJob.textContent = `${currentJobInfo.icon} ${currentJobInfo.name}`;
    jobListDiv.innerHTML = '';

    for (const key in JOBS) {
        const job = JOBS[key];
        const isCurrent = key === mii.job;
        const card = document.createElement('div');
        card.className = `item-slot store-item ${isCurrent ? 'selected-job' : ''}`;
        
        if (!isCurrent) {
            card.setAttribute('onclick', `assignJob('${key}')`);
        } else {
            card.style.cursor = 'default';
        }

        card.innerHTML = `
            <h4>${job.icon} ${job.name}</h4>
            <p>Pay: <span class="count">💰${job.basePay}/hr</span></p>
            <small>${isCurrent ? 'Current Job' : 'Click to Switch'}</small>
        `;
        jobListDiv.appendChild(card);
    }

    jobModal.classList.remove('hidden');
}

function closeJobModal() {
    jobModal.classList.add('hidden');
}

function assignJob(jobKey) {
    const mii = miiList[currentMiiIndex];
    if (!mii || mii.job === jobKey) return;

    mii.job = jobKey;
    logEvent(`💼 Job Change: ${mii.name} is now a ${JOBS[jobKey].name}.`);
    miiMessage.textContent = `${mii.name} is happy to be a ${JOBS[jobKey].name}!`;
    
    renderCurrentMiiState();
    openJobModal(); // Re-render the modal to show the update
    saveGame();
}

// --- Relationship System ---

function openRelationshipModal() {
    const mii = miiList[currentMiiIndex];
    if (!mii) {
        miiMessage.textContent = "Please select a resident to view relationships.";
        return;
    }

    relMiiName.textContent = mii.name;
    
    // Update main status display
    let statusText = 'Single';
    if (mii.relationship.status !== 'single') {
        const partner = miiList.find(m => m.id === mii.relationship.partnerId);
        if (partner) {
            statusText = `${mii.relationship.status.charAt(0).toUpperCase() + mii.relationship.status.slice(1)} with ${partner.name} ${mii.relationship.status === 'dating' ? '❤️' : '💍'}`;
        }
    }
    relStatus.textContent = statusText;

    renderRelationshipActions();
    renderFriendList();
    
    relationshipModal.classList.remove('hidden');
}

function closeRelationshipModal() {
    relationshipModal.classList.add('hidden');
}

function renderRelationshipActions() {
    const mii = miiList[currentMiiIndex];
    relActionsDiv.innerHTML = '';
    // Filter out deceased and current Mii
    const otherActiveMiis = miiList.filter(m => !m.isDead && m.id !== mii.id);

    if (otherActiveMiis.length === 0) {
        relActionsDiv.innerHTML = '<p>Need more residents for relationships!</p>';
        return;
    }

    // --- Actions based on current status (Breakup/Proposal) ---
    if (mii.relationship.status !== 'single') {
        const partner = miiList.find(m => m.id === mii.relationship.partnerId);
        
        // Safety check for partner existence
        if (partner) {
            // Breakup Button
            relActionsDiv.innerHTML += `<button onclick="attemptBreakup('${partner.id}')">💔 Break Up with ${partner.name}</button>`;
            
            // Proposal Button
            if (mii.relationship.status === 'dating') {
                 relActionsDiv.innerHTML += `<button class="propose" onclick="attemptProposal('${partner.id}')">💍 Propose to ${partner.name}</button>`;
            }
        }
    }

    // --- Actions for all Miis (Friendship/Dating Attempts) ---
    
    // An Mii is an eligible target if they are not the current Mii's partner (as the partner has specific actions).
    // This allows dating Miis to attempt friendship with anyone else.
    const eligibleTargets = otherActiveMiis.filter(target => 
        target.id !== mii.relationship.partnerId
    );

    if (eligibleTargets.length > 0 && mii.relationship.status !== 'spouse') {
        let interactionOptions = eligibleTargets.map(target => {
            let actionType = 'Befriend';
            let actionFunction = 'attemptFriendship';
            
            const isFriend = mii.relationship.friends.includes(target.id);
            // Dating is only possible if BOTH are single AND they are opposite genders
            const canDate = target.relationship.status === 'single' && mii.relationship.status === 'single' && mii.gender !== target.gender && mii.happiness > 60;
            
            if (isFriend) {
                // Skip friend interaction button if already friends
                return ''; 
            } else if (canDate) {
                 actionType = 'Ask to Date';
                 actionFunction = 'attemptDating';
            }
            
            // If neither 'isFriend' nor 'canDate', the default actionType/Function is 'Befriend'/'attemptFriendship'
            
            // Pass the Mii ID as a string in the onclick attribute
            return `<button onclick="${actionFunction}('${target.id}')">${actionType} ${target.name} (${target.gender === 'male' ? '♂️' : '♀️'})</button>`;
        }).join('');
        
        relActionsDiv.innerHTML += '<hr><h3>Interaction Attempts:</h3>' + interactionOptions;
    }
}

function renderFriendList() {
    const mii = miiList[currentMiiIndex];
    relFriendsUl.innerHTML = '';
    
    mii.relationship.friends.forEach(friendId => {
        const friend = miiList.find(m => m.id === friendId);
        if (friend && !friend.isDead) {
            const listItem = document.createElement('li');
            listItem.textContent = `${friend.name} (${friend.gender === 'male' ? '♂️' : '♀️'})`;
            relFriendsUl.appendChild(listItem);
        }
    });

    if (mii.relationship.friends.length === 0) {
        relFriendsUl.innerHTML = '<li>No current friends.</li>';
    }
}

function attemptFriendship(targetId) {
    const mii = miiList[currentMiiIndex];
    const target = miiList.find(m => m.id === parseInt(targetId)); 

    if (!mii || !target) {
        miiMessage.textContent = "Error: Mii or target not found for interaction.";
        return;
    }

    if (mii.relationship.friends.includes(target.id)) {
        miiMessage.textContent = `${mii.name} is already friends with ${target.name}!`;
        return;
    }
    
    const successChance = target.happiness > 70 ? FRIENDSHIP_SUCCESS_CHANCE * 1.5 : FRIENDSHIP_SUCCESS_CHANCE;

    if (Math.random() < successChance) {
        // Success
        mii.relationship.friends.push(target.id);
        target.relationship.friends.push(mii.id);
        mii.happiness = Math.min(100, mii.happiness + FRIENDSHIP_HAPPINESS_BONUS);
        target.happiness = Math.min(100, target.happiness + FRIENDSHIP_HAPPINESS_BONUS);
        logEvent(`🤝 ${mii.name} is now friends with ${target.name}!`); // NEW log
    } else {
        // Failure
        mii.happiness = Math.max(0, mii.happiness - 5);
        miiMessage.textContent = `😔 ${target.name} was not interested in being friends right now.`;
    }

    // Check for jealousy if Mii is in a relationship
    if (mii.relationship.status !== 'single' && mii.relationship.partnerId) {
        handleJealousy(mii, target);
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
        
        logEvent(`❤️ ${mii.name} and ${target.name} are now dating!`); // NEW log
    } else {
        // Failure
        mii.happiness = Math.max(0, mii.happiness - 15);
        miiMessage.textContent = `💔 ${target.name} gently let ${mii.name} down. Ouch.`;
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
        // Clear Mii's status
        mii.relationship.status = 'single';
        mii.relationship.partnerId = null;
        mii.happiness = Math.max(0, mii.happiness - BREAKUP_HAPPINESS_PENALTY);
        
        // Clear Partner's status
        partner.relationship.status = 'single';
        partner.relationship.partnerId = null;
        partner.happiness = Math.max(0, partner.happiness - BREAKUP_HAPPINESS_PENALTY);
        
        logEvent(`😭 ${mii.name} and ${partner.name} broke up! They are very sad now.`); // NEW log
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

    // Proposal chance is based on average happiness
    const successChance = (mii.happiness + partner.happiness) / 200 * PROPOSAL_CHANCE;

    if (Math.random() < successChance) {
        // Success
        mii.relationship.status = 'spouse';
        partner.relationship.status = 'spouse';
        mii.happiness = Math.min(100, mii.happiness + SPOUSE_HAPPINESS_BONUS);
        partner.happiness = Math.min(100, partner.happiness + SPOUSE_HAPPINESS_BONUS);
        
        logEvent(`🔔 ${partner.name} said YES! ${mii.name} and ${partner.name} are now happily married! 💍`); // NEW log
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

        // Apply decay modifiers based on hunger/relationship status
        if (mii.hunger < 50) {
            happinessDecay += 2; // Sadder when hungry
        }

        if (mii.relationship.status === 'dating') {
            happinessDecay -= 1; // Happier when dating
        } else if (mii.relationship.status === 'spouse') {
            happinessDecay -= 2; // Even happier when married
        }
        
        // Unemployed Miis decay faster
        if (mii.job === BASE_JOB) {
            happinessDecay += 1;
        }

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
            // Only update the message if the dead Mii is the currently selected one
            if (mii.id === miiList[currentMiiIndex]?.id) {
                miiMessage.textContent = `💔 Oh no! ${mii.name} has passed away due to extreme sadness.`;
            }
            logEvent(`💀 Death: ${mii.name} has passed away due to extreme sadness.`); // NEW log

            // Partner grief: Break relationship and heavily penalize happiness
            if (mii.relationship.partnerId) {
                const partner = miiList.find(m => m.id === mii.relationship.partnerId);
                if (partner) {
                    partner.relationship.status = 'single';
                    partner.relationship.partnerId = null;
                    partner.happiness = Math.max(0, partner.happiness - 60);
                    logEvent(`😔 Grief: ${partner.name} is deeply saddened by the passing of ${mii.name}.`); // NEW log
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
    renderEvents(); // NEW: Ensure event log updates on every tick
    checkIfTownIsOver();
    saveGame();
}

// --- NEW Dynamic Relationship Event Handlers ---

function handleRelationshipEvents(activeMiis) {
    activeMiis.forEach(mii => {
        if (mii.isSleeping || mii.isDead) return;

        // 1. Arguments (Dating/Spouse)
        if (mii.relationship.status !== 'single' && Math.random() < ARGUE_CHANCE) {
            const partner = miiList.find(m => m.id === mii.relationship.partnerId);
            if (partner && !partner.isDead) {
                // Check if they are already sad to prevent constant arguments
                if (mii.happiness > 40 || partner.happiness > 40) {
                     // To prevent double triggering (since both Miis iterate), only run if Mii ID < Partner ID
                    if (mii.id < partner.id) {
                        mii.happiness = Math.max(0, mii.happiness - ARGUE_HAPPINESS_LOSS);
                        partner.happiness = Math.max(0, partner.happiness - ARGUE_HAPPINESS_LOSS);
                        logEvent(`💥 Relationship Argument: ${mii.name} and ${partner.name} had a big fight!`); // NEW log
                    }
                }
            }
        }
        
        // 2. Make-up (If unhappy, try to make up)
        if (mii.relationship.status !== 'single' && mii.happiness < 40 && Math.random() < MAKEUP_CHANCE) {
            const partner = miiList.find(m => m.id === mii.relationship.partnerId);
            if (partner && !partner.isDead) {
                 // To prevent double triggering, only run if Mii ID < Partner ID
                if (mii.id < partner.id) {
                    mii.happiness = Math.min(100, mii.happiness + MAKEUP_HAPPINESS_GAIN);
                    partner.happiness = Math.min(100, partner.happiness + MAKEUP_HAPPINESS_GAIN);
                    logEvent(`🥰 Relationship Make-up: ${mii.name} and ${partner.name} made up and are happier!`); // NEW log
                }
            }
        }

        // 3. Jealousy (Checked when interacting, but also randomly)
        // If Mii has a partner and is not currently sleeping, check if they randomly feel jealous of a friend's relationship
        if (mii.relationship.status !== 'single' && Math.random() < JEALOUSY_CHANCE) {
            const partner = miiList.find(m => m.id === mii.relationship.partnerId);
            const randomFriendId = mii.relationship.friends[Math.floor(Math.random() * mii.relationship.friends.length)];
            const friend = miiList.find(m => m.id === randomFriendId);

            if (partner && friend && friend.relationship.status !== 'single' && friend.relationship.partnerId !== partner.id) {
                mii.happiness = Math.max(0, mii.happiness - JEALOUSY_HAPPINESS_LOSS);
                logEvent(`😠 Jealousy: ${mii.name} got jealous of ${friend.name}'s good mood.`); // NEW log
            }
        }
        
        // 4. Friend Arguments
        mii.relationship.friends.forEach(friendId => {
            const friend = miiList.find(m => m.id === friendId);
            if (friend && !friend.isDead) {
                // To prevent double triggering (since both Miis iterate), only run if Mii ID < Friend ID
                if (mii.id < friend.id && Math.random() < FRIEND_ARGUE_CHANCE) {
                    
                    // Reduce happiness for both
                    mii.happiness = Math.max(0, mii.happiness - FRIEND_ARGUE_LOSS);
                    friend.happiness = Math.max(0, friend.happiness - FRIEND_ARGUE_LOSS);
                    
                    if (Math.random() < 0.2) { // 20% chance to end friendship
                        // Remove friendship from both lists
                        mii.relationship.friends = mii.relationship.friends.filter(id => id !== friend.id);
                        friend.relationship.friends = friend.relationship.friends.filter(id => id !== mii.id);
                        logEvent(`💥 Friend Fight: ${mii.name} and ${friend.name} had a huge fight and are no longer friends!`); // NEW log
                    } else {
                        logEvent(`😒 Minor Disagreement: ${mii.name} and ${friend.name} had a minor disagreement.`); // NEW log
                    }
                }
            }
        });
    });
}

function handleCaretaker(activeMiis) {
    activeMiis.forEach(mii => {
        if (mii.isSleeping) return;

        let caredFor = false;

        // 1. Food Check
        if (mii.hunger < CARETAKER_THRESHOLD) {
            const food = ITEMS[CARETAKER_FOOD];
            mii.hunger = Math.min(100, mii.hunger + food.hunger);
            mii.happiness = Math.min(100, mii.happiness + food.happiness);
            mii.currentRequest = null;
            caredFor = true;
        }

        // 2. Mood Check
        if (mii.happiness < CARETAKER_THRESHOLD) {
            const mood = ITEMS[CARETAKER_MOOD];
            mii.happiness = Math.min(100, mii.happiness + mood.happiness);
            mii.currentRequest = null;
            caredFor = true;
        }

        if (caredFor) {
            logEvent(`🤖 Caretaker: ${mii.name} was automatically taken care of.`); // NEW log
        }
    });
}

function handleAutonomousActions(activeMiis) {
    activeMiis.forEach(mii => {
        if (mii.isSleeping) return;

        // 1. Autonomous Work
        if (mii.hunger > 60 && mii.happiness > 60 && Math.random() < AUTOMATIC_WORK_CHANCE) {
            // --- Job System Integration ---
            const job = JOBS[mii.job];
            const earned = job.basePay;
            // --- End Job System Integration ---

            gameData.money += earned;
            mii.happiness = Math.max(0, mii.happiness - 5);
            logEvent(`💼 Autonomous Work: ${mii.name} (${job.name}) worked and earned 💰${earned} gold.`); // Update log
        }
        
        // 2. Autonomous Dating/Proposing (only if single)
        if (mii.relationship.status === 'single' && mii.happiness > 60 && Math.random() < AUTOMATIC_DATING_CHANCE) {
            const eligibleTargets = activeMiis.filter(target => 
                target.id !== mii.id && 
                target.relationship.status === 'single' && 
                mii.gender !== target.gender
            );

            if (eligibleTargets.length > 0) {
                const target = eligibleTargets[Math.floor(Math.random() * eligibleTargets.length)];
                
                // Call the existing dating logic (no message needed, handled internally)
                attemptDating(target.id);
            }
        } 
        // 3. Autonomous Proposal (if dating)
        else if (mii.relationship.status === 'dating' && mii.happiness > 75 && Math.random() < (AUTOMATIC_DATING_CHANCE / 2)) {
            // Call the existing proposal logic (no message needed, handled internally)
            attemptProposal(mii.relationship.partnerId);
        }
    });
}

function checkIfTownIsOver() {
    const activeMiis = miiList.filter(m => !m.isDead);
    if (activeMiis.length === 0 && gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
        alert("Game Over! All residents have passed away. Time to start a new town!");
        showCreationScreen();
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
    investmentTotal.textContent = gameData.investmentTotal;
    const passiveIncome = Math.floor(gameData.investmentTotal / INVESTMENT_RATE);
    investmentRate.textContent = passiveIncome;
    investmentAmountInput.value = INVESTMENT_MIN;
}

function makeInvestment() {
    const amount = parseInt(investmentAmountInput.value);

    if (isNaN(amount) || amount < INVESTMENT_MIN) {
        alert(`Investment must be a number and at least 💰${INVESTMENT_MIN}.`);
        return;
    }

    if (gameData.money < amount) {
        alert(`You only have 💰${gameData.money}! Cannot invest 💰${amount}.`);
        return;
    }

    gameData.money -= amount;
    gameData.investmentTotal += amount;
    logEvent(`💰 Investment: Invested 💰${amount}. Passive income rate updated!`); // NEW log
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
    bankCurrentMoney.textContent = gameData.money;
    savingsTotalDisplay.textContent = gameData.savingsTotal;
    savingsDepositInput.value = INVESTMENT_MIN;
    savingsWithdrawInput.value = INVESTMENT_MIN;
}

function depositSavings() {
    const amount = parseInt(savingsDepositInput.value);

    if (isNaN(amount) || amount < INVESTMENT_MIN) {
        alert(`Deposit must be a number and at least 💰${INVESTMENT_MIN}.`);
        return;
    }

    if (gameData.money < amount) {
        alert(`You only have 💰${gameData.money}! Cannot deposit 💰${amount}.`);
        return;
    }

    gameData.money -= amount;
    gameData.savingsTotal += amount;
    logEvent(`🏦 Deposit: Deposited 💰${amount} into savings.`); // NEW log
    renderMoney();
    renderBankModal();
    saveGame();
}

function withdrawSavings() {
    const amount = parseInt(savingsWithdrawInput.value);

    if (isNaN(amount) || amount < INVESTMENT_MIN) {
        alert(`Withdrawal must be a number and at least 💰${INVESTMENT_MIN}.`);
        return;
    }
    
    if (gameData.savingsTotal < amount) {
        alert(`You only have 💰${gameData.savingsTotal} in savings! Cannot withdraw 💰${amount}.`);
        return;
    }

    gameData.money += amount;
    gameData.savingsTotal -= amount;
    logEvent(`💸 Withdrawal: Withdrew 💰${amount} from savings.`); // NEW log
    renderMoney();
    renderBankModal();
    saveGame();
}

// --- Town Actions ---

function throwParty() {
    if (gameData.money < PARTY_COST) {
        miiMessage.textContent = `You need 💰${PARTY_COST} for a party. You only have 💰${gameData.money}.`;
        return;
    }

    gameData.money -= PARTY_COST;
    const activeMiis = miiList.filter(m => !m.isDead);

    activeMiis.forEach(mii => {
        mii.happiness = Math.min(100, mii.happiness + PARTY_HAPPINESS_BONUS);
    });

    logEvent(`🎉 Party: Town threw a party for 💰${PARTY_COST}! Everyone's happiness increased!`); // NEW log
    renderMoney();
    renderCurrentMiiState();
    saveGame();
}

function workForMoney() {
    const mii = miiList[currentMiiIndex];
    if (!mii) return;

    if (mii.isSleeping) {
        miiMessage.textContent = `${mii.name} is sleeping! Wake them up first.`;
        return;
    }
    
    if (mii.happiness < 30) {
        miiMessage.textContent = `${mii.name} is too sad to work right now. Cheer them up!`;
        return;
    }

    // --- Job System Integration ---
    const job = JOBS[mii.job];
    const earned = job.basePay;
    // --- End Job System Integration ---

    gameData.money += earned;
    mii.happiness = Math.max(0, mii.happiness - 5);
    renderMoney();
    renderCurrentMiiState();
    logEvent(`💼 Work: ${mii.name} (${job.name}) worked hard and earned 💰${earned} gold.`); // Update log
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
    if (!mii || mii.isDead) return;

    const item = ITEMS[key];
    if (!item) return;

    if (mii.isSleeping) {
        miiMessage.textContent = `${mii.name} is sleeping! Let them rest.`;
        return;
    }

    if (gameData.inventory[key] > 0) {
        gameData.inventory[key]--;

        // Apply effects
        if (item.type === 'food' && mii.hunger < 100) {
            mii.hunger = Math.min(100, mii.hunger + item.hunger);
            mii.happiness = Math.min(100, mii.happiness + item.happiness);
            miiMessage.textContent = `${mii.name} enjoyed the ${item.name}! 😋`;
            logEvent(`🍽️ Item Use: ${mii.name} ate an ${item.name}.`); // NEW log
        } else if (item.type === 'mood' && mii.happiness < 100) {
            mii.happiness = Math.min(100, mii.happiness + item.happiness);
            miiMessage.textContent = `${mii.name} feels better after the ${item.name}! 😊`;
            logEvent(`✨ Item Use: ${mii.name} used ${item.name} and feels happier.`); // NEW log
        } else {
            // Give item back if it had no effect (e.g., trying to feed a full Mii)
            gameData.inventory[key]++; 
            miiMessage.textContent = `${mii.name} doesn't need that right now.`;
            return;
        }

        // Check if item fulfills a request
        if (mii.currentRequest === key) {
            mii.currentRequest = null;
            mii.happiness = Math.min(100, mii.happiness + 20); // Extra happiness for fulfilling a request
            miiMessage.textContent += ` (Request fulfilled! +20❤️)`;
        }

        // --- NEW: Jealousy Check (Partner gets jealous if mii interacts with friend instead of partner) ---
        if (mii.relationship.status !== 'single' && mii.relationship.partnerId) {
            const partner = miiList.find(m => m.id === mii.relationship.partnerId);
            
            // Check if Mii is currently sad/hungry enough for the Caretaker to have intervened, 
            // suggesting the player/user is manually intervening instead of the partner.
            if (partner && !partner.isDead && partner.id !== mii.id && (mii.hunger < CARETAKER_THRESHOLD || mii.happiness < CARETAKER_THRESHOLD)) {
                
                // 10% chance for jealousy if partner did not perform the action
                if (Math.random() < JEALOUSY_CHANCE) {
                    partner.happiness = Math.max(0, partner.happiness - JEALOUSY_HAPPINESS_LOSS);
                    miiMessage.textContent += ` (Note: ${partner.name} got a little jealous that ${mii.name} is distracted by the ${item.name}.)`;
                    logEvent(`😠 Jealousy: ${partner.name} got jealous that ${mii.name} used an item when they could have helped.`); // NEW log
                }
            }
        }
        // --- END NEW: Jealousy Check ---

        renderCurrentMiiState();
        renderInventory();
        saveGame();
    } else {
        miiMessage.textContent = `The town inventory doesn't have any ${item.name}!`;
    }
}

function openStore() {
    storeModal.classList.remove('hidden');
    renderStore();
}

function closeStore() {
    storeModal.classList.add('hidden');
}

function buyItem(key, cost) {
    if (gameData.money >= cost) {
        gameData.money -= cost;
        gameData.inventory[key] = (gameData.inventory[key] || 0) + 1;
        miiMessage.textContent = `Bought one ${ITEMS[key].name} for 💰${cost}.`;
        renderMoney();
        renderStore();
        renderInventory();
        saveGame();
    } else {
        miiMessage.textContent = `Not enough money! Need 💰${cost}.`;
    }
}

function renderStore() {
    storeMoney.textContent = gameData.money;
    storeItemsDiv.innerHTML = '';

    // Add Caretaker item if not already purchased
    if (!gameData.isCaretakerActive) {
        const slot = document.createElement('div');
        slot.className = 'item-slot store-item';
        slot.setAttribute('onclick', `buyCaretaker()`);
        slot.innerHTML = `
            <h4>Caretaker System 🤖</h4>
            <p>Cost: <span class="count">💰${CARETAKER_PURCHASE_PRICE}</span></p>
            <small>Permanent Auto-Care</small>
        `;
        storeItemsDiv.appendChild(slot);
    }

    for (const key in ITEMS) {
        const item = ITEMS[key];
        const slot = document.createElement('div');
        slot.className = 'item-slot store-item';
        slot.setAttribute('onclick', `buyItem('${key}', ${item.cost})`);

        let effectText = item.type === 'food' ? `Hng +${item.hunger}, Hpp +${item.happiness}` : `Hpp +${item.happiness}`;

        slot.innerHTML = `
            <h4>${item.name}</h4>
            <p>Cost: <span class="count">💰${item.cost}</span></p>
            <small>${effectText}</small>
        `;
        storeItemsDiv.appendChild(slot);
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
        // Ensure gameData is initialized before merging
        gameData = { ...gameData, ...loadedGameData };

        const miiListSave = localStorage.getItem('miiListSave');
        
        // FIX: Check if miiListSave is null before attempting to parse.
        if (miiListSave) {
             miiList = JSON.parse(miiListSave); 
        } else {
            // Initialize miiList as an empty array if not found
            miiList = [];
        }
        
        // Ensure new properties exist on old save files
        // The .map() call is now safe as miiList is guaranteed to be an array (possibly empty)
        miiList = miiList.map(mii => ({
            ...mii,
            isDead: mii.isDead || false,
            relationship: mii.relationship || { status: 'single', partnerId: null, friends: [] },
            job: mii.job || BASE_JOB // NEW: Add job property
        }));
        
        // Ensure townEvents exists on old save files
        if (!gameData.townEvents) {
            gameData.townEvents = [];
            logEvent("New Town Log initialized!");
        } else {
             renderEvents();
        }

        saveMessage.textContent = `Town data loaded. Mode: ${gameData.mode.toUpperCase()}, Difficulty: ${gameData.difficulty.toUpperCase()}.`;
    } catch (e) {
        saveMessage.textContent = "Error loading game data. Starting new town.";
        console.error("Could not parse saved data", e);
        // If parsing fails for any reason, reset miiList and reload the creation screen
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
    if (event.target === jobModal && !jobModal.classList.contains('hidden')) { // NEW
        closeJobModal();
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
        else if (!jobModal.classList.contains('hidden')) { // NEW
            closeJobModal();
        }
    }
});


// Start the whole process when the script loads
initGame();