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
const SAVINGS_INTEREST_RATE = 0.01; // 1%

// --- Relationship Constants ---
const FRIENDSHIP_SUCCESS_CHANCE = 0.6;
const FRIENDSHIP_HAPPINESS_BONUS = 5;
const DATING_HAPPINESS_BONUS = 15;
const SPOUSE_HAPPINESS_BONUS = 25;
const BREAKUP_HAPPINESS_PENALTY = 40;
const DATING_FAIL_CHANCE = 0.4;
const PROPOSAL_CHANCE = 0.5;

// --- Dynamic Relationship Event Constants ---
const ARGUE_CHANCE = 0.02;         
const ARGUE_HAPPINESS_LOSS = 20;
const MAKEUP_CHANCE = 0.15;        
const MAKEUP_HAPPINESS_GAIN = 40;
const JEALOUSY_CHANCE = 0.10;      
const JEALOUSY_HAPPINESS_LOSS = 10;
const FRIEND_ARGUE_CHANCE = 0.01;  
const FRIEND_ARGUE_LOSS = 15;

// --- Investment Constants ---
const INVESTMENT_RATE = 100; // 1 gold per 100 invested
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
const residentListDiv = document.getElementById('resident-list'); 
const caretakerStatusSpan = document.getElementById('caretaker-status'); 

// Investment Modal Elements (New/Fixed)
const investmentModal = document.getElementById('investment-modal'); 
const investmentTotal = document.getElementById('investment-total'); 
const investmentRate = document.getElementById('investment-rate'); 
const investmentAmountInput = document.getElementById('investment-amount'); 

// Bank Modal Elements (New/Fixed)
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


// --- CORE RENDERING FUNCTIONS ---

function renderMoney() {
    moneyStat.textContent = gameData.money;
    storeMoney.textContent = gameData.money;
}

function updateSleepStateVisuals(mii) {
    if (!mii) return;
    
    // Clear all Mii status classes first
    miiAvatar.classList.remove('sleeping', 'sad', 'starving', 'tired', 'ill');

    if (mii.isSleeping) {
        sleepButton.textContent = "🌅 Wake Up";
        sleepButton.style.backgroundColor = '#4CAF50';
        miiAvatar.classList.add('sleeping');
    } else {
        sleepButton.textContent = "🛌 Go to Sleep";
        sleepButton.style.backgroundColor = '#ff69b4';
        // Add back non-sleep related visuals
        if (mii.hunger < 20) miiAvatar.classList.add('starving'); 
        else if (mii.happiness < 30) miiAvatar.classList.add('sad'); 
    }
}

