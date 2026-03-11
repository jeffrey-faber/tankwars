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
    isTerrainSettling: false, 
    settleStartTime: 0, // Track when settling began
    // Sudden Death
    suddenDeath: {
        active: false,
        type: 'none',
        startTurn: 10,
        currentTurnCount: 0,
        nukeScale: 1.0,
        teleportFocus: 0.0, // 0 = random, 1 = perfectly on top of each other
        isResolving: false 
    },
    // Edge Behaviors
    edgeBehavior: 'impact', // Default setting (from setup)
    activeEdgeBehavior: 'impact', // Actual rule for current round
    // Visual Effects
    activeExplosions: [], // Centralized explosion tracking
    screenShake: { intensity: 0, startTime: 0, duration: 0 },
    laserBeams: [], // transient beam visuals: { x1, y1, x2, y2, width, color, expiresAt, duration }
    windParticles: [], // visual only particles for wind
    activeGlobalWaves: [], // global map effects: { x, speed, amplitude, frequency }
    activeGravityWells: [], // { x, y, radius, strength, turnsLeft }
    gravityCenter: null // { x, y, strength, turnsLeft } - Global orbital gravity override
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
    const currentTank = state.tanks[index];
    if (!currentTank || !currentTank.alive) {
        console.warn(`Attempted to start turn for dead tank ${index}, redirecting...`);
        const nextIdx = getNextAliveTankIndex(index);
        if (nextIdx !== index) {
            startTurn(nextIdx);
        }
        return;
    }

    state.currentPlayer = index;
    console.log(`TURN START: ${currentTank.name} (Index ${index})`);

    // Manage Gravity Wells
    if (state.activeGravityWells) {
        for (let i = state.activeGravityWells.length - 1; i >= 0; i--) {
            state.activeGravityWells[i].turnsLeft--;
            if (state.activeGravityWells[i].turnsLeft <= 0) {
                console.log("GRAVITY WELL EXPIRED");
                state.activeGravityWells.splice(i, 1);
            }
        }
    }

    // Manage Global Gravity Center
    if (state.gravityCenter) {
        state.gravityCenter.turnsLeft--;
        if (state.gravityCenter.turnsLeft <= 0) {
            console.log("GLOBAL GRAVITY CORE EXPIRED");
            state.gravityCenter = null;
        }
    }

    // Sudden Death Progression: Only increment and trigger if NOT already resolving
    if (state.suddenDeath && state.suddenDeath.type !== 'none' && !state.suddenDeath.isResolving) {
        state.suddenDeath.currentTurnCount++;
        
        if (state.suddenDeath.currentTurnCount >= state.suddenDeath.startTurn) {
            state.suddenDeath.isResolving = true;

            setTimeout(() => {
                // If the player somehow died while we were waiting (rare), abort
                if (!currentTank.alive) {
                    state.suddenDeath.isResolving = false;
                    return; 
                }

                if (!state.suddenDeath.active) {
                    state.suddenDeath.active = true;
                    if (state.suddenDeath.type === 'random') {
                        const options = ['nuke_growth', 'teleport_chaos', 'health_decay', 'blackhole_storm'];
                        state.suddenDeath.activeType = options[Math.floor(Math.random() * options.length)];
                    } else {
                        state.suddenDeath.activeType = state.suddenDeath.type;
                    }
                }
                
                if (state.suddenDeath.activeType === 'nuke_growth') {
                    state.suddenDeath.nukeScale += 0.15;
                } else if (state.suddenDeath.activeType === 'teleport_chaos') {
                    state.suddenDeath.teleportFocus = Math.min(1.0, state.suddenDeath.teleportFocus + 0.05);
                    applySuddenDeathTeleport();
                } else if (state.suddenDeath.activeType === 'health_decay') {
                    applySuddenDeathDecay();
                } else if (state.suddenDeath.activeType === 'blackhole_storm') {
                    applySuddenDeathBlackHole();
                }

                setTimeout(() => {
                    state.suddenDeath.isResolving = false;
                    // If the event killed the current player, the gameLoop fallback will now correctly
                    // call startTurn for the NEXT guy after this settling is done.
                }, 300); 

            }, 200);
        }
    }

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

    // Notify mobile manager or others that turn has started
    if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('turnStarted', { detail: { tank: state.tanks[state.currentPlayer] } }));
    }
}

