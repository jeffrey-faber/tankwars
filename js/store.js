import { state } from './gameContext.js';

export class Store {
    constructor() {
        this.items = [
            {
                id: 'heavy',
                name: 'Heavy Shot',
                description: 'Reliable standard ammo with larger blast.',
                price: 50,
                packSize: 5,
                category: 'weapons',
                effect: {
                    type: 'weapon',
                    radius: 30,
                    damage: 60
                }
            },
            {
                id: 'blockbuster',
                name: 'Blockbuster',
                description: 'A serious explosive for taking out bunkers.',
                price: 150,
                packSize: 3,
                category: 'weapons',
                effect: {
                    type: 'weapon',
                    radius: 60,
                    damage: 100
                }
            },
            {
                id: 'titan_shell',
                name: 'Titan Shell',
                description: 'Massive impact. High damage, large area.',
                price: 300,
                packSize: 1,
                category: 'weapons',
                effect: {
                    type: 'weapon',
                    radius: 120,
                    damage: 150
                }
            },
            {
                id: 'mega_nuke',
                name: 'Mega Nuke',
                description: 'The ultimate weapon. Destroys everything in a massive area.',
                price: 500,
                packSize: 1,
                category: 'weapons',
                effect: {
                    type: 'weapon',
                    radius: 250,
                    damage: 250
                }
            },
            {
                id: 'cluster_bomb',
                name: 'Cluster Bomb',
                description: 'Splits at the apex into multiple sub-munitions.',
                price: 150,
                packSize: 3,
                category: 'weapons',
                effect: {
                    type: 'weapon',
                    radius: 20,
                    damage: 30,
                    special: 'cluster'
                }
            },
            {
                id: 'laser',
                name: 'Laser',
                description: 'High-velocity projectile, less affected by wind',
                price: 40,
                category: 'weapons',
                effect: {
                    type: 'weapon',
                    speedMultiplier: 2.0,
                    damage: 80
                }
            },
            {
                id: 'shield',
                name: 'Shield',
                description: 'Protects your tank from one hit. Auto-active.',
                price: 100,
                category: 'defense',
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
                category: 'utility',
                effect: {
                    type: 'healing',
                    amount: 50
                }
            },
            {
                id: 'dirtball',
                name: 'Dirt Ball',
                description: 'Creates terrain on impact. Can bury enemies.',
                price: 35,
                category: 'weapons',
                effect: {
                    type: 'weapon',
                    radius: 30,
                    damage: 10,
                    special: 'add_terrain'
                }
            },
            {
                id: 'shovel',
                name: 'Shovel',
                description: 'Removes terrain in a cone. No damage to tanks.',
                price: 20,
                category: 'weapons',
                effect: {
                    type: 'weapon',
                    radius: 40,
                    damage: 0,
                    special: 'remove_terrain_cone'
                }
            },
            {
                id: 'parachute',
                name: 'Parachute',
                description: 'Prevents fall damage. Auto-active.',
                price: 50,
                category: 'defense',
                effect: {
                    type: 'defense',
                    special: 'parachute'
                }
            },
            {
                id: 'earthquake_s',
                name: 'Earthquake (S)',
                description: 'Small tremor. Freezes gravity, creates a few cracks.',
                price: 60,
                packSize: 3,
                category: 'weapons',
                effect: {
                    type: 'weapon',
                    radius: 40,
                    damage: 5,
                    special: 'earthquake',
                    intensity: 3
                }
            },
            {
                id: 'earthquake_m',
                name: 'Earthquake (M)',
                description: 'Medium quake. Significant terrain damage.',
                price: 120,
                category: 'weapons',
                effect: {
                    type: 'weapon',
                    radius: 80,
                    damage: 20,
                    special: 'earthquake',
                    intensity: 6
                }
            },
            {
                id: 'earthquake_l',
                name: 'The World Shatterer',
                description: 'MASSIVE earthquake. Shatters the landscape.',
                price: 350,
                category: 'weapons',
                effect: {
                    type: 'weapon',
                    radius: 160,
                    damage: 40,
                    special: 'earthquake',
                    intensity: 16
                }
            }
        ];
        
        this.isOpen = false;
        this.currentTank = null;
        this.currentCategory = 'weapons';
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
        startButton.style.zIndex = '150'; // Higher than overlays
        startButton.style.boxShadow = '0 0 20px #ff00ff';
        startButton.style.display = 'none'; // Hidden by default
        
        document.body.appendChild(startButton);
        
        startButton.addEventListener('click', () => {
            state.gameState = 'PLAYING';
            this.updateVisibility();
            document.getElementById('lobbyOverlay').classList.add('hidden');
            startButton.style.display = 'none';
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
            // Only show startMatchButton via main.js logic when lobby is done
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
            <div class="store-container" style="max-width: 900px; width: 90%;">
                <h2 id="storeTitle">TANK STORE</h2>
                <div class="store-tabs">
                    <button class="store-tab active" data-category="weapons">WEAPONS</button>
                    <button class="store-tab" data-category="defense">DEFENSE</button>
                    <button class="store-tab" data-category="utility">UTILITY</button>
                </div>
                <div class="store-items-grid"></div>
                <div class="store-controls">
                    <div id="storeCurrency" style="margin-bottom: 20px; color: gold;">Coins: 0</div>
                    <button id="backToLobby" style="background-color: #555; margin-right: 10px;">VIEW SCOREBOARD</button>
                    <button id="closeStore">FINISH SHOPPING</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Back to lobby logic
        overlay.querySelector('#backToLobby').addEventListener('click', () => {
            overlay.classList.add('hidden');
            document.getElementById('lobbyOverlay').classList.remove('hidden');
        });
        
        // Tab switching logic
        const tabs = overlay.querySelectorAll('.store-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentCategory = tab.dataset.category;
                this.updateStoreItems();
            });
        });

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
            case 'heavy': return '⚫';
            case 'blockbuster': return '🧨';
            case 'titan_shell': return '🌑';
            case 'mega_nuke': return '☢️';
            case 'cluster_bomb': return '🎆';
            case 'laser': return '⚡';
            case 'shield': return '🛡️';
            case 'health': return '❤️';
            case 'dirtball': return '🟤';
            case 'shovel': return '🥄';
            case 'parachute': return '🪂';
            case 'earthquake_s': return '📉';
            case 'earthquake_m': return '📊';
            case 'earthquake_l': return '🌋';
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
            icon.className = `weapon-icon ${isSelected ? 'selected' : ''} ${tank.isAI ? 'is-ai' : ''}`;
            icon.innerHTML = `
                <span class="weapon-key">${key}</span>
                ${this.getWeaponIcon(id)}
                ${count > 0 ? `<span class="weapon-count">${count}</span>` : ''}
                <div class="weapon-tooltip">
                    <span class="weapon-tooltip-title">${name}</span>
                    ${description}
                </div>
            `;
            