function renderCurrentMiiState() {
    const mii = miiList[currentMiiIndex];

    if (!mii || mii.isDead) {
        miiNameDisplay.textContent = mii ? `${mii.name} (Deceased)` : "No Active Resident";
        [happinessStat, hungerStat, personalityStat, genderStat, relationshipStat].forEach(el => el.textContent = '---');
        [happinessBar, hungerBar].forEach(bar => bar.style.width = '0%');
        requestBox.classList.add('hidden');
        miiAvatar.classList.remove('sad', 'starving', 'sleeping');
        miiAvatar.style.backgroundColor = '#9e9e9e'; // Grey for deceased/missing
        miiMessage.textContent = mii ? `${mii.name} is deceased.` : "Select a resident.";
        return;
    }
    
    // Update Mii Card Details
    const partner = mii.relationship.partnerId ? miiList.find(m => m.id === mii.relationship.partnerId) : null;

    miiNameDisplay.textContent = mii.name;
    genderStat.textContent = mii.gender === 'male' ? 'Male ♂️' : 'Female ♀️'; 
    personalityStat.textContent = mii.personality.charAt(0).toUpperCase() + mii.personality.slice(1);
    miiAvatar.style.backgroundColor = '#ffccbc'; // Reset skin tone

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
    miiAvatar.classList.remove('sad', 'starving'); // Keep 'sleeping' handled separately by updateSleepStateVisuals
    happinessBar.classList.remove('low');
    hungerBar.classList.remove('low');
    
    updateSleepStateVisuals(mii); // Call this first to handle sleeping/wake up state
    
    if (mii.currentRequest) {
        requestedItemName.textContent = ITEMS[mii.currentRequest].name;
        requestBox.classList.remove('hidden');
    } else {
        requestBox.classList.add('hidden');
    }

    if (mii.hunger < 20 && !mii.isSleeping) {
        miiMessage.textContent = `${mii.name} is critically starving!`;
        hungerBar.classList.add('low');
        miiAvatar.classList.add('starving'); 
    } else if (mii.happiness < 30 && !mii.isSleeping) {
        miiMessage.textContent = `${mii.name} is extremely sad.`;
        happinessBar.classList.add('low');
        miiAvatar.classList.add('sad'); 
    } else if (mii.hunger < 50 && !mii.isSleeping) {
        miiMessage.textContent = `${mii.name} is hungry.`;
        hungerBar.classList.add('low');
    } else if (mii.happiness < 60 && !mii.isSleeping) {
        miiMessage.textContent = `${mii.name} needs attention.`;
        happinessBar.classList.add('low');
    } else if (!mii.isSleeping) {
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

function showGameScreen() {
    creationScreen.classList.add('hidden');
    newMiiModal.classList.add('hidden');
    investmentModal.classList.add('hidden');
    relationshipModal.classList.add('hidden');
    bankModal.classList.add('hidden'); 
    gameScreen.classList.remove('hidden');
    
    if (!gameLoop) {
        gameLoop = setInterval(updateAllMiiStats, UPDATE_INTERVAL);
    }
    
    renderMiiSelector();
    renderInventory();
    renderMoney(); 
    renderCaretakerStatus(); 
    renderCurrentMiiState(); // Ensures initial state is drawn
    renderResidentList(); 
}

function updateCreationScreenState() {
    residentCountSpan.textContent = miiList.length;
    if (miiList.length > 0) {
        startTownButton.disabled = false;
        startTownButton.textContent = `🚀 Start Town Life (${miiList.length} Miis)`;
    } else {
        startTownButton.disabled = true;
        startTownButton.textContent = `🚀 Start Town Life (Requires 1+ Mii)`;
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
        }
    });
    
    nameInput.value = '';
    
    updateCreationScreenState();
    alert(`${name} has moved into the apartment!`);
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
        }
    });
    
    closeNewMiiModal();
    renderMiiSelector(); 
    renderResidentList();
    miiMessage.textContent = `${name} has joined the town!`;
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
            
            miiMessage.textContent = `🎉 Caretaker system purchased! All Miis will now be automatically cared for.`;
            renderMoney();
            renderCaretakerStatus();
            if (!storeModal.classList.contains('hidden')) renderStore(); 
            saveGame();
        }
    } else {
        alert(`You only have 💰${gameData.money}. You need 💰${CARETAKER_PURCHASE_PRICE} to purchase the permanent Caretaker.`);
    }
}

// --- Relationship System ---

