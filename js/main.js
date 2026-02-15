import { getUrlParams, getRandomTankPositions, createExplosion, selectRandomEdgeBehavior } from './utils.js';
import { Tank } from './tank.js';
import { Terrain } from './terrain.js';
import { BitmaskTerrain } from './BitmaskTerrain.js';
import { Store } from './store.js';
import { LobbyManager } from './lobbyManager.js';
import { ScoreManager } from './scoreManager.js';
import { MatchSetup } from './matchSetup.js';
import { saveMatchSettings, loadMatchSettings } from './sessionPersistence.js';
import { state, getNextAliveTankIndex, showGameOverOverlay, draw, drawHUD, isSettling } from './gameContext.js';

// Initialize canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const urlParams = getUrlParams();

// UI Elements
const matchSetupOverlay = document.getElementById('matchSetupOverlay');
const gameCanvas = document.getElementById('gameCanvas');

let matchSetup = null;

// Initialize game state from context
state.wind = (Math.random() * 2 - 1) / 10;
window.state = state; // Debugging

document.addEventListener('DOMContentLoaded', () => {
    state.canvas = document.getElementById('gameCanvas');
    state.ctx = state.canvas.getContext('2d');

    matchSetup = new MatchSetup();

    document.getElementById('initMatchButton').addEventListener('click', () => {
        const config = matchSetup.getConfig();
        if (config.players.length < 2) {
            alert('A match requires at least 2 players.');
            return;
        }
        saveMatchSettings(config);
        initGameFromConfig(config);
    });

    // Check if we are resuming a match (e.g. after refresh)
    const savedConfig = loadMatchSettings();
    if (savedConfig && urlParams.resume) {
        initGameFromConfig(savedConfig);
    }
});

function showScoreboard() {
    const scoreboardContainer = document.getElementById('scoreboardContainer');
    if (scoreboardContainer) {
        scoreboardContainer.innerHTML = ScoreManager.generateScoreboardHTML(state.tanks);
    }
    document.getElementById('lobbyOverlay').classList.remove('hidden');
}

function startNextStoreTurn() {
    if (window.lobbyManager.isDone()) {
        const prompt = document.getElementById('lobbyPrompt');
        prompt.innerHTML = "All players ready!";
        
        const startBtn = document.getElementById('startMatchButton');
        if (startBtn) startBtn.style.display = 'block';
        
        const shoppingBtn = document.getElementById('startShoppingButton');
        if (shoppingBtn) shoppingBtn.classList.add('hidden');
        return;
    }

    const playerIndex = window.lobbyManager.getCurrentPlayerIndex();
    const tank = state.tanks[playerIndex];
    
    const prompt = document.getElementById('lobbyPrompt');
    prompt.innerHTML = `<span style="color: ${tank.color}">${tank.name}</span>'s Turn`;
    
    const btn = document.getElementById('startShoppingButton');
    btn.classList.remove('hidden');
    
    // One-time listener for shopping start
    const startShopping = () => {
        btn.classList.add('hidden');
        if (state.store) {
            state.store.open(tank);
        }
        btn.removeEventListener('click', startShopping);
    };
    btn.addEventListener('click', startShopping);
}

document.addEventListener('storeClosed', () => {
    window.lobbyManager.next();
    startNextStoreTurn();
});

function enterLobby() {
    state.gameState = 'LOBBY';
    window.lobbyManager.start();
    showScoreboard();
    startNextStoreTurn();
}

function finalizeTurnOrder() {
    // 1. Sort tanks based on horizontal position (X)
    // This creates a spatial 'round robin'
    state.tanks.sort((a, b) => a.x - b.x);
    
    // 2. Choose a random starting player in that sorted array
    state.currentPlayer = Math.floor(Math.random() * state.tanks.length);
    
    console.log(`Turn Order Finalized: Starting with ${state.tanks[state.currentPlayer].name}`);
}

