// Shared game state and UI functions
export const state = {
    gameState: 'LOBBY', // Options: 'LOBBY', 'LOBBY_SHOPPING', 'PLAYING'
    wind: 0,
    gravity: 0.1,
    freezeTankGravity: false, // New flag for Earthquake effect
    projectiles: [], // Supported multiple active projectiles
    projectileLoopActive: false, // Guards projectile simulation loop from getting orphaned
    isGameOver: false,
    needsRedraw: true,
    aiReadyToFire: true,
    aiTurnTimeout: null,
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
    deathTriggerChance: 0.1, // Default 10%
    playerRosterConfig: [],
    windIntensity: 'normal',
    turnTimer: { enabled: false, seconds: 30 },
    remainingTurnTime: 0,
    // Edge Behaviors
    edgeBehavior: 'impact', // Default setting (from setup)
    activeEdgeBehavior: 'impact', // Actual rule for current round
    // Visual Effects
    activeExplosions: [], // Centralized explosion tracking
    screenShake: { intensity: 0, startTime: 0, duration: 0 },
    laserBeams: [] // transient beam visuals: { x1, y1, x2, y2, width, color, expiresAt, duration }
};

export const EDGE_BEHAVIORS = {
    IMPACT: 'impact',
    REFLECT: 'reflect',
    TELEPORT: 'teleport',
    RANDOM: 'random'
};

export function triggerScreenShake(intensity, duration) {
    state.screenShake.intensity = intensity;
    state.screenShake.duration = duration;
    state.screenShake.startTime = performance.now();
}

export function getNextAliveTankIndex(startIndex) {
    if (!state.tanks || state.tanks.length === 0) return startIndex;
    let nextIndex = startIndex;
    do {
        nextIndex = (nextIndex + 1) % state.tanks.length;
        if (state.tanks[nextIndex].alive) {
            return nextIndex;
        }
    } while (nextIndex !== startIndex);
    return startIndex;
}

export function startTurn(index) {
    state.currentPlayer = index;
    
    // Clear any pending AI turn safety timeouts
    if (state.aiTurnTimeout) {
        clearTimeout(state.aiTurnTimeout);
        state.aiTurnTimeout = null;
    }

    if (state.turnTimer && state.turnTimer.enabled) {
        state.remainingTurnTime = state.turnTimer.seconds;
    }
    if (state.store) {
        state.store.updateWeaponSelector(state.tanks[state.currentPlayer]);
    }
}

export function isSettling() {
    // 1. Projectiles in flight?
    if (state.projectiles.length > 0) return true;
    
    // 2. Terrain frozen or Tank gravity frozen (Earthquake sequence)?
    if (state.terrain && state.terrain.freezeGravity) return true;
    if (state.freezeTankGravity) return true;
    
    // 3. AI is currently thinking/preparing to fire?
    if (!state.aiReadyToFire) return true;
    
    // 4. Any tanks still falling?
    const fallingTank = state.tanks.find(t => t.alive && Math.abs(t.vy) > 0.1);
    if (fallingTank) return true;

    return false;
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
    const angleText = (tank.angle * (180 / Math.PI)).toFixed(1) + '°';
    state.ctx.fillText('Angle: ' + angleText, 10, 40);
    state.ctx.fillText('Power: ' + tank.power.toFixed(1), 10, 60);
    state.ctx.fillText('Wind: ' + (state.wind * 100).toFixed(1), 10, 80);
    
    let currentY = 100;
    if (state.turnTimer && state.turnTimer.enabled) {
        state.ctx.fillStyle = state.remainingTurnTime < 5 ? 'red' : 'black';
        state.ctx.fillText('Time: ' + Math.ceil(state.remainingTurnTime) + 's', 10, currentY);
        state.ctx.fillStyle = 'black';
        currentY += 20;
    }
    
    state.ctx.fillText('Score: ' + Math.round(tank.score), 10, currentY);
    currentY += 20;
    state.ctx.fillText('Currency: ' + tank.currency, 10, currentY);
    currentY += 20;
    state.ctx.fillText('Health: ' + tank.health, 10, currentY);
    currentY += 20;

    if (tank.shieldDurability > 0) {
        const shieldPercent = Math.ceil((tank.shieldDurability / tank.maxHealth) * 100);
        state.ctx.fillStyle = '#00f7ff';
        state.ctx.fillText(`Shield: ${shieldPercent}%`, 10, currentY);
        state.ctx.fillStyle = 'black';
        currentY += 20;
    }
    if (tank.parachuteDurability > 0) {
        const paraPercent = Math.ceil((tank.parachuteDurability / tank.maxHealth) * 100);
        state.ctx.fillStyle = '#ff00ff';
        state.ctx.fillText(`Parachute: ${paraPercent}%`, 10, currentY);
        state.ctx.fillStyle = 'black';
        currentY += 20;
    }
    
    let weaponText = 'Weapon: ' + tank.selectedWeapon;
    if (tank.selectedWeapon !== 'default') {
        const count = tank.inventory.filter(i => i.id === tank.selectedWeapon).length;
        weaponText += ` (${count})`;
    }
    state.ctx.fillText(weaponText, 10, currentY);
    currentY += 20;

    state.ctx.fillStyle = 'blue';
    state.ctx.fillText('Edge Rule: ' + state.activeEdgeBehavior.toUpperCase(), 10, currentY);
}

