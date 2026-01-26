import { getUrlParams, getRandomTankPositions, createExplosion } from './utils.js';
import { Tank } from './tank.js';
import { Terrain } from './terrain.js';
import { BitmaskTerrain } from './BitmaskTerrain.js';
import { Store } from './store.js';

// Global variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const urlParams = getUrlParams();
const numPlayers = parseInt(urlParams.players) || 2;
const canvasWidth = parseInt(urlParams.width) || 800;
const canvasHeight = parseInt(urlParams.height) || 400;
canvas.width = canvasWidth;
canvas.height = canvasHeight;

let wind = (Math.random() * 2 - 1) / 10;
const gravity = 0.1;

let projectile = { x: null, y: null, flying: false, type: 'default', damage: 100, explosionRadius: 15 };
let isGameOver = false;
let needsRedraw = true;
let aiReadyToFire = true;
let currentPlayer = 0;

// Initialize Terrain and Tanks
const oldTerrain = new Terrain(); // Used for heightmap generation
const terrain = new BitmaskTerrain(canvas.width, canvas.height);
terrain.bakeHeightmap(oldTerrain.points);

const tankPositions = getRandomTankPositions(numPlayers, oldTerrain); // Use oldTerrain for positions
const aiPlayers = urlParams.ai ? urlParams.ai.split(',').map(p => parseInt(p)) : [];
const tanks = [];
for (let i = 0; i < numPlayers; i++) {
    const isAI = aiPlayers.includes(i + 1);
    const aiLevel = isAI ? 8 : 0;
    tanks.push(new Tank(tankPositions[i].x, tankPositions[i].y, isAI, aiLevel, `Player ${i + 1}`));
}

// Initialize Store
const store = new Store();
// Store needs access to global state or we pass it
window.tanks = tanks;
window.currentPlayer = currentPlayer;
window.ctx = ctx;
window.canvas = canvas;

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        store.init(tanks);
    }, 100);
});

// Export functions that other modules need
export function getNextAliveTankIndex(startIndex) {
    let nextIndex = startIndex;
    do {
        nextIndex = (nextIndex + 1) % tanks.length;
        if (tanks[nextIndex].alive) {
            return nextIndex;
        }
    } while (nextIndex !== startIndex);
    return startIndex;
}
window.getNextAliveTankIndex = getNextAliveTankIndex;

export function draw() {
    if (!isGameOver) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        terrain.draw(ctx);
        tanks.forEach(tank => {
            if (tank.alive) {
                tank.draw(ctx);
            }
        });
        drawHUD();
        if (projectile.x !== null && projectile.y !== null) {
            ctx.beginPath();
            ctx.arc(projectile.x, projectile.y, 3, 0, 2 * Math.PI);
            ctx.fillStyle = projectile.color || 'black';
            ctx.fill();
        }
        
        if (store && !projectile.flying) {
            store.updateWeaponSelector(tanks[currentPlayer]);
        }
        
        if (tanks[currentPlayer]?.isAI && !projectile.flying && tanks[currentPlayer].alive) {
            let targetTank;
            do {
                targetTank = tanks[Math.floor(Math.random() * tanks.length)];
            } while (targetTank === tanks[currentPlayer] || !targetTank.alive);
            
            if (store) {
                store.aiPurchase(tanks[currentPlayer]);
            }
            
            tanks[currentPlayer].aiFire(tanks, terrain, projectile, wind, canvas);
        }
    }
}
window.draw = draw; // Expose to window for callback

function drawHUD() {
    const tank = tanks[currentPlayer];
    if (!tank) return;
    ctx.font = '16px Arial';
    ctx.fillStyle = 'black';
    ctx.fillText(tank.name, 10, 20);
    ctx.fillText('Angle: ' + (tank.angle * (180 / Math.PI)).toFixed(1) + '°', 10, 40);
    ctx.fillText('Power: ' + tank.power.toFixed(1), 10, 60);
    ctx.fillText('Wind: ' + (wind * 100).toFixed(1), 10, 80);
    ctx.fillText('Score: ' + tank.score, 10, 100);
    ctx.fillText('Currency: ' + tank.currency, 10, 120);
    ctx.fillText('Health: ' + tank.health, 10, 140);
    ctx.fillText('Weapon: ' + tank.selectedWeapon, 10, 160);
}