function openRelationshipModal() {
    const mii = miiList[currentMiiIndex];
    if (!mii) {
        miiMessage.textContent = "Please select a resident to view relationships.";
        return;
    }
    if (mii.isDead) {
         miiMessage.textContent = `${mii.name} is deceased and cannot interact.`;
         return;
    }

    relMiiName.textContent = mii.name;
    
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
    const otherActiveMiis = miiList.filter(m => !m.isDead && m.id !== mii.id);

    if (otherActiveMiis.length === 0) {
        relActionsDiv.innerHTML = '<p>Need more residents for relationships!</p>';
        return;
    }

    // --- Actions based on current status (Breakup/Proposal) ---
    if (mii.relationship.status !== 'single') {
        const partner = miiList.find(m => m.id === mii.relationship.partnerId);
        
        if (partner && !partner.isDead) {
            // Breakup Button
            relActionsDiv.innerHTML += `<button onclick="attemptBreakup('${partner.id}')">💔 Break Up with ${partner.name}</button>`;
            
            // Proposal Button
            if (mii.relationship.status === 'dating') {
                 relActionsDiv.innerHTML += `<button class="propose" onclick="attemptProposal('${partner.id}')">💍 Propose to ${partner.name}</button>`;
            }
        }
    }

    // --- Actions for all Miis (Friendship/Dating Attempts) ---
    
    const eligibleTargets = otherActiveMiis.filter(target => 
        target.id !== mii.relationship.partnerId
    );

    if (eligibleTargets.length > 0 && mii.relationship.status !== 'spouse') {
        let interactionOptions = eligibleTargets.map(target => {
            let actionType = 'Befriend';
            let actionFunction = 'attemptFriendship';
            
            const isFriend = mii.relationship.friends.includes(target.id);
            const canDate = target.relationship.status === 'single' && mii.relationship.status === 'single' && mii.gender !== target.gender && mii.happiness > 60;
            
            if (isFriend) {
                return ''; 
            } else if (canDate) {
                 actionType = 'Ask to Date';
                 actionFunction = 'attemptDating';
            }
            
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
        mii.relationship.friends.push(target.id);
        target.relationship.friends.push(mii.id);
        mii.happiness = Math.min(100, mii.happiness + FRIENDSHIP_HAPPINESS_BONUS);
        target.happiness = Math.min(100, target.happiness + FRIENDSHIP_HAPPINESS_BONUS);
        miiMessage.textContent = `🥳 ${mii.name} is now friends with ${target.name}!`;
    } else {
        mii.happiness = Math.max(0, mii.happiness - 5);
        miiMessage.textContent = `😔 ${target.name} politely ignored ${mii.name}'s attempt to be friends.`;
    }

    renderCurrentMiiState();
    openRelationshipModal();
    saveGame();
}

function attemptDating(targetId) {
    const mii = miiList[currentMiiIndex];
    const target = miiList.find(m => m.id === parseInt(targetId)); 

    if (!mii || !target) {
        miiMessage.textContent = "Error: Mii or target not found for dating attempt.";
        return;
    }
    
    if (mii.gender === target.gender) {
        miiMessage.textContent = `${mii.name} and ${target.name} share a great friendship, but not romantic interest.`;
        return;
    }
    
    const success = (mii.happiness + target.happiness) / 200 > DATING_FAIL_CHANCE && Math.random() < (1 - DATING_FAIL_CHANCE);

    if (success) {
        mii.relationship.status = 'dating';
        mii.relationship.partnerId = target.id;
        target.relationship.status = 'dating';
        target.relationship.partnerId = mii.id;
        
        mii.happiness = Math.min(100, mii.happiness + DATING_HAPPINESS_BONUS);
        target.happiness = Math.min(100, target.happiness + DATING_HAPPINESS_BONUS);
        
        miiMessage.textContent = `💖 ${target.name} accepted! ${mii.name} and ${target.name} are now dating!`;
    } else {
        mii.happiness = Math.max(0, mii.happiness - 10);
        miiMessage.textContent = `💔 ${target.name} said no. ${mii.name} is sad.`;
    }
    
    renderCurrentMiiState();
    openRelationshipModal();
    saveGame();
}

function attemptBreakup(partnerId) {
    const mii = miiList[currentMiiIndex];
    const partner = miiList.find(m => m.id === parseInt(partnerId));
    
    if (!mii || !partner) {
        miiMessage.textContent = "Error: Mii or partner not found for breakup.";
        return;
    }
    
    if (partner.isDead) { 
        miiMessage.textContent = `You can't break up with ${partner.name} - they have passed away.`;
        return;
    }

    if (confirm(`Are you sure ${mii.name} wants to break up with ${partner.name}? This will cause sadness!`)) {
        mii.relationship.status = 'single';
        mii.relationship.partnerId = null;
        mii.happiness = Math.max(0, mii.happiness - BREAKUP_HAPPINESS_PENALTY);
        
        partner.relationship.status = 'single';
        partner.relationship.partnerId = null;
        partner.happiness = Math.max(0, partner.happiness - BREAKUP_HAPPINESS_PENALTY);
        
        miiMessage.textContent = `😭 ${mii.name} and ${partner.name} broke up! That was rough.`;
    }

    renderCurrentMiiState();
    openRelationshipModal();
    saveGame();
}

function attemptProposal(partnerId) {
    const mii = miiList[currentMiiIndex];
    const partner = miiList.find(m => m.id === partnerId);

    if (!mii || !partner) {
        miiMessage.textContent = "Error: Mii or partner not found for proposal.";
        return;
    }
    
    if (partner.isDead) {
        miiMessage.textContent = `You can't propose to ${partner.name} - they have passed away.`;
        return;
    }

    if (mii.relationship.status !== 'dating') {
        miiMessage.textContent = "Only dating Miis can propose marriage.";
        return;
    }
    
    const successChance = (mii.happiness + partner.happiness) / 200 * PROPOSAL_CHANCE;

    if (Math.random() < successChance) {
        mii.relationship.status = 'spouse';
        partner.relationship.status = 'spouse';
        
        mii.happiness = Math.min(100, mii.happiness + SPOUSE_HAPPINESS_BONUS);
        partner.happiness = Math.min(100, partner.happiness + SPOUSE_HAPPINESS_BONUS);
        
        miiMessage.textContent = `🔔 ${partner.name} said YES! ${mii.name} and ${partner.name} are now happily married! 💍`;
    } else {
        mii.happiness = Math.max(0, mii.happiness - 20);
        miiMessage.textContent = `😔 ${partner.name} wasn't ready to get married yet. ${mii.name} is heartbroken.`;
    }
    
    renderCurrentMiiState();
    openRelationshipModal();
    saveGame();
}


// --- Core Game Loop Functions ---

function updateAllMiiStats() {
    const activeMiis = miiList.filter(mii => !mii.isDead);
    
    // 1. **Caretaker System Action**
    if (gameData.isCaretakerActive) {
        handleCaretaker(activeMiis);
    }
    
    // 2. **Automatic Mode Actions (Work/Dating)**
    if (gameData.mode === 'automatic') {
        handleAutomaticActions(activeMiis);
    }

    // 3. **Investment Income (Passive)**
    const passiveIncome = Math.floor(gameData.investmentTotal / INVESTMENT_RATE);
    if (passiveIncome > 0) {
        gameData.money += passiveIncome;
    }
    
    // 4. **Bank Savings Interest**
    const interestEarned = Math.floor(gameData.savingsTotal * SAVINGS_INTEREST_RATE);
    if (interestEarned > 0) {
        gameData.savingsTotal += interestEarned;
        // Provide a subtle update message if no critical message is being shown
        if (miiMessage.textContent.includes('doing great') || miiMessage.textContent.includes('awake and refreshed')) {
            miiMessage.textContent = `💰 You earned 💰${interestEarned} in savings interest!`;
        }
    }

    // 5. **Relationship Event Handling**
    handleRelationshipEvents(activeMiis); 

    // 6. **Mii Stat Decay, Relationship Buffs, and Requests**
    miiList.forEach(mii => {
        if (mii.isSleeping || mii.isDead) return; 

        // Apply Relationship Buffs
        if (mii.relationship.status === 'dating') {
            mii.happiness = Math.min(100, mii.happiness + 1); 
        } else if (mii.relationship.status === 'spouse') {
            mii.happiness = Math.min(100, mii.happiness + 2); 
        }
        
        // Decay logic
        mii.hunger = Math.max(0, mii.hunger - DECAY_RATE);
        let happinessDecay = mii.hunger < 30 ? DECAY_RATE * 2 : DECAY_RATE;
        if (mii.personality === 'stubborn') happinessDecay *= 0.7; 
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
            if (mii.id === miiList[currentMiiIndex]?.id) {
                 miiMessage.textContent = `💔 Oh no! ${mii.name} has passed away due to extreme sadness.`;
            }
            
            if (mii.relationship.partnerId) {
                const partner = miiList.find(m => m.id === mii.relationship.partnerId);
                if (partner) {
                    partner.relationship.status = 'single';
                    partner.relationship.partnerId = null;
                    partner.happiness = Math.max(0, partner.happiness - 60); 
                }
            }
        }
    });
    
    renderMoney(); 
    renderCurrentMiiState(); 
    renderMiiSelector(); 
    renderResidentList(); 
    checkIfTownIsOver();
    saveGame(); 
}

function handleRelationshipEvents(activeMiis) {
    activeMiis.forEach(mii => {
        if (mii.isSleeping || mii.isDead) return;

        // 1. Arguments (Dating/Spouse)
        if (mii.relationship.status !== 'single' && Math.random() < ARGUE_CHANCE) {
            const partner = miiList.find(m => m.id === mii.relationship.partnerId);
            if (partner && !partner.isDead) {
                if (mii.happiness > 40 || partner.happiness > 40) { 
                    mii.happiness = Math.max(0, mii.happiness - ARGUE_HAPPINESS_LOSS);
                    partner.happiness = Math.max(0, partner.happiness - ARGUE_HAPPINESS_LOSS);
                    
                    if (mii.id === miiList[currentMiiIndex]?.id || partner.id === miiList[currentMiiIndex]?.id) {
                        miiMessage.textContent = `🚨 ${mii.name} and ${partner.name} had a nasty argument! Happiness dropped.`;
                    }
                }
            }
        }

        // 2. Makeups (Dating/Spouse)
        if (mii.relationship.status !== 'single' && mii.happiness < 30 && Math.random() < MAKEUP_CHANCE) {
            const partner = miiList.find(m => m.id === mii.relationship.partnerId);
            if (partner && !partner.isDead && partner.happiness < 30) {
                mii.happiness = Math.min(100, mii.happiness + MAKEUP_HAPPINESS_GAIN);
                partner.happiness = Math.min(100, partner.happiness + MAKEUP_HAPPINESS_GAIN);

                if (mii.id === miiList[currentMiiIndex]?.id || partner.id === miiList[currentMiiIndex]?.id) {
                    miiMessage.textContent = `🥰 ${mii.name} and ${partner.name} made up after their fight! Huge happiness boost!`;
                }
            }
        }

        // 3. Friend Arguments (Friendship decay)
        const friendsToIterate = [...mii.relationship.friends]; 

        friendsToIterate.forEach((friendId, index) => {
            const friend = miiList.find(m => m.id === friendId);
            if (friend && !friend.isDead) {
                if (mii.id < friend.id && Math.random() < FRIEND_ARGUE_CHANCE) {
                    
                    mii.happiness = Math.max(0, mii.happiness - FRIEND_ARGUE_LOSS);
                    friend.happiness = Math.max(0, friend.happiness - FRIEND_ARGUE_LOSS);

                    if (Math.random() < 0.2) { 
                        mii.relationship.friends = mii.relationship.friends.filter(id => id !== friend.id);
                        friend.relationship.friends = friend.relationship.friends.filter(id => id !== mii.id);
                            
                        if (mii.id === miiList[currentMiiIndex]?.id || friend.id === miiList[currentMiiIndex]?.id) {
                            miiMessage.textContent = `💥 ${mii.name} and ${friend.name} had a huge fight and are no longer friends!`;
                        }
                    } else {
                        if (mii.id === miiList[currentMiiIndex]?.id || friend.id === miiList[currentMiiIndex]?.id) {
                            miiMessage.textContent = `😒 ${mii.name} and ${friend.name} had a minor disagreement.`;
                        }
                    }
                }
            }
        });
    });
}


function handleCaretaker(activeMiis) {
    activeMiis.forEach(mii => {
        if (mii.isSleeping) return;
        
        // 1. Food Check
        if (mii.hunger < CARETAKER_THRESHOLD) {
            const food = ITEMS[CARETAKER_FOOD];
            mii.hunger = Math.min(100, mii.hunger + food.hunger);
            mii.happiness = Math.min(100, mii.happiness + food.happiness);
            mii.currentRequest = null; 
        }
        
        // 2. Mood Check
        if (mii.happiness < CARETAKER_THRESHOLD) {
            const mood = ITEMS[CARETAKER_MOOD];
            mii.happiness = Math.min(100, mii.happiness + mood.happiness);
            mii.currentRequest = null;
        }
    });
}

function handleAutomaticActions(activeMiis) {
    activeMiis.forEach(mii => {
        if (mii.isSleeping) return;

        // 1. Automatic Working
        if (Math.random() < AUTOMATIC_WORK_CHANCE && mii.happiness > 60) {
            gameData.money += 10;
            mii.happiness = Math.max(0, mii.happiness - 5);
        }

        // 2. Automatic Dating/Proposing
        if (Math.random() < AUTOMATIC_DATING_CHANCE) {
            const potentialTargets = activeMiis.filter(target => target.id !== mii.id);
            if (potentialTargets.length === 0) return;

            const partner = mii.relationship.partnerId ? activeMiis.find(m => m.id === mii.relationship.partnerId) : null;
            
            if (mii.relationship.status === 'dating' && partner) {
                if (Math.random() < PROPOSAL_CHANCE * 1.5) { 
                    if (!partner.isDead) attemptProposal(partner.id);
                }
            } else if (mii.relationship.status === 'single') {
                const dateTarget = potentialTargets
                    .filter(t => t.relationship.status === 'single' && t.gender !== mii.gender)
                    .sort(() => 0.5 - Math.random())[0]; 
                
                if (dateTarget) {
                    attemptDating(dateTarget.id);
                }
            }
        }
    });
}

// --- Investment System (FIXED) ---

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
    
    miiMessage.textContent = `💰 Invested 💰${amount}. Passive income rate updated!`;
    
    renderMoney();
    renderInvestmentModal();
    saveGame();
}