function initGameFromConfig(config) {
    // Apply config to state
    state.totalGames = config.totalGames;
    state.winCondition = config.winCondition;
    state.startingCash = config.startingCash;
    state.deathTriggerChance = config.deathTriggerChance !== undefined ? config.deathTriggerChance : 0.1;
    state.edgeBehavior = config.edgeBehavior || 'impact';
    state.playerRosterConfig = config.players;
    state.currentGameIndex = 0;
    state.numPlayers = config.players.length;

    // Set canvas dimensions
    const canvasWidth = 1200;
    const canvasHeight = 600;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Initialize Terrain
    const oldTerrain = new Terrain(canvasWidth, canvasHeight);
    state.terrain = new BitmaskTerrain(canvasWidth, canvasHeight);
    state.terrain.bakeHeightmap(oldTerrain.points);

    // Initialize Tanks
    state.tanks = [];
    const tankPositions = getRandomTankPositions(state.numPlayers, oldTerrain);
    
    config.players.forEach((p, i) => {
        const isAI = p.type.startsWith('bot');
        let type = p.type;
        
        if (type === 'bot-random') {
            const types = ['bot-easy', 'bot-medium', 'bot-hard', 'bot-stupid', 'bot-lobber', 'bot-sniper', 'bot-mastermind'];
            type = types[Math.floor(Math.random() * types.length)];
        }

        let aiLevel = 0;
        let personality = null;
        let name = p.name;

        if (isAI) {
            if (type === 'bot-easy') aiLevel = 2;
            else if (type === 'bot-medium') aiLevel = 5;
            else if (type === 'bot-hard') aiLevel = 8;
            else {
                // Personality types
                personality = type.replace('bot-', '');
                aiLevel = 8; // high simulation for personalities
            }
            
            // Default name if still generic
            if (name.startsWith('Player ')) {
                const label = personality ? (personality.charAt(0).toUpperCase() + personality.slice(1)) : type.replace('bot-', '');
                name = `${label} ${i + 1}`;
            }
        }
        
        const tank = new Tank(tankPositions[i].x, tankPositions[i].y, isAI, aiLevel, name, personality);
        tank.color = p.color;
        tank.currency = state.startingCash;
        state.tanks.push(tank);
    });

    finalizeTurnOrder();

    // Initialize Managers
    state.store = new Store();
    state.store.init(state.tanks);
    
    window.lobbyManager = new LobbyManager(state.tanks);

    // Show game, hide setup
    const matchSetupOverlay = document.getElementById('matchSetupOverlay');
    const gameCanvas = document.getElementById('gameCanvas');
    matchSetupOverlay.classList.add('hidden');
    gameCanvas.classList.remove('hidden');

    enterLobby();
}

function showMatchSummary() {
    state.gameState = 'MATCH_OVER';
    const overlay = document.getElementById('gameOverOverlay');
    const messageElement = document.getElementById('gameOverMessage');
    
    // Determine winner
    let winner;
    if (state.winCondition === 'score') {
        winner = state.tanks.reduce((prev, current) => (prev.score > current.score) ? prev : current);
    } else {
        winner = state.tanks.reduce((prev, current) => (prev.wins > current.wins) ? prev : current);
    }

    messageElement.innerHTML = `
        <h2 style="color: #ff00ff">MATCH OVER!</h2>
        <div style="font-size: 24px; margin: 20px 0;">
            Overall Winner: <span style="color: ${winner.color}">${winner.name}</span>
        </div>
        <div style="font-size: 16px;">
            Final Score: ${winner.score}<br>
            Total Wins: ${winner.wins}
        </div>
    `;

    const continueBtn = document.getElementById('continueButton');
    continueBtn.classList.add('hidden'); // No more rounds

    const newGameBtn = document.getElementById('newGameButton');
    newGameBtn.textContent = "RETURN TO SETUP";
    newGameBtn.onclick = () => {
        window.location.reload(); // Simplest way to go back to setup
    };

    overlay.classList.remove('hidden');
}

function resetRound() {
    state.gameState = 'LOBBY';
    state.isGameOver = false;
    state.projectiles = []; // Clear all projectiles
    state.needsRedraw = true;
    state.currentPlayer = 0;
    state.wind = (Math.random() * 2 - 1) / 10;

    // Selection of active edge behavior for this round
    if (state.edgeBehavior === 'random') {
        state.activeEdgeBehavior = selectRandomEdgeBehavior();
    } else {
        state.activeEdgeBehavior = state.edgeBehavior;
    }

    const newOldTerrain = new Terrain(state.canvas.width, state.canvas.height);
    state.terrain.bakeHeightmap(newOldTerrain.points);

    const newTankPositions = getRandomTankPositions(state.numPlayers, newOldTerrain);
    state.tanks.forEach((tank, i) => {
        tank.x = newTankPositions[i].x;
        tank.y = newTankPositions[i].y;
        tank.angle = Math.PI / 4;
        tank.power = 50;
        tank.alive = true;
        tank.health = tank.maxHealth;
        tank.shielded = false;
        tank.selectedWeapon = 'default';
        
        // AI Shopping Phase
        if (tank.isAI && state.store) {
            state.store.aiPurchase(tank);
        }
    });

    finalizeTurnOrder();
    
    setTimeout(() => {
        console.log("ResetRound: Applying initial gravity");
        state.tanks.forEach(tank => tank.applyGravity(state.terrain));
        if (state.store) {
            state.store.updateWeaponSelector(state.tanks[state.currentPlayer]);
            state.store.updateVisibility();
        }
        draw(); // Force redraw after positioning
    }, 100);

    enterLobby();
}

