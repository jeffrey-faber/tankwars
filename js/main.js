import { getUrlParams, getRandomTankPositions, createExplosion } from './utils.js';
import { Tank } from './tank.js';
import { Terrain } from './terrain.js';
import { BitmaskTerrain } from './BitmaskTerrain.js';
import { Store } from './store.js';
import { state, getNextAliveTankIndex, showGameOverOverlay } from './gameContext.js';

// Initialize canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const urlParams = getUrlParams();
state.numPlayers = parseInt(urlParams.players) || 2;
const canvasWidth = parseInt(urlParams.width) || 800;
const canvasHeight = parseInt(urlParams.height) || 400;
canvas.width = canvasWidth;
canvas.height = canvasHeight;

// Initialize game state from context
state.wind = (Math.random() * 2 - 1) / 10;
state.canvas = canvas;
state.ctx = ctx;

// Initialize Terrain and Tanks
const oldTerrain = new Terrain(canvas.width, canvas.height); // Used for heightmap generation
state.terrain = new BitmaskTerrain(canvas.width, canvas.height);
state.terrain.bakeHeightmap(oldTerrain.points);

const tankPositions = getRandomTankPositions(state.numPlayers, oldTerrain); // Use oldTerrain for positions
const aiPlayers = urlParams.ai ? urlParams.ai.split(',').map(p => parseInt(p)) : [];
for (let i = 0; i < state.numPlayers; i++) {
    const isAI = aiPlayers.includes(i + 1);
    const aiLevel = isAI ? 8 : 0;
    state.tanks.push(new Tank(tankPositions[i].x, tankPositions[i].y, isAI, aiLevel, `Player ${i + 1}`));
}

// Initialize Store
state.store = new Store();
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        state.store.init(state.tanks);
    }, 100);
});

export function draw() {
    if (!state.isGameOver) {
        state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
        state.terrain.draw(state.ctx);
        state.tanks.forEach(tank => {
            if (tank.alive) {
                tank.draw(state.ctx);
            }
        });
        drawHUD();
        if (state.projectile.x !== null && state.projectile.y !== null) {
            state.ctx.beginPath();
            state.ctx.arc(state.projectile.x, state.projectile.y, 3, 0, 2 * Math.PI);
            state.ctx.fillStyle = state.projectile.color || 'black';
            state.ctx.fill();
        }
        
        if (state.tanks[state.currentPlayer]?.isAI && !state.projectile.flying && state.tanks[state.currentPlayer].alive) {
            let targetTank;
            do {
                targetTank = state.tanks[Math.floor(Math.random() * state.tanks.length)];
            } while (targetTank === state.tanks[state.currentPlayer] || !targetTank.alive);
            
            if (state.store) {
                state.store.aiPurchase(state.tanks[state.currentPlayer]);
            }
            
            state.tanks[state.currentPlayer].aiFire(state.tanks, state.terrain, state.projectile, state.wind, state.canvas);
        }
    }
}

function drawHUD() {
    const tank = state.tanks[state.currentPlayer];
    if (!tank) return;
    state.ctx.font = '16px Arial';
    state.ctx.fillStyle = 'black';
    state.ctx.fillText(tank.name, 10, 20);
    state.ctx.fillText('Angle: ' + (tank.angle * (180 / Math.PI)).toFixed(1) + '°', 10, 40);
    state.ctx.fillText('Power: ' + tank.power.toFixed(1), 10, 60);
    state.ctx.fillText('Wind: ' + (state.wind * 100).toFixed(1), 10, 80);
    state.ctx.fillText('Score: ' + tank.score, 10, 100);
    state.ctx.fillText('Currency: ' + tank.currency, 10, 120);
    state.ctx.fillText('Health: ' + tank.health, 10, 140);
    state.ctx.fillText('Weapon: ' + tank.selectedWeapon, 10, 160);
}

function resetRound() {
    state.isGameOver = false;
    state.projectile = { x: null, y: null, flying: false, type: 'default', damage: 100, explosionRadius: 30 };
    state.needsRedraw = true;
    state.currentPlayer = 0;
    state.wind = (Math.random() * 2 - 1) / 10;

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
    });
    
    setTimeout(() => {
        state.tanks.forEach(tank => tank.applyGravity(state.terrain));
        if (state.store) {
            state.store.updateWeaponSelector(state.tanks[state.currentPlayer]);
        }
    }, 100);
}