export function draw() {
    if (!state.isGameOver) {
        let offsetX = 0;
        let offsetY = 0;

        if (state.screenShake.duration > 0) {
            const now = performance.now();
            const elapsed = now - state.screenShake.startTime;
            if (elapsed < state.screenShake.duration) {
                const decay = 1 - (elapsed / state.screenShake.duration);
                const currentIntensity = state.screenShake.intensity * decay;
                offsetX = (Math.random() * 2 - 1) * currentIntensity;
                offsetY = (Math.random() * 2 - 1) * currentIntensity;
            } else {
                state.screenShake.duration = 0;
            }
        }

        state.ctx.save();
        state.ctx.translate(offsetX, offsetY);

        state.ctx.clearRect(-offsetX, -offsetY, state.canvas.width, state.canvas.height);
        state.terrain.draw(state.ctx);
        state.tanks.forEach(tank => {
            if (tank.alive) {
                tank.draw(state.ctx);
            }
        });

        // Render Explosions (Centralized System)
        const now = performance.now();
        state.activeExplosions = state.activeExplosions.filter(exp => exp.startTime + exp.duration > now);
        for (const exp of state.activeExplosions) {
            const elapsed = now - exp.startTime;
            const progress = elapsed / exp.duration;
            const currentRadius = exp.radius * (0.2 + 0.8 * Math.sin(progress * Math.PI)); // Expand then stay/shrink slightly
            const alpha = 1 - progress;

            state.ctx.beginPath();
            state.ctx.save();
            state.ctx.globalAlpha = alpha;
            state.ctx.arc(exp.x, exp.y, currentRadius, 0, 2 * Math.PI);
            state.ctx.fillStyle = exp.color || 'orange';
            state.ctx.fill();
            state.ctx.restore();
        }

        // Render transient laser beams in world space (shake-aware).
        if (Array.isArray(state.laserBeams) && state.laserBeams.length > 0) {
            const now = performance.now();
            state.laserBeams = state.laserBeams.filter(beam => beam && beam.expiresAt > now);
            for (const beam of state.laserBeams) {
                const remaining = Math.max(0, beam.expiresAt - now);
                const life = beam.duration > 0 ? (remaining / beam.duration) : 0;
                const alpha = Math.max(0, Math.min(1, life));
                const coreWidth = Math.max(1, beam.width || 3);
                const glowWidth = coreWidth * 2.2;

                state.ctx.save();
                state.ctx.lineCap = 'round';

                state.ctx.globalAlpha = alpha * 0.45;
                state.ctx.strokeStyle = beam.color || '#44ff99';
                state.ctx.lineWidth = glowWidth;
                state.ctx.beginPath();
                state.ctx.moveTo(beam.x1, beam.y1);
                state.ctx.lineTo(beam.x2, beam.y2);
                state.ctx.stroke();

                state.ctx.globalAlpha = alpha;
                state.ctx.strokeStyle = '#cffff0';
                state.ctx.lineWidth = coreWidth;
                state.ctx.beginPath();
                state.ctx.moveTo(beam.x1, beam.y1);
                state.ctx.lineTo(beam.x2, beam.y2);
                state.ctx.stroke();

                state.ctx.restore();
            }
        }
        
        state.ctx.restore(); // Restore before HUD so HUD doesn't shake (optional choice, but standard)
        
        drawHUD(); // Draw HUD on top, static
        
        // Render all active projectiles
        state.projectiles.forEach(proj => {
            if (proj.x !== null && proj.y !== null) {
                state.ctx.save();
                state.ctx.translate(offsetX, offsetY);
                state.ctx.beginPath();
                state.ctx.arc(proj.x, proj.y, 3, 0, 2 * Math.PI);
                state.ctx.fillStyle = proj.color || 'black';
                state.ctx.fill();
                state.ctx.restore();
            }
        });
    }
}