// --- Bank Savings System (FIXED) ---

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
    
    miiMessage.textContent = `🏦 Deposited 💰${amount} into savings. Keep earning that safe interest!`;
    
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

    gameData.savingsTotal -= amount;
    gameData.money += amount;
    
    miiMessage.textContent = `🏦 Withdrew 💰${amount} from savings.`;
    
    renderMoney();
    renderBankModal();
    saveGame();
}


// --- Town Party Function ---

function throwParty() {
    const activeMiis = miiList.filter(mii => !mii.isDead);
    
    if (activeMiis.length === 0) {
        alert("You need at least one resident to throw a party!");
        return;
    }

    if (gameData.money < PARTY_COST) {
        alert(`You need 💰${PARTY_COST} to throw a town party, but you only have 💰${gameData.money}!`);
        return;
    }

    if (confirm(`Throw a party for all ${activeMiis.length} residents for 💰${PARTY_COST}? This will give a huge happiness boost!`)) {
        gameData.money -= PARTY_COST;

        activeMiis.forEach(mii => {
            mii.happiness = Math.min(100, mii.happiness + PARTY_HAPPINESS_BONUS);
            mii.isSleeping = false;
            mii.currentRequest = null;
        });

        miiMessage.textContent = `🥳 PARTY TIME! Everyone's happiness increased by ${PARTY_HAPPINESS_BONUS}!`;
        renderMoney();
        renderCurrentMiiState();
        renderResidentList();
        saveGame();
    }
}