export function isSettling() {
    // 0. Sudden Death event in progress?
    if (state.suddenDeath?.isResolving) return true;

    // 1. Tectonic ripples or Global Gravity overrides in progress?
    if (state.activeGlobalWaves && state.activeGlobalWaves.length > 0) return true;
    if (state.gravityCenter) return true;
    
    // 2. Terrain falling? (Controlled by 5s timeout in main.js)
    if (state.isTerrainSettling) return true;

    // 3. Projectiles in flight?
    if (state.projectiles.length > 0) return true;
    
    // 4. Terrain frozen or Tank gravity frozen (Earthquake sequence)?
    if (state.terrain && state.terrain.freezeGravity) return true;
    if (state.freezeTankGravity) return true;
    
    // 5. AI is currently thinking/preparing to fire?
    if (!state.aiReadyToFire) return true;
    
    // 6. Any tanks still falling or drifting with momentum?
    const movingTank = state.tanks.find(t => {
        if (!t.alive) return false;
        // If tank is in a gravity well, ignore its velocity for settling purposes
        const inWell = state.activeGravityWells?.some(well => {
            const dx = well.x - (t.x + t.width / 2);
            const dy = well.y - (t.y - t.height / 2);
            return (dx * dx + dy * dy) < (well.radius * well.radius);
        });
        if (inWell) return false;

        // Threshold check (0.1 is standard, 0.02 was too sensitive)
        return (Math.abs(t.vy) > 0.1 || Math.abs(t.vx) > 0.1);
    });
    if (movingTank) return true;

    return false;
}

export function showGameOverOverlay(message) {
    const overlay = document.getElementById('gameOverOverlay');
    const messageElement = document.getElementById('gameOverMessage');
    if (messageElement) messageElement.textContent = message;
    if (overlay) overlay.classList.remove('hidden');
}

function applySuddenDeathTeleport() {
    if (!state.tanks) return;
    const aliveTanks = state.tanks.filter(t => t.alive);
    if (aliveTanks.length < 2) return;

    // Calculate average center of alive tanks
    let avgX = 0;
    aliveTanks.forEach(t => avgX += t.x + t.width / 2);
    avgX /= aliveTanks.length;

    aliveTanks.forEach(tank => {
        const canvasWidth = state.canvas?.width || 1200;
        const randomX = Math.random() * (canvasWidth - 100) + 50;
        
        // Blend between random position and the average center based on focus
        const targetX = randomX * (1 - state.suddenDeath.teleportFocus) + avgX * state.suddenDeath.teleportFocus;
        
        tank.x = targetX - tank.width / 2;
        tank.y = 50; // teleport to air
        tank.vy = 0;
        tank.teleportImmunity = true;
        
        if (state.ctx && state.canvas) {
            const centerX = tank.x + tank.width / 2;
            const centerY = tank.y - tank.height / 2;
            state.activeExplosions.push({
                x: centerX, y: centerY, radius: 30, color: '#00f7ff',
                startTime: performance.now(), duration: 400
            });
        }
    });
}

function applySuddenDeathDecay() {
    if (!state.tanks) return;
    state.tanks.forEach(tank => {
        if (tank.alive) {
            const loss = Math.max(1, Math.floor(tank.maxHealth * 0.1));
            tank.health -= loss;
            if (tank.health <= 0) tank.die();
            
            // Visual feedback
            const centerX = tank.x + tank.width / 2;
            const centerY = tank.y - tank.height / 2;
            state.activeExplosions.push({
                x: centerX, y: centerY, radius: 20, color: 'rgba(255, 0, 0, 0.5)',
                startTime: performance.now(), duration: 300
            });
        }
    });
}

function applySuddenDeathBlackHole() {
    const canvasWidth = state.canvas?.width || 1200;
    const canvasHeight = state.canvas?.height || 600;
    
    // Pick a random location reasonably within bounds
    const rx = Math.random() * (canvasWidth - 200) + 100;
    const ry = Math.random() * (canvasHeight - 200) + 100;
    
    // Escalating sizes
    const baseRadius = 120;
    // Every 5 turns after activation, increase size tier? 
    // Or just scale it linearly.
    const turnsActive = state.suddenDeath.currentTurnCount - state.suddenDeath.startTurn;
    const scale = 1.0 + (turnsActive * 0.1); // 10% bigger per turn
    const radius = baseRadius * scale;
    
    // Pick size tier for effects
    let size = 'medium';
    if (scale > 1.5) size = 'large';
    
    triggerBlackHoleEffect(rx, ry, radius, 15 * scale, size);
}

