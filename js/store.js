class Store {
    constructor() {
        this.items = [
            {
                id: 'nuke',
                name: 'Nuke',
                description: 'A powerful explosive with larger blast radius',
                price: 50,
                effect: {
                    type: 'weapon',
                    radius: 50,  // Regular explosion radius is 15
                    damage: 150
                }
            },
            {
                id: 'laser',
                name: 'Laser',
                description: 'High-velocity projectile, less affected by wind',
                price: 40,
                effect: {
                    type: 'weapon',
                    speedMultiplier: 2.0,
                    damage: 80
                }
            },
            {
                id: 'shield',
                name: 'Shield',
                description: 'Protects your tank from one hit',
                price: 30,
                effect: {
                    type: 'defense',
                    uses: 1
                }
            },
            {
                id: 'health',
                name: 'Health Pack',
                description: 'Heals 50 health points',
                price: 25,
                effect: {
                    type: 'healing',
                    amount: 50
                }
            }
        ];
        
        this.isOpen = false;
        this.currentTank = null;
    }
    
    init(tanks) {
        // Store the tanks reference
        this.tanks = tanks;
        
        // Create store overlay if it doesn't exist
        if (!document.getElementById('storeOverlay')) {
            this.createStoreUI();
        }
        
        // Add store button to HUD
        this.addStoreButton();
        
        // Add weapon selector UI
        this.createWeaponSelector();
    }
    
    createStoreUI() {
        // Create store overlay
        const overlay = document.createElement('div');
        overlay.id = 'storeOverlay';
        overlay.className = 'hidden';
        overlay.innerHTML = `
            <div class="store-container">
                <h2>TANK STORE</h2>
                <div class="store-items"></div>
                <div class="store-controls">
                    <button id="closeStore">CLOSE</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Add event listener to close button
        const closeBtn = overlay.querySelector('#closeStore');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
    }
    
    addStoreButton() {
        // Add store button to game canvas area
        const storeButton = document.createElement('button');
        storeButton.id = 'storeButton';
        storeButton.textContent = 'STORE';
        storeButton.style.position = 'absolute';
        storeButton.style.top = '10px';
        storeButton.style.right = '10px';
        storeButton.style.backgroundColor = '#4CAF50';
        storeButton.style.color = 'white';
        storeButton.style.border = 'none';
        storeButton.style.padding = '10px 20px';
        storeButton.style.cursor = 'pointer';
        storeButton.style.fontFamily = "'Press Start 2P', cursive";
        storeButton.style.fontSize = '12px';
        storeButton.style.zIndex = '50';
        
        document.body.appendChild(storeButton);
        
        // Add event listener
        storeButton.addEventListener('click', () => {
            // Only open store for current player if they're not AI
            if (!tanks[currentPlayer].isAI) {
                this.open(tanks[currentPlayer]);
            }
        });
    }
    
    createWeaponSelector() {
        // Create weapon selector UI
        const weaponSelector = document.createElement('div');
        weaponSelector.id = 'weaponSelector';
        weaponSelector.className = 'weapon-selector';
        weaponSelector.style.position = 'absolute';
        weaponSelector.style.bottom = '10px';
        weaponSelector.style.left = '50%';
        weaponSelector.style.transform = 'translateX(-50%)';
        weaponSelector.style.zIndex = '50';
        weaponSelector.style.display = 'none'; // Hidden by default
        
        document.body.appendChild(weaponSelector);
    }
    
    updateWeaponSelector(tank) {
        const selector = document.getElementById('weaponSelector');
        if (!selector) return;
        
        // Only show weapon selector for human players
        if (tank.isAI || !tank.alive) {
            selector.style.display = 'none';
            return;
        }
        
        // Show weapon selector
        selector.style.display = 'block';
        
        // Clear previous buttons
        selector.innerHTML = '';
        
        // Add default weapon
        const defaultBtn = document.createElement('button');
        defaultBtn.className = 'weapon-button';
        defaultBtn.textContent = 'Default';
        defaultBtn.addEventListener('click', () => {
            tank.selectedWeapon = 'default';
            this.updateWeaponSelector(tank); // Refresh buttons
        });
        
        if (tank.selectedWeapon === 'default') {
            defaultBtn.style.border = '2px solid white';
        }
        
        selector.appendChild(defaultBtn);
        
        // Add weapons from inventory
        if (tank.inventory && tank.inventory.length > 0) {
            const weaponItems = tank.inventory.filter(item => 
                item.effect.type === 'weapon' || item.effect.type === 'defense'
            );
            
            const uniqueItems = {};
            weaponItems.forEach(item => {
                if (!uniqueItems[item.id]) {
                    uniqueItems[item.id] = {
                        item: item,
                        count: 1
                    };
                } else {
                    uniqueItems[item.id].count++;
                }
            });
            
            Object.values(uniqueItems).forEach(entry => {
                const btn = document.createElement('button');
                btn.className = 'weapon-button';
                btn.textContent = `${entry.item.name} (${entry.count})`;
                btn.addEventListener('click', () => {
                    tank.useItem(entry.item.id);
                    this.updateWeaponSelector(tank); // Refresh buttons
                });
                
                if (tank.selectedWeapon === entry.item.id) {
                    btn.style.border = '2px solid white';
                }
                
                selector.appendChild(btn);
            });
        }
    }
    
    open(tank) {
        if (tank.isAI) return; // AI can't open the store
        
        this.currentTank = tank;
        this.isOpen = true;
        
        const overlay = document.getElementById('storeOverlay');
        if (overlay) {
            overlay.classList.remove('hidden');
            this.updateStoreItems();
            
            // Ensure close button works
            const closeBtn = overlay.querySelector('#closeStore');
            if (closeBtn) {
                // Remove any existing event listeners
                const newCloseBtn = closeBtn.cloneNode(true);
                closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
                
                // Add new event listener
                newCloseBtn.addEventListener('click', () => {
                    this.close();
                });
            }
            
            // Add ESC key listener to close store
            const closeHandler = (e) => {
                if (e.key === 'Escape') {
                    this.close();
                    document.removeEventListener('keydown', closeHandler);
                }
            };
            document.addEventListener('keydown', closeHandler);
        }
    }
    
    close() {
        this.isOpen = false;
        const overlay = document.getElementById('storeOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
        this.currentTank = null;
    }
    
    updateStoreItems() {
        const container = document.querySelector('.store-items');
        if (!container || !this.currentTank) return;
        
        container.innerHTML = '';
        
        // Add max height to prevent overflow
        container.style.maxHeight = '60vh';
        container.style.overflowY = 'auto';
        container.style.padding = '10px';
        
        this.items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'store-item';
            itemElement.innerHTML = `
                <h3>${item.name}</h3>
                <p class="item-description">${item.description}</p>
                <p class="item-price">${item.price} Coins</p>
                <button class="buy-button ${this.currentTank.currency < item.price ? 'disabled' : ''}" 
                    data-item-id="${item.id}" 
                    ${this.currentTank.currency < item.price ? 'disabled' : ''}>
                    BUY
                </button>
            `;
            
            const buyButton = itemElement.querySelector('.buy-button');
            buyButton.addEventListener('click', () => {
                this.buyItem(item.id);
            });
            
            container.appendChild(itemElement);
        });
        
        // Display current currency
        const currencyDisplay = document.createElement('div');
        currencyDisplay.style.marginTop = '20px';
        currencyDisplay.style.fontSize = '18px';
        currencyDisplay.style.color = 'gold';
        currencyDisplay.textContent = `Your coins: ${this.currentTank.currency}`;
        
        container.appendChild(currencyDisplay);
    }
    
    buyItem(itemId) {
        if (!this.currentTank) return;
        
        const item = this.items.find(i => i.id === itemId);
        if (!item) return;
        
        if (this.currentTank.currency >= item.price) {
            // Deduct the price
            this.currentTank.currency -= item.price;
            
            // Copy the item to the tank's inventory
            if (!this.currentTank.inventory) {
                this.currentTank.inventory = [];
            }
            
            // Create a copy of the item for the inventory
            const inventoryItem = JSON.parse(JSON.stringify(item));
            this.currentTank.inventory.push(inventoryItem);
            
            // Special case for healing items - use immediately
            if (item.effect.type === 'healing') {
                this.currentTank.health = Math.min(this.currentTank.maxHealth, this.currentTank.health + item.effect.amount);
                // Remove from inventory
                const index = this.currentTank.inventory.findIndex(i => i.id === itemId);
                if (index !== -1) {
                    this.currentTank.inventory.splice(index, 1);
                }
                this.showMessage(`Healed +${item.effect.amount} HP!`);
            } else {
                this.showMessage(`You bought ${item.name}!`);
            }
            
            // Update the store UI
            this.updateStoreItems();
            this.updateWeaponSelector(this.currentTank);
        } else {
            this.showMessage('Not enough coins!');
        }
    }
    
    showMessage(message) {
        const container = document.querySelector('.store-container');
        if (!container) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = 'store-message';
        messageElement.textContent = message;
        
        // Remove any existing messages
        const oldMessages = document.querySelectorAll('.store-message');
        oldMessages.forEach(msg => msg.remove());
        
        container.appendChild(messageElement);
        
        // Remove after 2 seconds
        setTimeout(() => {
            if (messageElement.parentNode === container) {
                container.removeChild(messageElement);
            }
        }, 2000);
    }
    
    // AI will randomly buy items they can afford
    aiPurchase(aiTank) {
        if (!aiTank.isAI || !aiTank.alive) return;
        
        // AI has a chance to buy an item if they have enough currency
        const affordableItems = this.items.filter(item => aiTank.currency >= item.price);
        
        if (affordableItems.length > 0 && Math.random() < 0.3) { // 30% chance to buy an item
            const randomItem = affordableItems[Math.floor(Math.random() * affordableItems.length)];
            
            // Deduct the price
            aiTank.currency -= randomItem.price;
            
            // Add item to tank's inventory
            if (!aiTank.inventory) {
                aiTank.inventory = [];
            }
            
            // Create a copy of the item
            const inventoryItem = JSON.parse(JSON.stringify(randomItem));
            aiTank.inventory.push(inventoryItem);
            
            console.log(`AI ${aiTank.name} bought ${randomItem.name}`);
            
            // Special case for healing items - use immediately
            if (randomItem.effect.type === 'healing') {
                aiTank.health = Math.min(aiTank.maxHealth, aiTank.health + randomItem.effect.amount);
                // Remove from inventory
                const index = aiTank.inventory.findIndex(i => i.id === randomItem.id);
                if (index !== -1) {
                    aiTank.inventory.splice(index, 1);
                }
            }
        }
    }
}