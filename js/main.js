import { getUrlParams, getRandomTankPositions, createExplosion, selectRandomEdgeBehavior, calculateWind } from './utils.js';
import { Tank } from './tank.js';
import { Terrain } from './terrain.js';
import { BitmaskTerrain } from './BitmaskTerrain.js';
import { Store } from './store.js';
import { LobbyManager } from './lobbyManager.js';
import { ScoreManager } from './scoreManager.js';
import { MatchSetup } from './matchSetup.js';
import { saveMatchSettings, loadMatchSettings } from './sessionPersistence.js';
import { state, getNextAliveTankIndex, showGameOverOverlay, draw, drawHUD, isSettling, startTurn } from './gameContext.js';
import { initMobileMode, setMobileControlsVisibility } from './mobileManager.js';

// Initialize canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const urlParams = getUrlParams();

// UI Elements
const matchSetupOverlay = document.getElementById('matchSetupOverlay');
const gameCanvas = document.getElementById('gameCanvas');

let matchSetup = null;
let lastFrameTime = performance.now();

// Initialize game state from context
window.state = state; // Debugging

document.addEventListener('DOMContentLoaded', () => {
    state.canvas = document.getElementById('gameCanvas');
    state.ctx = state.canvas.getContext('2d');

    initMobileMode();

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
    startTurn(Math.floor(Math.random() * state.tanks.length));
    
    console.log(`Turn Order Finalized: Starting with ${state.tanks[state.currentPlayer].name}`);
}

function initGameFromConfig(config) {
    // Apply config to state
    state.totalGames = config.totalGames;
    state.winCondition = config.winCondition;
    state.startingCash = config.startingCash;
    state.deathTriggerChance = config.deathTriggerChance !== undefined ? config.deathTriggerChance : 0.1;
    state.edgeBehavior = config.edgeBehavior || 'impact';
    state.windIntensity = config.windIntensity || 'normal';
    state.mapStyle = config.mapStyle || 'random';
    state.wind = calculateWind(state.windIntensity);
    state.mapStyle = urlParams.map || state.mapStyle;
    state.turnTimer = config.turnTimer || { enabled: false, seconds: 30 };
    if (state.edgeBehavior === 'random') {
        state.activeEdgeBehavior = selectRandomEdgeBehavior();
    } else {
        state.activeEdgeBehavior = state.edgeBehavior;
    }
    state.playerRosterConfig = config.players;
    state.currentGameIndex = 0;
    state.numPlayers = config.players.length;

    if (config.suddenDeath) {
        state.suddenDeath = state.suddenDeath || {};
        state.suddenDeath.type = config.suddenDeath.type;
        state.suddenDeath.startTurn = config.suddenDeath.startTurn;
        state.suddenDeath.active = false;
        state.suddenDeath.activeType = null;
        state.suddenDeath.currentTurnCount = 0;
        state.suddenDeath.nukeScale = 1.0;
        state.suddenDeath.teleportFocus = 0.0;
        state.suddenDeath.isResolving = false;
    }

    state.activeGlobalWaves = [];
    state.activeGravityWells = [];

    // Set canvas dimensions
    const canvasWidth = 1200;
    const canvasHeight = 600;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Initialize Terrain
    const oldTerrain = new Terrain(canvasWidth, canvasHeight, state.mapStyle);
    state.terrain = new BitmaskTerrain(canvasWidth, canvasHeight);
    state.terrain.bakeHeightmap(oldTerrain.points);

    // Initialize Tanks
    state.tanks = [];
    const tankPositions = getRandomTankPositions(state.numPlayers, oldTerrain);
    
    config.players.forEach((p, i) => {
        const isAI = p.type.startsWith('bot');
        let type = p.type;
        
        if (type === 'bot-random') {
            const types = ['bot-easy', 'bot-medium', 'bot-hard', 'bot-stupid', 'bot-lobber', 'bot-sniper', 'bot-mastermind', 'bot-nemesis', 'bot-ghost', 'bot-commander', 'bot-singularity'];
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
    
    // AI Initial Shopping Phase (MUST BE AFTER STORE INIT)
    state.tanks.forEach(tank => {
        if (tank.isAI) {
            state.store.aiPurchase(tank);
        }
    });
    
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
    state.projectileLoopActive = false;
    state.needsRedraw = true;
    startTurn(0);
    state.wind = calculateWind(state.windIntensity || 'normal');

    if (state.suddenDeath) {
        state.suddenDeath.active = false;
        state.suddenDeath.activeType = null;
        state.suddenDeath.currentTurnCount = 0;
        state.suddenDeath.nukeScale = 1.0;
        state.suddenDeath.teleportFocus = 0.0;
        state.suddenDeath.isResolving = false;
    }

    state.activeGlobalWaves = [];
    state.activeGravityWells = [];

    // Selection of active edge behavior for this round
    if (state.edgeBehavior === 'random') {
        state.activeEdgeBehavior = selectRandomEdgeBehavior();
    } else {
        state.activeEdgeBehavior = state.edgeBehavior;
    }

    const newOldTerrain = new Terrain(state.canvas.width, state.canvas.height, state.mapStyle);
    state.terrain.bakeHeightmap(newOldTerrain.points);

    const newTankPositions = getRandomTankPositions(state.numPlayers, newOldTerrain);
    state.tanks.forEach((tank, i) => {
        tank.x = newTankPositions[i].x;
        tank.y = newTankPositions[i].y;
        tank.lastSolidY = tank.y; // Update tracking for fall damage
        tank.isInitialSpawn = true; // Prevent damage on first landing
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

    const now = performance.now();
    const dt = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    const aliveTanks = state.tanks.filter(tank => tank.alive);
    
    // Turn Timer Logic
    if (state.gameState === 'PLAYING' && !state.isGameOver && state.turnTimer?.enabled && state.projectiles.length === 0 && !isSettling()) {
        state.remainingTurnTime -= dt;
        if (state.remainingTurnTime <= 0) {
            state.remainingTurnTime = 0;
            console.log("Turn time expired!");
            startTurn(getNextAliveTankIndex(state.currentPlayer));
        }
    }

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

    if (!state.tanks[state.currentPlayer]?.alive && state.gameState === 'PLAYING' && state.projectiles.length === 0 && !isSettling()) {
        startTurn(getNextAliveTankIndex(state.currentPlayer));
    }

    if (state.projectiles.length > 0) {
        // Projectiles should be managed by the Tank that fired them, 
        // but if that tank died mid-rattle, they might hang.
        // Kick a loop owner if projectiles exist but no loop is running.
        if (!state.projectileLoopActive) {
            const loopOwner = state.projectiles.find(p => p.sourceTank?.startProjectileLoop);
            if (loopOwner) {
                loopOwner.sourceTank.startProjectileLoop(false);
            }
        }
        if (state.projectiles.length > 50) {
            console.warn("DEBUG: Projectile overload detected! Clearing...");
            state.projectiles = [];
            state.projectileLoopActive = false;
        }
    }

    if (!state.isGameOver) {
        if (state.terrain.updateGravity) {
            const now = performance.now();
            const activeWells = state.activeGravityWells || [];
            const pixelsMoved = state.terrain.updateGravity(activeWells);
            
            const isMoving = pixelsMoved > 200;
            if (isMoving) {
                if (!state.isTerrainSettling) {
                    state.isTerrainSettling = true;
                    state.settleStartTime = now;
                }
                
                // Hard 5 second limit
                if (now - state.settleStartTime > 5000) {
                    console.log("Settle timeout reached. Forcing progression.");
                    state.isTerrainSettling = false;
                    // Reset timer for next movement event
                    state.settleStartTime = 0; 
                }
            } else {
                state.isTerrainSettling = false;
                state.settleStartTime = 0;
            }
        }

        // Apply Gravity Wells to Tanks
        if (state.activeGravityWells && state.activeGravityWells.length > 0) {
            const now = performance.now();
            // ... (tank logic already added) ...
            
            // Apply to Projectiles
            state.projectiles.forEach(proj => {
                state.activeGravityWells.forEach(well => {
                    if (well.expiresAt > now) {
                        const dx = well.x - proj.x;
                        const dy = well.y - proj.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < well.radius) {
                            const force = (1 - dist / well.radius) * well.strength * 0.5;
                            const angle = Math.atan2(dy, dx);
                            proj.vx += Math.cos(angle) * force;
                            proj.vy += Math.sin(angle) * force;
                        }
                    }
                });
            });
        }

        // Process Global Waves (Tectonic Ripple)
        if (state.activeGlobalWaves && state.activeGlobalWaves.length > 0) {
            for (let i = state.activeGlobalWaves.length - 1; i >= 0; i--) {
                const wave = state.activeGlobalWaves[i];
                const prevX = wave.x;
                wave.x += wave.speed;

                // Apply effect to every X between prevX and current wave.x
                const startX = Math.floor(prevX);
                const endX = Math.min(state.canvas.width, Math.floor(wave.x));
                
                for (let x = startX; x < endX; x++) {
                    const shiftY = Math.sin(x * wave.frequency + wave.phase) * wave.amplitude;
                    state.terrain.shiftColumn(x, shiftY);
                    
                    // Shift tanks in this column
                    state.tanks.forEach(tank => {
                        if (!tank.alive) return;
                        const tx = Math.floor(tank.x + tank.width / 2);
                        if (tx === x) {
                            tank.y += shiftY;
                            tank.lastSolidY = tank.y;

                            // CRAZY MODE: Launch tanks if the shift is upwards (negative) and significant
                            if (wave.launch && shiftY < -5) {
                                // Add upward velocity proportional to the wave shift
                                tank.vy = (tank.vy || 0) + (shiftY * 0.4); 
                                // Add a small amount of horizontal drift too
                                tank.vx = (tank.vx || 0) + (Math.cos(wave.phase) * 5);
                            }
                        }
                    });
                }

                if (startX < state.canvas.width) {
                    state.terrain.updateCanvas();
                }

                // Remove when it leaves the screen
                if (wave.x > state.canvas.width + 100) {
                    state.activeGlobalWaves.splice(i, 1);
                }
            }
        }

        draw();
        
        if (state.projectiles.length === 0) {
            state.tanks.forEach(tank => {
                tank.applyGravity(state.terrain);
            });
        }
        
        if (state.gameState === 'PLAYING' && state.tanks[state.currentPlayer]?.isAI && !isSettling() && state.tanks[state.currentPlayer].alive) {
            // Add a small safety delay before AI actually starts its "thinking" phase
            // This ensures all state changes from previous turns (like death) have fully propagated.
            if (!state.aiTurnTimeout) {
                state.aiTurnTimeout = setTimeout(() => {
                    if (state.tanks[state.currentPlayer]?.isAI && !isSettling() && state.tanks[state.currentPlayer].alive) {
                        state.tanks[state.currentPlayer].aiFire();
                    }
                    state.aiTurnTimeout = null;
                }, 500);
            }
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
        startTurn(getNextAliveTankIndex(state.currentPlayer));
        return;
    }

    if (event.key === '/') {
        state.projectiles = [];
        state.projectileLoopActive = false;
        state.needsRedraw = true;
        startTurn(getNextAliveTankIndex(state.currentPlayer));
    }

    if (!tank.isAI && state.store && !state.store.isOpen && state.gameState === 'PLAYING' && !isSettling()) {
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
