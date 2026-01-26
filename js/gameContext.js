// Shared game state and UI functions
export const state = {
    gameState: 'LOBBY', // 'LOBBY' or 'PLAYING'
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
    store: null
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