export function triggerBlackHoleEffect(x, y, radius, pullStrength, size = 'medium') {
    console.log(`BLACK HOLE EFFECT! Pos: ${Math.round(x)},${Math.round(y)}, Radius: ${Math.round(radius)}`);

    // 1. Pull Tanks with Momentum
    state.tanks.forEach(otherTank => {
        if (!otherTank.alive) return;
        const dx = x - (otherTank.x + otherTank.width / 2);
        const dy = y - (otherTank.y - otherTank.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < radius) {
            const force = (1 - dist / radius) * pullStrength;
            const angle = Math.atan2(dy, dx);
            
            // Strong initial displacement to "snap" them towards it
            otherTank.x += Math.cos(angle) * force * 8;
            otherTank.y += Math.sin(angle) * force * 8;
            
            // Assign persistent momentum (both X and Y)
            const impulse = force * 1.5;
            otherTank.vx = (otherTank.vx || 0) + Math.cos(angle) * impulse;
            otherTank.vy = (otherTank.vy || 0) + Math.sin(angle) * impulse;
            
            otherTank.lastSolidY = otherTank.y; 
        }
    });

    // 2. Terrain Manipulation
    const removalScale = size === 'large' ? 0.8 : (size === 'medium' ? 0.5 : 0.2);
    if (state.terrain && state.terrain.explode) {
        state.terrain.explode(x, y, radius * removalScale);
    }

    if (size === 'medium' || size === 'large') {
        if (state.terrain && state.terrain.addTerrain) {
            // Spawn a tiny amount of dirt (reduced count and size)
            const dirtCount = size === 'large' ? 5 : 3; 
            for (let i = 0; i < dirtCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = (0.1 + Math.random() * 0.4) * radius;
                const dx = Math.cos(angle) * dist;
                const dy = Math.sin(angle) * dist;
                state.terrain.addTerrain(x + dx, y + dy, 3 + Math.random() * 3);
            }
        }
    }

    // 3. Visuals
    triggerScreenShake(size === 'large' ? 15 : 8, 400);
    if (state.ctx && state.canvas) {
        const color = size === 'large' ? 'purple' : (size === 'medium' ? '#333' : '#000');
        // We can't use createExplosion here directly easily without importing, 
        // but we can push to activeExplosions.
        state.activeExplosions.push({
            x, y, radius, color,
            startTime: performance.now(), duration: 500
        });
        
        // Multi-flash effect
        for (let i = 0; i < 3; i++) {
            state.activeExplosions.push({
                x, y, radius: radius * (0.1 + i * 0.1), color: 'white',
                startTime: performance.now() + i * 50, duration: 200
            });
        }
    }

    if (state.terrain?.updateCanvas) {
        state.terrain.updateCanvas();
    }
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
    currentY += 20;

    if (state.suddenDeath && state.suddenDeath.active) {
        state.ctx.fillStyle = 'red';
        let label = "SUDDEN DEATH: ";
        if (state.suddenDeath.activeType === 'nuke_growth') label += "ESCALATING NUKES (" + (state.suddenDeath.nukeScale * 100).toFixed(0) + "%)";
        else if (state.suddenDeath.activeType === 'teleport_chaos') label += "QUANTUM COLLAPSE (" + (state.suddenDeath.teleportFocus * 100).toFixed(0) + "%)";
        else if (state.suddenDeath.activeType === 'health_decay') label += "SPECTRAL DECAY";
        else if (state.suddenDeath.activeType === 'blackhole_storm') label += "SINGULARITY EVENT";
        state.ctx.fillText(label, 10, currentY);
        currentY += 20;
    }

    if (state.isTerrainSettling) {
        state.ctx.fillStyle = 'orange';
        state.ctx.font = 'bold 14px Arial';
        state.ctx.textAlign = 'center';
        state.ctx.fillText("TERRAIN SETTLING...", state.canvas.width / 2, 30);
        state.ctx.textAlign = 'left'; // Reset
    } else if (isSettling()) {
        state.ctx.fillStyle = 'yellow';
        state.ctx.font = 'bold 14px Arial';
        state.ctx.textAlign = 'center';
        state.ctx.fillText("PHYSICS SETTLING...", state.canvas.width / 2, 30);
        state.ctx.textAlign = 'left'; // Reset
    }
}

