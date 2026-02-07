// Shared game state and UI functions
export const state = {
    gameState: 'LOBBY', // Options: 'LOBBY', 'LOBBY_SHOPPING', 'PLAYING'
    wind: 0,
    gravity: 0.1,
    projectile: { x: null, y: null, flying: false, type: 'default', damage: 100, explosionRadius: 30 },
    isGameOver: false,
    needsRedraw: true,
    aiReadyToFire: true,
    currentPlayer: 0,
    numPlayers: 2,
    tanks: [],
    terrain: null,
    canvas: null,
    ctx: null,
    store: null,
    // Match settings
    totalGames: 5,
    currentGameIndex: 0,
    winCondition: 'score', // 'score' or 'wins'
    startingCash: 100,
    playerRosterConfig: []
};

export function getNextAliveTankIndex(startIndex) {
    let nextIndex = startIndex;
    do {
        nextIndex = (nextIndex + 1) % state.tanks.length;
        if (state.tanks[nextIndex].alive) {
            return nextIndex;
        }
    } while (nextIndex !== startIndex);
    return startIndex;
}

export function showGameOverOverlay(message) {
    const overlay = document.getElementById('gameOverOverlay');
    const messageElement = document.getElementById('gameOverMessage');
    if (messageElement) messageElement.textContent = message;
    if (overlay) overlay.classList.remove('hidden');
}

export function drawHUD() {
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
    
    let weaponText = 'Weapon: ' + tank.selectedWeapon;
    if (tank.selectedWeapon !== 'default') {
        const count = tank.inventory.filter(i => i.id === tank.selectedWeapon).length;
        weaponText += ` (${count})`;
    }
    state.ctx.fillText(weaponText, 10, 160);
}

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
    }
}