function gameLoop() {
    const aliveTanks = state.tanks.filter(tank => tank.alive);
    if (aliveTanks.length <= 1 && !state.isGameOver) {
        state.isGameOver = true;
        const winner = aliveTanks.length > 0 ? aliveTanks[0].name : "No one";
        showGameOverOverlay(`${winner} wins!`);
    }

    if (!state.tanks[state.currentPlayer]?.alive) {
        state.currentPlayer = getNextAliveTankIndex(state.currentPlayer);
        if (state.store) {
            state.store.updateWeaponSelector(state.tanks[state.currentPlayer]);
        }
    }

    if (!state.isGameOver) {
        state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
        
        if (state.terrain.updateGravity) {
            state.terrain.updateGravity();
        }

        state.terrain.draw(state.ctx);
        
        if (!state.projectile.flying) {
            state.tanks.forEach(tank => {
                if (tank.alive) {
                    tank.applyGravity(state.terrain);
                }
            });
        }
        
        state.tanks.forEach(tank => {
            if (tank.alive) {
                tank.draw(state.ctx);
            }
        });
        
        drawHUD();
        
        if (state.projectile.x !== null && state.projectile.y !== null) {
            state.ctx.beginPath();
            state.ctx.arc(state.projectile.x, state.projectile.y, 3, 0, 2 * Math.PI);
            state.ctx.fillStyle = state.projectile.color || 'black';
            state.ctx.fill();
        }
        
        if (state.tanks[state.currentPlayer]?.isAI && !state.projectile.flying && state.tanks[state.currentPlayer].alive) {
            let targetTank;
            do {
                targetTank = state.tanks[Math.floor(Math.random() * state.tanks.length)];
            } while (targetTank === state.tanks[state.currentPlayer] || !targetTank.alive);
            
            if (state.store) {
                state.store.aiPurchase(state.tanks[state.currentPlayer]);
            }
            
            state.tanks[state.currentPlayer].aiFire(state.tanks, state.terrain, state.projectile, state.wind, state.canvas);
        }
    }
    requestAnimationFrame(gameLoop);
}

gameLoop();

document.addEventListener('keydown', (event) => {
    let tank = state.tanks[state.currentPlayer];
    if (!tank?.alive) {
        state.currentPlayer = getNextAliveTankIndex(state.currentPlayer);
        return;
    }

    if (event.key === '/') {
        state.projectile.flying = false;
        state.needsRedraw = true;
        state.currentPlayer = getNextAliveTankIndex(state.currentPlayer);
        if (state.store) {
            state.store.updateWeaponSelector(state.tanks[state.currentPlayer]);
        }
    }

    if (!tank.isAI && state.store && !state.store.isOpen) {
        state.needsRedraw = true;
        if (event.key === 'ArrowLeft') {
            tank.angle += Math.PI / 180;
        } else if (event.key === 'ArrowRight') {
            tank.angle -= Math.PI / 180;
        } else if (event.key === 'ArrowUp') {
            tank.power += 1;
        } else if (event.key === 'ArrowDown') {
            tank.power -= 1;
        } else if (event.key === ' ' && !state.projectile.flying) {
            event.preventDefault();
            tank.fire(state.tanks, state.terrain, state.projectile, state.wind, state.canvas);
        } else if (event.key === 's') { 
            if (state.store && !state.projectile.flying) {
                state.store.open(tank);
            }
        } else if (event.key === '0') {
            tank.selectedWeapon = 'default';
            if (state.store) {
                state.store.updateWeaponSelector(tank);
            }
        } else if (event.key >= '1' && event.key <= '9') {
            const index = parseInt(event.key) - 1;
            if (tank.inventory && index < tank.inventory.length) {
                const item = tank.inventory[index];
                if (item.effect.type === 'weapon' || item.effect.type === 'defense') {
                    tank.useItem(item.id);
                    if (state.store) {
                        state.store.updateWeaponSelector(tank);
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