export function showGameOverOverlay(message) {
    const overlay = document.getElementById('gameOverOverlay');
    const messageElement = document.getElementById('gameOverMessage');
    if (messageElement) messageElement.textContent = message;
    if (overlay) overlay.classList.remove('hidden');
}
window.showGameOverOverlay = showGameOverOverlay;

function resetRound() {
    isGameOver = false;
    projectile = { x: null, y: null, flying: false, type: 'default', damage: 100, explosionRadius: 15 };
    needsRedraw = true;
    currentPlayer = 0;
    window.currentPlayer = 0;
    wind = (Math.random() * 2 - 1) / 10;

    const newOldTerrain = new Terrain();
    terrain.bakeHeightmap(newOldTerrain.points);

    const newTankPositions = getRandomTankPositions(numPlayers, newOldTerrain);
    tanks.forEach((tank, i) => {
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
        tanks.forEach(tank => tank.applyGravity(terrain));
    }, 100);
}

function gameLoop() {
    if (!tanks[currentPlayer]?.alive) {
        currentPlayer = getNextAliveTankIndex(currentPlayer);
        window.currentPlayer = currentPlayer;
    }

    if (!isGameOver) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        terrain.draw(ctx);
        
        if (!projectile.flying) {
            tanks.forEach(tank => {
                if (tank.alive) {
                    tank.applyGravity(terrain);
                }
            });
        }
        
        tanks.forEach(tank => {
            if (tank.alive) {
                tank.draw(ctx);
            }
        });
        
        drawHUD();
        
        if (projectile.x !== null && projectile.y !== null) {
            ctx.beginPath();
            ctx.arc(projectile.x, projectile.y, 3, 0, 2 * Math.PI);
            ctx.fillStyle = projectile.color || 'black';
            ctx.fill();
        }
        
        if (store && !projectile.flying) {
            store.updateWeaponSelector(tanks[currentPlayer]);
        }
        
        if (tanks[currentPlayer]?.isAI && !projectile.flying && tanks[currentPlayer].alive) {
            let targetTank;
            do {
                targetTank = tanks[Math.floor(Math.random() * tanks.length)];
            } while (targetTank === tanks[currentPlayer] || !targetTank.alive);
            
            if (store) {
                store.aiPurchase(tanks[currentPlayer]);
            }
            
            tanks[currentPlayer].aiFire(tanks, terrain, projectile, wind, canvas);
        }
    }
    requestAnimationFrame(gameLoop);
}

gameLoop();

document.addEventListener('keydown', (event) => {
    let tank = tanks[currentPlayer];
    if (!tank?.alive) {
        currentPlayer = getNextAliveTankIndex(currentPlayer);
        window.currentPlayer = currentPlayer;
        return;
    }

    if (event.key === '/') {
        projectile.flying = false;
        needsRedraw = true;
        currentPlayer = getNextAliveTankIndex(currentPlayer);
        window.currentPlayer = currentPlayer;
    }

    if (!tank.isAI && store && !store.isOpen) {
        needsRedraw = true;
        if (event.key === 'ArrowLeft') {
            tank.angle += Math.PI / 180;
        } else if (event.key === 'ArrowRight') {
            tank.angle -= Math.PI / 180;
        } else if (event.key === 'ArrowUp') {
            tank.power += 1;
        } else if (event.key === 'ArrowDown') {
            tank.power -= 1;
        } else if (event.key === ' ' && !projectile.flying) {
            event.preventDefault();
            tank.fire(tanks, terrain, projectile, wind, canvas);
        } else if (event.key === 's') { 
            if (store && !projectile.flying) {
                store.open(tank);
            }
        } else if (event.key >= '1' && event.key <= '9') {
            const index = parseInt(event.key) - 1;
            if (tank.inventory && index < tank.inventory.length) {
                const item = tank.inventory[index];
                if (item.effect.type === 'weapon' || item.effect.type === 'defense') {
                    tank.useItem(item.id);
                    if (store) {
                        store.updateWeaponSelector(tank);
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