export function draw() {
    if (!state.isGameOver) {
        const now = performance.now();
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
        
        // Render Wind Particles (Visual only)
        const windIntensity = Math.abs(state.wind);
        if (windIntensity > 0.001) { 
            // Increase base multiplier to account for full-height distribution
            const particleCount = Math.floor(windIntensity * 1500) + 5; 
            
            // Add new particles if needed
            while (state.windParticles.length < particleCount) {
                // Use squared random for vertical distribution (skews heavily towards top)
                const skewedY = Math.pow(Math.random(), 2.5) * state.canvas.height;
                
                state.windParticles.push({
                    x: Math.random() * state.canvas.width,
                    y: skewedY,
                    speed: 1.2 + Math.random() * 3.0,
                    length: 2 + Math.random() * 4 // Shorter streaks (was 6-16)
                });
            }
            
            state.ctx.strokeStyle = 'rgba(40, 40, 40, 0.6)'; 
            state.ctx.lineWidth = 1.5; 
            state.ctx.lineCap = 'butt';
            
            for (let i = state.windParticles.length - 1; i >= 0; i--) {
                const p = state.windParticles[i];
                const moveSpeed = state.wind * p.speed * 200;
                
                // Fade opacity based on height (top is clearer, bottom is invisible)
                const heightFactor = 1 - (p.y / state.canvas.height);
                state.ctx.globalAlpha = heightFactor; 
                
                state.ctx.beginPath();
                state.ctx.moveTo(p.x, p.y);
                state.ctx.lineTo(p.x + (state.wind > 0 ? p.length : -p.length), p.y);
                state.ctx.stroke();

                p.x += moveSpeed;
                state.ctx.globalAlpha = 1.0; // Reset
                
                // Wrap around
                if (p.x < -50) p.x = state.canvas.width + 50;
                if (p.x > state.canvas.width + 50) p.x = -50;
                
                if (i > particleCount) {
                    state.windParticles.splice(i, 1);
                }
            }
        } else {
            state.windParticles = [];
        }

        state.tanks.forEach(tank => {
            if (tank.alive) {
                tank.draw(state.ctx);
            }
        });

        // Render Gravity Wells
        if (state.activeGravityWells && state.activeGravityWells.length > 0) {
            state.activeGravityWells.forEach(well => {
                const alpha = Math.min(0.4, (well.turnsLeft / 5) * 0.4);
                const pulse = 0.8 + Math.sin(now / 200) * 0.2;
                
                state.ctx.beginPath();
                const gradient = state.ctx.createRadialGradient(well.x, well.y, 0, well.x, well.y, well.radius * pulse);
                gradient.addColorStop(0, `rgba(100, 0, 255, ${alpha})`);
                gradient.addColorStop(0.5, `rgba(50, 0, 150, ${alpha * 0.5})`);
                gradient.addColorStop(1, 'transparent');
                
                state.ctx.fillStyle = gradient;
                state.ctx.arc(well.x, well.y, well.radius * pulse, 0, Math.PI * 2);
                state.ctx.fill();
                
                // Core
                state.ctx.beginPath();
                state.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                state.ctx.arc(well.x, well.y, 3, 0, Math.PI * 2);
                state.ctx.fill();
            });
        }

        // Render Global Gravity Center (Experimental)
        if (state.gravityCenter) {
            const pulse = 1.0 + Math.sin(now / 150) * 0.3;
            state.ctx.save();
            state.ctx.beginPath();
            const grad = state.ctx.createRadialGradient(state.gravityCenter.x, state.gravityCenter.y, 0, state.gravityCenter.x, state.gravityCenter.y, 40 * pulse);
            grad.addColorStop(0, 'rgba(0, 255, 255, 0.6)');
            grad.addColorStop(1, 'transparent');
            state.ctx.fillStyle = grad;
            state.ctx.arc(state.gravityCenter.x, state.gravityCenter.y, 40 * pulse, 0, Math.PI * 2);
            state.ctx.fill();
            
            // Central core
            state.ctx.beginPath();
            state.ctx.fillStyle = 'white';
            state.ctx.arc(state.gravityCenter.x, state.gravityCenter.y, 5, 0, Math.PI * 2);
            state.ctx.fill();
            state.ctx.restore();
        }

        // Render Explosions (Centralized System)
        state.activeExplosions = state.activeExplosions.filter(exp => exp.startTime + exp.duration > now);
        for (const exp of state.activeExplosions) {
            const elapsed = now - exp.startTime;
            if (elapsed < 0) continue; // Skip if scheduled for the future

            const progress = Math.min(1, elapsed / exp.duration);
            const currentRadius = Math.max(0, exp.radius * (0.2 + 0.8 * Math.sin(progress * Math.PI)));
            const alpha = 1 - progress;

            state.ctx.beginPath();
            state.ctx.save();
            state.ctx.globalAlpha = Math.max(0, alpha);
            state.ctx.arc(exp.x, exp.y, currentRadius, 0, 2 * Math.PI);
            state.ctx.fillStyle = exp.color || 'orange';
            state.ctx.fill();
            state.ctx.restore();
        }

        // Render transient laser beams in world space (shake-aware).
        if (Array.isArray(state.laserBeams) && state.laserBeams.length > 0) {
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
