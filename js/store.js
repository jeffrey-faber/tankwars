import { state } from './gameContext.js';

export class Store {
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
        
        // Add Start Match button
        this.addStartMatchButton();
        
        // Add weapon selector UI
        this.createWeaponSelector();

        // Initial visibility check
        this.updateVisibility();
    }

    addStartMatchButton() {
        const startButton = document.createElement('button');
        startButton.id = 'startMatchButton';
        startButton.textContent = 'START MATCH';
        startButton.style.position = 'absolute';
        startButton.style.top = '50%';
        startButton.style.left = '50%';
        startButton.style.transform = 'translate(-50%, -50%)';
        startButton.style.backgroundColor = '#ff00ff';
        startButton.style.color = 'white';
        startButton.style.border = 'none';
        startButton.style.padding = '20px 40px';
        startButton.style.cursor = 'pointer';
        startButton.style.fontFamily = "'Press Start 2P', cursive";
        startButton.style.fontSize = '20px';
        startButton.style.zIndex = '100';
        startButton.style.boxShadow = '0 0 20px #ff00ff';
        
        document.body.appendChild(startButton);
        
        startButton.addEventListener('click', () => {
            state.gameState = 'PLAYING';
            this.updateVisibility();
            // Refresh selector to show purchased items
            if (state.tanks && state.tanks[state.currentPlayer]) {
                this.updateWeaponSelector(state.tanks[state.currentPlayer]);
            }
        });
    }

    updateVisibility() {
        const storeButton = document.getElementById('storeButton');
        const startMatchButton = document.getElementById('startMatchButton');
        const weaponSelector = document.getElementById('weaponSelector');
        
        if (state.gameState === 'LOBBY') {
            // Hide lobby buttons if store is open to prevent overlap
            if (storeButton) storeButton.style.display = this.isOpen ? 'none' : 'block';
            if (startMatchButton) startMatchButton.style.display = this.isOpen ? 'none' : 'block';
            if (weaponSelector) weaponSelector.style.display = 'none';
        } else {
            if (storeButton) storeButton.style.display = 'none';
            if (startMatchButton) startMatchButton.style.display = 'none';
            if (weaponSelector) {
                // Only show if we have items or if we explicitly want to see default
                // User said "When there are no items, I see a small blue selector box and nothing inside"
                // So if inventory is empty, hide it.
                const hasItems = this.currentTank && this.currentTank.inventory && this.currentTank.inventory.length > 0;
                weaponSelector.style.display = hasItems ? 'flex' : 'none';
            }
        }
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
            if (!state.tanks[state.currentPlayer].isAI) {
                this.open(state.tanks[state.currentPlayer]);
            }
        });
    }
    
    createWeaponSelector() {
        // Create weapon selector UI
        const weaponSelector = document.createElement('div');
        weaponSelector.id = 'weaponSelector';
        weaponSelector.className = 'weapon-selector';
        weaponSelector.style.display = 'none'; // Hidden by default
        
        document.body.appendChild(weaponSelector);
    }
    
    getWeaponIcon(id) {
        switch(id) {
            case 'default': return '💣';
            case 'nuke': return '☢️';
            case 'laser': return '⚡';
            case 'shield': return '🛡️';
            case 'health': return '❤️';
            default: return '❓';
        }
    }

    updateWeaponSelector(tank) {
        this.currentTank = tank; // Ensure we track current tank
        const selector = document.getElementById('weaponSelector');
        if (!selector) return;
        
        // Update visibility logic based on new rules
        this.updateVisibility();
        
        // If hidden by updateVisibility, stop
        if (selector.style.display === 'none') return;
        
        // Clear previous buttons
        selector.innerHTML = '';
        
        // Helper to create icon
        const createIcon = (id, name, count, isSelected, key, description) => {
            const icon = document.createElement('div');
            icon.className = `weapon-icon ${isSelected ? 'selected' : ''}`;
            icon.innerHTML = `
                <span class="weapon-key">${key}</span>
                ${this.getWeaponIcon(id)}
                ${count > 0 ? `<span class="weapon-count">${count}</span>` : ''}
                <div class="weapon-tooltip">
                    <span class="weapon-tooltip-title">${name}</span>
                    ${description}
                </div>
            `;
            icon.addEventListener('click', () => {
                if (id === 'default') {
                    tank.selectedWeapon = 'default';
                } else {
                    tank.useItem(id);
                }
                this.updateWeaponSelector(tank);
            });
            return icon;
        };

        // Add default weapon (Key: 0)
        selector.appendChild(createIcon(
            'default', 
            'Standard Shell', 
            0, 
            tank.selectedWeapon === 'default', 
            '0', 
            'Basic projectile.'
        ));
        
        // Add weapons from inventory
        if (tank.inventory) {
            // Group inventory by ID
            const uniqueItems = {};
            tank.inventory.forEach(item => {
                if (!uniqueItems[item.id]) {
                    uniqueItems[item.id] = { ...item, count: 0 };
                }
                uniqueItems[item.id].count++;
            });

            // We want fixed slots for hotkeys 1-9 potentially, or just dynamic
            // For now, dynamic list based on unique items held
            Object.values(uniqueItems).forEach((item, index) => {
                if (index < 9) { // keys 1-9
                    selector.appendChild(createIcon(
                        item.id,
                        item.name,
                        item.count,
                        tank.selectedWeapon === item.id,
                        index + 1,
                        item.description
                    ));
                }
            });
        }
    }
    
    open(tank) {
        if (tank.isAI) return; // AI can't open the store
        
        this.currentTank = tank;
        this.isOpen = true;
        this.updateVisibility(); // Hide lobby buttons
        
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
        this.updateVisibility(); // Show lobby buttons
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
            const count = (this.currentTank.inventory || []).filter(i => i.id === item.id).length;
            const itemElement = document.createElement('div');
            itemElement.className = 'store-item';
            itemElement.innerHTML = `
                <h3>${item.name} ${count > 0 ? `(${count} owned)` : ''}</h3>
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