// --- Other Action/Logic Functions (Work, Sleep, Items, Store, Save/Load) ---

function workForMoney() {
    const mii = miiList[currentMiiIndex];
    if (!mii) return;
    if (mii.isDead) return;

    if (mii.happiness < 30) {
        miiMessage.textContent = `${mii.name} is too sad to work right now. Cheer them up!`;
        return;
    }
    
    if (mii.isSleeping) {
        miiMessage.textContent = `${mii.name} is sleeping. Wake them up to work!`;
        return;
    }
    
    const earned = 10;
    gameData.money += earned;
    mii.happiness = Math.max(0, mii.happiness - 5); 
    
    renderMoney(); 
    renderCurrentMiiState();
    miiMessage.textContent = `${mii.name} worked hard and earned 💰${earned} gold for the town!`;
    saveGame();
}

function toggleSleep() {
    const mii = miiList[currentMiiIndex];
    if (!mii) return;
    if (mii.isDead) return;

    mii.isSleeping = !mii.isSleeping;
    
    if (mii.isSleeping) {
        miiMessage.textContent = `${mii.name} is sleeping peacefully... Decay is paused.`;
        if (!mii.isSleeping) mii.happiness = Math.min(100, mii.happiness + 5); 
    } else {
        miiMessage.textContent = `${mii.name} is awake and refreshed!`;
    }
    renderCurrentMiiState();
    renderResidentList(); 
    saveGame();
}