            if (!tank.isAI) {
                icon.addEventListener('click', () => {
                    if (id === 'default') {
                        tank.selectedWeapon = 'default';
                    } else {
                        tank.useItem(id);
                    }
                    this.updateWeaponSelector(tank);
                });
            }
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
        
        // Notify that the store turn is finished
        document.dispatchEvent(new CustomEvent('storeClosed'));
    }
    
    updateStoreItems() {
        const container = document.querySelector('.store-items-grid');
        const currencyDisplay = document.querySelector('#storeCurrency');
        if (!container || !this.currentTank) return;
        
        container.innerHTML = '';
        
        if (currencyDisplay) {
            currencyDisplay.textContent = `Coins: ${this.currentTank.currency}`;
        }
        
        const filteredItems = this.items.filter(item => item.category === this.currentCategory);
        
        filteredItems.forEach(item => {
            const count = (this.currentTank.inventory || []).filter(i => i.id === item.id).length;
            let ownershipText = item.effect.type === 'healing' ? 'Instant Use' : `Owned: ${count}`;
            let isMaxed = false;

            if (item.id === 'shield') {
                const maxShield = this.currentTank.maxHealth * 2;
                ownershipText = `Durability: ${Math.ceil(this.currentTank.shieldDurability)}/${maxShield}`;
                if (this.currentTank.shieldDurability >= maxShield) isMaxed = true;
            } else if (item.id === 'parachute') {
                const maxPara = this.currentTank.maxHealth * 2;
                ownershipText = `Durability: ${Math.ceil(this.currentTank.parachuteDurability)}/${maxPara}`;
                if (this.currentTank.parachuteDurability >= maxPara) isMaxed = true;
            }

            const packText = item.packSize > 1 ? `<div style="color: #ff00ff; font-size: 10px; margin-bottom: 5px;">Pack of ${item.packSize}</div>` : '';
            const canAfford = this.currentTank.currency >= item.price;
            const buyDisabled = !canAfford || isMaxed;
            
            const itemElement = document.createElement('div');
            itemElement.className = 'store-item';
            itemElement.style.width = 'auto'; // Let grid handle width
            itemElement.innerHTML = `
                <div style="font-size: 40px; margin-bottom: 10px;">${this.getWeaponIcon(item.id)}</div>
                <h3>${item.name}</h3>
                <p class="item-description">${item.description}</p>
                ${packText}
                <p class="item-price">${item.price} Coins</p>
                <div style="margin-bottom: 10px; font-size: 12px; color: #00f7ff;">${ownershipText}</div>
                <button class="buy-button ${buyDisabled ? 'disabled' : ''}" 
                    data-item-id="${item.id}" 
                    ${buyDisabled ? 'disabled' : ''}>
                    ${isMaxed ? 'MAXED' : 'BUY'}
                </button>
            `;
            
            const buyButton = itemElement.querySelector('.buy-button');
            if (!buyDisabled) {
                buyButton.addEventListener('click', () => {
                    this.buyItem(item.id);
                });
            }
            
            container.appendChild(itemElement);
        });
    }
    
    buyItem(itemId) {
        if (!this.currentTank) return;
        
        const item = this.items.find(i => i.id === itemId);
        if (!item) return;

        // Check if maxed
        if (itemId === 'shield' && this.currentTank.shieldDurability >= this.currentTank.maxHealth * 2) {
            this.showMessage("Shield already at max!");
            return;
        }
        if (itemId === 'parachute' && this.currentTank.parachuteDurability >= this.currentTank.maxHealth * 2) {
            this.showMessage("Parachute already at max!");
            return;
        }
        
        if (this.currentTank.currency >= item.price) {
            // Deduct the price
            this.currentTank.currency -= item.price;
            
            // Special handling for auto-active single-slot items
            if (itemId === 'shield' || itemId === 'parachute') {
                if (!this.currentTank.inventory) this.currentTank.inventory = [];
                
                // Add to inventory only if not already present
                const existing = this.currentTank.inventory.find(i => i.id === itemId);
                if (!existing) {
                    this.currentTank.inventory.push(JSON.parse(JSON.stringify(item)));
                }

                if (itemId === 'shield') {
                    this.currentTank.shieldDurability = this.currentTank.maxHealth * 2;
                    this.showMessage("Shield Active!");
                } else {
                    this.currentTank.parachuteDurability = this.currentTank.maxHealth * 2;
                    this.showMessage("Parachute Ready!");
                }
            } else {
                // Standard pack/single item logic
                if (!this.currentTank.inventory) {
                    this.currentTank.inventory = [];
                }
                
                // Create copies of the item for the inventory based on pack size
                const numToBuy = item.packSize || 1;
                for (let k = 0; k < numToBuy; k++) {
                    const inventoryItem = JSON.parse(JSON.stringify(item));
                    this.currentTank.inventory.push(inventoryItem);
                }
                
                // Special case for healing items - use immediately
                if (item.effect.type === 'healing') {
                    this.currentTank.health = Math.min(this.currentTank.maxHealth, this.currentTank.health + item.effect.amount);
                    // Remove from inventory
                    for (let k = 0; k < numToBuy; k++) {
                        const index = this.currentTank.inventory.findIndex(i => i.id === itemId);
                        if (index !== -1) {
                            this.currentTank.inventory.splice(index, 1);
                        }
                    }
                    this.showMessage(`Healed +${item.effect.amount} HP!`);
                } else {
                    this.showMessage(`You bought ${item.name}!`);
                }
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
    
                
    
                // Set as current tank temporarily to use buyItem logic
    
                const prevTank = this.currentTank;
    
                this.currentTank = aiTank;
    
                this.buyItem(randomItem.id);
    
                this.currentTank = prevTank;
    
                
    
                console.log(`AI ${aiTank.name} bought ${randomItem.name}`);
    
            }
    
        }
    
    }
    
    