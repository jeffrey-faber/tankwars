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

let projectile = { x: null, y: null, flying: false };
let isGameOver = false;
let needsRedraw = true;
let aiReadyToFire = true;
let currentPlayer = 0;

// Initialize Terrain and Tanks
const terrain = new Terrain();
const tankPositions = getRandomTankPositions(numPlayers, terrain);
const aiPlayers = urlParams.ai ? urlParams.ai.split(',').map(p => parseInt(p)) : [];
const tanks = [];
for (let i = 0; i < numPlayers; i++) {
    const isAI = aiPlayers.includes(i + 1);
    const aiLevel = isAI ? 8 : 0; // For simplicity, use AI level 8 for AI tanks
    tanks.push(new Tank(tankPositions[i].x, tankPositions[i].y, isAI, aiLevel, `Player ${i + 1}`));
}

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
}


// Main draw function
function draw() {
    if (!isGameOver) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        terrain.draw(ctx, canvas);
        tanks.forEach(tank => {
            if (tank.alive) {
                tank.draw(ctx);
            }
        });
        drawHUD();
        if (projectile.x !== null && projectile.y !== null) {
            ctx.beginPath();
            ctx.arc(projectile.x, projectile.y, 3, 0, 2 * Math.PI);
            ctx.fillStyle = 'black';
            ctx.fill();
        }
        // Handle AI turns
        if (tanks[currentPlayer]?.isAI && !projectile.flying) {
            let targetTank;
            do {
                targetTank = tanks[Math.floor(Math.random() * tanks.length)];
            } while (targetTank === tanks[currentPlayer]);
            tanks[currentPlayer].aiFire(tanks, terrain, projectile, wind, canvas);
        }
    }
}
function showGameOverOverlay(message) {
    const overlay = document.getElementById('gameOverOverlay');
    const messageElement = document.getElementById('gameOverMessage');
    messageElement.textContent = message;
    overlay.classList.remove('hidden');
}

function getNextAliveTankIndex(startIndex) {
    let nextIndex = startIndex;
    // Loop until you find an alive tank (or you come full circle)
    do {
        nextIndex = (nextIndex + 1) % tanks.length;
        if (tanks[nextIndex].alive) {
            return nextIndex;
        }
    } while (nextIndex !== startIndex);
    return startIndex; // fallback (shouldn't happen if at least one is alive)
}


function resetRound() {
    isGameOver = false;
    projectile = { x: null, y: null, flying: false };
    needsRedraw = true;
    currentPlayer = 0;
    wind = (Math.random() * 2 - 1) / 10;

    // Reinitialize terrain using the same settings
    const newTerrain = new Terrain();
    terrain.points = newTerrain.points;

    // Recalculate tank positions for all tanks
    const newTankPositions = getRandomTankPositions(numPlayers, terrain);
    tanks.forEach((tank, i) => {
        tank.x = newTankPositions[i].x;
        tank.y = newTankPositions[i].y;
        tank.angle = Math.PI / 4;
        tank.power = 50;
        tank.alive = true; // Revive the tank
    });
}


function newGame() {
    window.location.href = "index.html"; // Or simply use window.location.reload();
}


function showGameOverOverlay(message) {
    const overlay = document.getElementById('gameOverOverlay');
    const messageElement = document.getElementById('gameOverMessage');
    messageElement.textContent = message;
    overlay.classList.remove('hidden');
}


function gameLoop() {
    // If the current tank is dead, skip to the next alive tank
    if (!tanks[currentPlayer].alive) {
        currentPlayer = getNextAliveTankIndex(currentPlayer);
    }

    if (!isGameOver) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        terrain.draw(ctx, canvas);
        tanks.forEach(tank => {
            if (tank.alive) {
                tank.draw(ctx);
            }
        });
        drawHUD();
        if (projectile.x !== null && projectile.y !== null) {
            ctx.beginPath();
            ctx.arc(projectile.x, projectile.y, 3, 0, 2 * Math.PI);
            ctx.fillStyle = 'black';
            ctx.fill();
        }
        // For AI turns, check alive status before firing
        if (tanks[currentPlayer].isAI && !projectile.flying && tanks[currentPlayer].alive) {
            let targetTank;
            do {
                targetTank = tanks[Math.floor(Math.random() * tanks.length)];
            } while (targetTank === tanks[currentPlayer] || !targetTank.alive);
            tanks[currentPlayer].aiFire(tanks, terrain, projectile, wind, canvas);
        }
    }
    requestAnimationFrame(gameLoop);
}

gameLoop();

document.addEventListener('keydown', (event) => {
    let tank = tanks[currentPlayer];
    // If current tank is not alive, update currentPlayer and return early
    if (!tank.alive) {
        currentPlayer = getNextAliveTankIndex(currentPlayer);
        return;
    }

    if (event.key === '/') {
        projectile.flying = false;
        needsRedraw = true;
        currentPlayer = getNextAliveTankIndex(currentPlayer);
    }

    if (!tank.isAI) {
        needsRedraw = true;
        if (event.key === 'ArrowLeft') {
            tank.angle += Math.PI / 180;
        } else if (event.key === 'ArrowRight') {
            tank.angle -= Math.PI / 180;
        } else if (event.key === 'ArrowUp') {
            tank.power += 1;
        } else if (event.key === 'ArrowDown') {
            tank.power -= 1;
        } else if (event.key === ' ') {
            event.preventDefault();
            tank.fire(tanks, terrain, projectile, wind, canvas);
        }
    }
});


document.getElementById('continueButton').addEventListener('click', () => {
    document.getElementById('gameOverOverlay').classList.add('hidden');
    resetRound();
});

document.getElementById('newGameButton').addEventListener('click', () => {
    newGame();
});

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('gameOverOverlay').classList.add('hidden');
});

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('gameForm');
    const canvas = document.getElementById('gameCanvas');
    const urlParams = getUrlParams(); // assuming this is defined in utils.js
    if (urlParams.players) {
        form.classList.add('hidden');
        canvas.classList.remove('hidden');
        // Optionally initialize your game immediately:
        startGame(urlParams);
    }
});