function renderInventory() {
    inventoryList.innerHTML = ''; 
    const mii = miiList[currentMiiIndex];
    
    let hasItems = false;
    for (const key in gameData.inventory) {
        const count = gameData.inventory[key];
        if (count > 0) {
            hasItems = true;
            const item = ITEMS[key];
            const slot = document.createElement('div');
            slot.className = 'item-slot';
            
            if (currentMiiIndex >= 0 && mii && !mii.isSleeping && !mii.isDead) {
                slot.setAttribute('onclick', `useItem('${key}')`);
            } else {
                 slot.style.opacity = '0.5';
                 slot.style.cursor = 'default';
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

        let hungerBoost = item.hunger || 0;
        let happinessBoost = item.happiness || 0;
        let isFulfillingRequest = false;

        if (mii.currentRequest === key) {
            happinessBoost += 30; 
            miiMessage.textContent = `🎉 ${mii.name} got exactly what they wanted! Huge happiness boost!`;
            mii.currentRequest = null;
            isFulfillingRequest = true;
        }

        if (item.type === 'food') {
            mii.hunger = Math.min(100, mii.hunger + hungerBoost);
        }
        
        if (mii.personality === 'stubborn' && item.type === 'mood' && !isFulfillingRequest) {
            happinessBoost *= 0.5; 
        }

        mii.happiness = Math.min(100, mii.happiness + happinessBoost);
        
        if (!isFulfillingRequest) {
            miiMessage.textContent = `${mii.name} used the ${item.name}.`;
        }
        
        // Jealousy Check
        if (mii.relationship.status !== 'single') {
            const partner = miiList.find(m => m.id === mii.relationship.partnerId);
            if (partner && !partner.isDead) { 
                if (!isFulfillingRequest && Math.random() < JEALOUSY_CHANCE) {
                    mii.happiness = Math.max(0, mii.happiness - JEALOUSY_HAPPINESS_LOSS);
                    partner.happiness = Math.max(0, partner.happiness - JEALOUSY_HAPPINESS_LOSS);
                    miiMessage.textContent = `😠 ${partner.name} got a little jealous that ${mii.name} is distracted by the ${item.name}.`;
                }
            }
        }

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

function checkIfTownIsOver() {
    if (miiList.length > 0 && miiList.every(mii => mii.isDead)) {
        clearInterval(gameLoop);
        gameLoop = null;
        miiMessage.textContent = `🚨 TOWN OVER! All residents have departed Maple Island.`;
        saveMessage.textContent = "The game has ended. Please reset to start a new town.";
        alert("TOWN OVER! No residents remaining.");
    }
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
        
        miiList = loaded.miiList || [];
        currentMiiIndex = loaded.currentMiiIndex || 0;
        
        gameData.money = loaded.gameData.money || 0;
        gameData.inventory = loaded.gameData.inventory || {};
        gameData.isCaretakerActive = loaded.gameData.isCaretakerActive || false;
        gameData.investmentTotal = loaded.gameData.investmentTotal || 0;
        gameData.savingsTotal = loaded.gameData.savingsTotal || 0; 
        gameData.mode = loaded.gameData.mode || 'manual'; 
        gameData.difficulty = loaded.gameData.difficulty || 'normal';

        miiList.forEach(mii => {
            mii.isDead = mii.isDead || false;
            mii.isSleeping = mii.isSleeping || false;
            mii.currentRequest = mii.currentRequest || null;
            mii.gender = mii.gender || 'male'; 
            mii.relationship = mii.relationship || { status: 'single', partnerId: null, friends: [] };
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
    // Check if the click target is the modal backdrop, and not the modal content itself
    if (event.target === storeModal) {
        closeStore();
    }
    if (event.target === newMiiModal) {
        closeNewMiiModal();
    }
    if (event.target === investmentModal) {
        closeInvestmentModal();
    }
    if (event.target === relationshipModal) {
        closeRelationshipModal();
    }
    if (event.target === bankModal) {
        closeBankModal();
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
    }
});


// Start the whole process when the script loads
initGame();