function gameLoop() {
    if (!state.ctx || !state.terrain) {
        requestAnimationFrame(gameLoop);
        return;
    }

    const aliveTanks = state.tanks.filter(tank => tank.alive);
    
    // Victory/Settlement Logic
    if (aliveTanks.length <= 1 && !state.isGameOver && state.gameState === 'PLAYING') {
        // Only trigger victory overlay when all projectiles and falling dirt have settled
        if (!isSettling()) {
            state.isGameOver = true;
            
            let resultMessage = "DRAW!";
            if (aliveTanks.length === 1) {
                const winner = aliveTanks[0];
                winner.wins += 1;
                resultMessage = `${winner.name} wins the round!`;
            } else if (aliveTanks.length === 0) {
                resultMessage = "MUTUAL DESTRUCTION! (Draw)";
            }
            
            state.currentGameIndex++;
            
            if (state.currentGameIndex >= state.totalGames) {
                showMatchSummary();
            } else {
                showGameOverOverlay(resultMessage);
            }
        }
    }

    if (!state.tanks[state.currentPlayer]?.alive && state.gameState === 'PLAYING') {
        state.currentPlayer = getNextAliveTankIndex(state.currentPlayer);
        if (state.store) {
            state.store.updateWeaponSelector(state.tanks[state.currentPlayer]);
        }
    }

    if (!state.isGameOver) {
        if (state.terrain.updateGravity) {
            state.terrain.updateGravity();
        }

        draw();
        
        if (state.projectiles.length === 0) {
            state.tanks.forEach(tank => {
                tank.applyGravity(state.terrain);
            });
        }
        
        if (state.gameState === 'PLAYING' && state.tanks[state.currentPlayer]?.isAI && !isSettling() && state.tanks[state.currentPlayer].alive) {
            let targetTank;
            do {
                targetTank = state.tanks[Math.floor(Math.random() * state.tanks.length)];
            } while (targetTank === state.tanks[state.currentPlayer] || !targetTank.alive);
            
            state.tanks[state.currentPlayer].aiFire();
        }
    }
    requestAnimationFrame(gameLoop);
}

gameLoop();

document.addEventListener('keydown', (event) => {
    // Ignore if typing in inputs
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT') {
        return;
    }

    if (!state.tanks || state.tanks.length === 0) return;

    let tank = state.tanks[state.currentPlayer];
    if (!tank?.alive) {
        state.currentPlayer = getNextAliveTankIndex(state.currentPlayer);
        return;
    }

    if (event.key === '/') {
        state.projectiles = [];
        state.needsRedraw = true;
        state.currentPlayer = getNextAliveTankIndex(state.currentPlayer);
        if (state.store) {
            state.store.updateWeaponSelector(state.tanks[state.currentPlayer]);
        }
    }

    if (!tank.isAI && state.store && !state.store.isOpen && state.gameState === 'PLAYING') {
        state.needsRedraw = true;
        if (event.key === 'ArrowLeft') {
            tank.angle += Math.PI / 180;
        } else if (event.key === 'ArrowRight') {
            tank.angle -= Math.PI / 180;
        } else if (event.key === 'ArrowUp') {
            tank.power += 1;
        } else if (event.key === 'ArrowDown') {
            tank.power -= 1;
        } else if (event.key === ' ' && state.projectiles.length === 0) {
            event.preventDefault();
            tank.fire();
        } else if (event.key === 's') { 
            if (state.store && state.projectiles.length === 0 && state.gameState === 'LOBBY') {
                state.store.open(tank);
            }
        } else if (event.key === 'g') {
            console.log("Forcing Gravity Check");
            state.tanks.forEach(t => t.applyGravity(state.terrain));
        } else if (event.key === '0') {
            tank.selectedWeapon = 'default';
            if (state.store) {
                state.store.updateWeaponSelector(tank);
            }
        } else if (event.key >= '1' && event.key <= '9') {
            const index = parseInt(event.key) - 1;
            if (tank.inventory && index < tank.inventory.length) {
                const item = tank.inventory[index];
                if (item && (item.effect.type === 'weapon' || item.effect.type === 'defense')) {
                    if (typeof tank.useItem === 'function') {
                        tank.useItem(item.id);
                        if (state.store) {
                            state.store.updateWeaponSelector(tank);
                        }
                    } else {
                        console.error('tank.useItem is not a function', tank);
                    }
                }
            }
        }
    }
});

document.getElementById('continueButton')?.addEventListener('click', () => {
    document.getElementById('gameOverOverlay').classList.add('hidden');
    resetRound();
});

document.getElementById('newGameButton')?.addEventListener('click', () => {
    window.location.href = "index.html";
});

document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('gameOverOverlay');
    if (overlay) overlay.classList.add('hidden');

    const form = document.getElementById('gameForm');
    const canvas = document.getElementById('gameCanvas');
    if (urlParams.players) {
        if (form) form.classList.add('hidden');
        if (canvas) canvas.classList.remove('hidden');
    }
});