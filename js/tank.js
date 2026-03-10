import { getRandomColor, createExplosion, calculateWind } from './utils.js';
import { state, getNextAliveTankIndex, draw, triggerScreenShake, startTurn, triggerBlackHoleEffect } from './gameContext.js';
import { StandardAI, StupidAI, LobberAI, SniperAI, MastermindAI, NemesisAI, BitwiseCommanderAI, GhostAI, SingularityAI } from './aiControllers.js';

const ECONOMY_MULTIPLIER = 1;

function checkTerrainAndBounds(x, y, terrain, canvas) {
    if (x < 0) return { hit: true, side: 'left' };
    if (x > canvas.width) return { hit: true, side: 'right' };
    if (y < 0) return { hit: true, side: 'top' };
    if (y > canvas.height) return { hit: true, side: 'bottom' };
    if (terrain.checkCollision(x, y)) return { hit: true, side: 'terrain' };
    return { hit: false };
}

function checkDirectHit(x, y, tanks, sourceTank, excludeSourcePlayer = false) {
    for (let i = 0; i < tanks.length; i++) {
        const otherTank = tanks[i];
        if (!otherTank.alive) continue;
        if (excludeSourcePlayer && otherTank === sourceTank) continue;
        
        if (x >= otherTank.x && x <= otherTank.x + otherTank.width &&
            y >= otherTank.y - otherTank.height && y <= otherTank.y) {
            return otherTank;
        }
    }
    return null;
}

function applyExplosionDamage(x, y, tanks, radius, damage, sourcePlayerId = -1, directHitTank = null) {
    tanks.forEach((otherTank, tankIndex) => {
        if (!otherTank.alive) return;
        
        const tankCenterX = otherTank.x + otherTank.width / 2;
        const tankCenterY = otherTank.y - otherTank.height / 2;
        const dx = x - tankCenterX;
        const dy = y - tankCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const isDirectHit = (otherTank === directHitTank);
        
        if (distance < radius || isDirectHit) {
            let distanceFactor = 1 - (distance / radius);
            if (distanceFactor < 0) distanceFactor = 0;
            
            let effectiveDamage = Math.floor(damage * distanceFactor);
            
            if (isDirectHit) {
                effectiveDamage = Math.max(effectiveDamage, damage);
                effectiveDamage += 25;
            }
            
            if (otherTank.shieldDurability > 0) {
                const absorbed = Math.min(effectiveDamage, otherTank.shieldDurability);
                otherTank.shieldDurability -= absorbed;
                effectiveDamage -= absorbed;
                
                // Arcade Score for damaging shield
                if (tankIndex !== sourcePlayerId && absorbed > 0 && sourcePlayerId !== -1) {
                    state.tanks[sourcePlayerId].score += Math.round(absorbed * 5);
                    state.tanks[sourcePlayerId].currency += Math.floor(5 * ECONOMY_MULTIPLIER);
                }
            }

            if (effectiveDamage > 0) {
                const actualDamage = Math.min(otherTank.health, effectiveDamage);
                otherTank.health -= actualDamage;
                
                // Track last attacker for kill attribution (even if they fall to death later)
                if (sourcePlayerId !== -1) {
                    otherTank.lastAttackerId = sourcePlayerId;
                }

                // Reward for damage to others
                if (tankIndex !== sourcePlayerId && actualDamage > 0 && sourcePlayerId !== -1) {
                    // Arcade Score for health damage
                    state.tanks[sourcePlayerId].score += Math.round(actualDamage * 10);
                    const reward = Math.floor(actualDamage * 0.2 * ECONOMY_MULTIPLIER); // 1 coin per 5 damage
                    state.tanks[sourcePlayerId].currency += reward;
                }

                if (otherTank.health <= 0) {
                    otherTank.die(sourcePlayerId);
                }
            }
        }
    });
}

export class Tank {
    constructor(x, y, isAI = false, aiLevel = 0, name = '', personality = null) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 10;
        this.angle = Math.PI / 4;
        this.power = 50;
        this.color = getRandomColor();
        this.isAI = isAI;
        this.aiLevel = aiLevel;
        this.personality = personality;
        this.name = name;
        this.score = 0;
        this.wins = 0;
        this.kills = 0;
        this.currency = 100;
        this.alive = true;
        this.lastAttackerId = -1; // Track who hit us last for kill attribution
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.teleportImmunity = false; // Fall damage immunity after teleport
        this.shieldDurability = 0; // Durability in HP points
        this.inventory = [];
        this.selectedWeapon = 'default';
        this.vy = 0; // Vertical velocity for falling
        this.vx = 0; // Horizontal velocity for momentum
        
        // Fall Damage Properties
        this.safeFallHeight = 30; // px
        this.fallDamageMultiplier = 2.0; // damage per px over limit
        this.lastSolidY = this.y;
        this.isInitialSpawn = true;
        this.parachuteDurability = 0; // Durability in HP points
        
        if (this.isAI) {
            this.initAIController();
        }
    }

    initAIController() {
        if (this.personality === 'stupid') {
            this.aiController = new StupidAI();
        } else if (this.personality === 'lobber') {
            this.aiController = new LobberAI();
        } else if (this.personality === 'sniper') {
            this.aiController = new SniperAI();
        } else if (this.personality === 'nemesis') {
            this.aiController = new NemesisAI();
        } else if (this.personality === 'commander') {
            this.aiController = new BitwiseCommanderAI();
        } else if (this.personality === 'mastermind') {
            this.aiController = new MastermindAI();
        } else if (this.personality === 'ghost') {
            this.aiController = new GhostAI();
        } else if (this.personality === 'singularity') {
            this.aiController = new SingularityAI();
        } else {
            // Standard AI based on aiLevel if no personality
            const diff = this.aiLevel <= 3 ? 'easy' : this.aiLevel <= 6 ? 'medium' : 'hard';
            this.aiController = new StandardAI(diff);
        }
    }

    updateFallTracking(isOnGround) {
        if (isOnGround) {
            this.handleLanding(this.y);
        }
    }

    handleLanding(currentY) {
        const fallDistance = currentY - this.lastSolidY;
        
        if (fallDistance > this.safeFallHeight) {
            if (!this.isInitialSpawn && !this.teleportImmunity) {
                const excess = fallDistance - this.safeFallHeight;
                let damage = Math.floor(excess * this.fallDamageMultiplier);
                
                if (damage > 0) {
                    // Parachute mitigation
                    if (this.parachuteDurability > 0) {
                        const absorbed = Math.min(damage, this.parachuteDurability);
                        this.parachuteDurability -= absorbed;
                        damage -= absorbed;
                    }

                    // Apply remaining damage to health
                    if (damage > 0) {
                        this.health = Math.max(0, this.health - damage);
                        
                        // Visual feedback
                        if (damage > 10) {
                            triggerScreenShake(Math.min(20, damage / 2), 300);
                        }
                        
                        if (this.health <= 0) {
                            this.die();
                        }
                    }
                }
            }
        }
        
        // Always reset spawn flag and immunity and update tracker on landing
        this.isInitialSpawn = false;
        this.teleportImmunity = false;
        this.lastSolidY = currentY;
    }

    die(killerId = -1) {
        if (!this.alive) return;
        this.alive = false;
        this.health = 0;

        // 1. Determine who gets the credit
        // Priority: Direct Killer > Last Attacker > Current Player (who likely caused the environment change)
        let effectiveKillerId = killerId;
        if (effectiveKillerId === -1 && this.lastAttackerId !== -1) {
            effectiveKillerId = this.lastAttackerId;
        }
        if (effectiveKillerId === -1) {
            effectiveKillerId = state.currentPlayer;
        }

        // 2. Apply Kill/Penalty Logic
        if (effectiveKillerId !== -1 && state.tanks[effectiveKillerId]) {
            const killer = state.tanks[effectiveKillerId];
            const myIndex = state.tanks.indexOf(this);

            if (effectiveKillerId === myIndex) {
                // Suicide check: Only penalty if it's actually my turn
                if (state.currentPlayer === myIndex) {
                    this.kills -= 1;
                }
            } else {
                // Legitimate kill by another
                killer.score += 1000;
                killer.kills += 1;
                killer.currency += Math.floor(50 * ECONOMY_MULTIPLIER);
            }
        }

        // 3. Trigger Death Explosion
        // ATTRIBUTION CHANGE: Death rattles now belong to the tank that exploded.
        // If your rattle kills someone, YOU get the credit.
        const myIndex = state.tanks.indexOf(this);
        this.triggerDeathExplosion(myIndex);
    }

    triggerDeathExplosion(killerId = -1) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y - this.height / 2;
        const myIndex = state.tanks.indexOf(this);
        
        // 1. Roll for Special Death vs Basic Death
        if (Math.random() >= (state.deathTriggerChance || 0.1)) {
            // Default small explosion
            if (state.ctx && state.canvas && draw) {
                createExplosion(centerX, centerY, 30, 'orange');
            }
            applyExplosionDamage(centerX, centerY, state.tanks, 30, 50, myIndex);
            return;
        }

        // 2. Special Death Triggered - Choose Type (33% each)
        const qualifyingItems = ['mega_nuke', 'nuke', 'dirtball', 'earthquake_s', 'earthquake_m', 'earthquake_l'];
        const availableItems = this.inventory.filter(item => qualifyingItems.includes(item.id));
        
        const roll = Math.random();
        let type = 'fireworks'; // Fallback
        if (roll < 0.333 && availableItems.length > 0) type = 'arsenal';
        else if (roll < 0.666) type = 'spray';

        if (type === 'arsenal') {
            const triggeredItem = availableItems[Math.floor(Math.random() * availableItems.length)];
            const invIndex = this.inventory.indexOf(triggeredItem);
            this.inventory.splice(invIndex, 1);

            console.log(`DEATH TRIGGER (Arsenal): ${this.name} used ${triggeredItem.id}!`);
            
            if (triggeredItem.id === 'dirtball') {
                if (state.terrain.addTerrain) state.terrain.addTerrain(centerX, centerY, 30);
                if (state.ctx && state.canvas && draw) createExplosion(centerX, centerY, 30, '#3d2b1f');
                applyExplosionDamage(centerX, centerY, state.tanks, 30, 10, myIndex);
            } else if (triggeredItem.id.startsWith('earthquake')) {
                // Apply tag damage so kills credit to us
                applyExplosionDamage(centerX, centerY, state.tanks, triggeredItem.effect.radius || 100, 0, myIndex);
                if (state.terrain.createCracks) {
                    state.terrain.freezeGravity = true;
                    state.freezeTankGravity = true;
                    const intensity = triggeredItem.effect.intensity || 8;
                    for (let i = 0; i < intensity; i++) {
                        state.terrain.createCracks(centerX, centerY, 15 + (intensity * 4), (i / intensity) * Math.PI * 2);
                    }
                    state.terrain.updateCanvas();
                    setTimeout(() => { state.terrain.freezeGravity = false; }, 800);
                    setTimeout(() => { state.freezeTankGravity = false; }, 2800);
                }
                if (state.ctx && state.canvas && draw) createExplosion(centerX, centerY, triggeredItem.effect.radius || 100, '#555555');
            } else if (triggeredItem.id.includes('nuke')) {
                const radius = triggeredItem.id === 'mega_nuke' ? 250 : 80;
                const damage = triggeredItem.id === 'mega_nuke' ? 250 : 150;
                if (state.ctx && state.canvas && draw) createExplosion(centerX, centerY, radius, 'red');
                if (state.terrain.explode) state.terrain.explode(centerX, centerY, radius);
                applyExplosionDamage(centerX, centerY, state.tanks, radius, damage, myIndex);
            }
        } else if (type === 'spray') {
            console.log(`DEATH TRIGGER (Spray): ${this.name} erupted into dirt!`);
            state.terrain.freezeGravity = true;
            state.freezeTankGravity = true;
            
            // Pop effect
            if (state.ctx && state.canvas && draw) createExplosion(centerX, centerY, 40, '#3d2b1f');

            // REVERSE EARTHQUAKE: Erupt upward
            const intensity = 6; // Reduced from 12
            for (let i = 0; i < intensity; i++) {
                const angle = -Math.PI/2 + (Math.random() * 0.4 - 0.2); // Narrower cone
                state.terrain.createCracks(centerX, centerY, 30 + Math.random() * 30, angle, 0, true);
            }
            
            state.terrain.updateCanvas();

            // Settle after eruption
            setTimeout(() => { 
                state.terrain.freezeGravity = false; 
                state.freezeTankGravity = false; 
            }, 800); // Shorter duration
        } else {
            console.log(`DEBUG: Triggering Fireworks for ${this.name}. Count: 12`);
            // Pop effect
            if (state.ctx && state.canvas && draw) createExplosion(centerX, centerY, 40, 'white');

            for (let i = 0; i < 12; i++) {
                const angle = (Math.PI * 0.45) + Math.random() * (Math.PI * 0.1); 
                const power = 15 + Math.random() * 25; 
                
                const vx = power * Math.cos(angle) * 0.2;
                const vy = -power * Math.sin(angle) * 0.2;
                
                const safeDist = 30;
                const startX = centerX + Math.cos(angle) * safeDist;
                const startY = centerY - Math.sin(angle) * safeDist;
                
                console.log(`DEBUG: Adding firework projectile ${i} at ${startX}, ${startY}`);
                state.projectiles.push({
                    x: startX, y: startY, vx, vy,
                    type: 'default', damage: 40, explosionRadius: 20,
                    color: getRandomColor(), special: null,
                    sourcePlayerId: myIndex, sourceTank: this,
                    isSubMunition: true, hasSplit: false, turnStartTime: Date.now()
                });
            }
            this.startProjectileLoop(false);
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y - this.height, this.width, this.height);
        
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y - this.height);
        
        const barrelLength = 15;
        let barrelEndX = this.x + this.width / 2 + barrelLength * Math.cos(this.angle);
        let barrelEndY = this.y - this.height - barrelLength * Math.sin(this.angle);
        
        ctx.lineTo(barrelEndX, barrelEndY);
        
        if (this.selectedWeapon === 'default') {
            ctx.strokeStyle = 'black';
        } else if (this.selectedWeapon === 'heavy') {
            ctx.strokeStyle = '#444444'; // Dark grey
        } else if (this.selectedWeapon === 'blockbuster') {
            ctx.strokeStyle = '#ff8800'; // Orange
        } else if (this.selectedWeapon === 'titan_shell') {
            ctx.strokeStyle = '#880000'; // Dark red
        } else if (this.selectedWeapon === 'mega_nuke') {
            ctx.strokeStyle = 'red';
        } else if (this.selectedWeapon === 'cluster_bomb') {
            ctx.strokeStyle = '#ff00ff'; // Purple
        } else if (this.selectedWeapon === 'laser') {
            ctx.strokeStyle = '#00ff00';
        } else if (this.selectedWeapon === 'laser_heavy') {
            ctx.strokeStyle = '#ff0000';
        } else if (this.selectedWeapon === 'teleport') {
            ctx.strokeStyle = '#00f7ff';
        } else if (this.selectedWeapon === 'dirtball') {
            ctx.strokeStyle = '#3d2b1f';
        } else if (this.selectedWeapon === 'shovel') {
            ctx.strokeStyle = '#aaaaaa';
        } else if (this.selectedWeapon.startsWith('earthquake')) {
            ctx.strokeStyle = '#555555';
        } else if (this.selectedWeapon === 'blackhole_s') {
            ctx.strokeStyle = '#222222';
        } else if (this.selectedWeapon === 'blackhole_m') {
            ctx.strokeStyle = '#440044';
        } else if (this.selectedWeapon === 'blackhole_l') {
            ctx.strokeStyle = '#aa00ff';
        } else if (this.selectedWeapon === 'wind_cyclone') {
            ctx.strokeStyle = '#ffffff';
        } else {
            ctx.strokeStyle = 'black';
        }
        
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.lineWidth = 1;
        
        if (this.shieldDurability > 0) {
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y - this.height / 2, 15, 0, Math.PI * 2);
            ctx.strokeStyle = '#00f7ff';
            ctx.globalAlpha = 0.3 + (this.shieldDurability / (this.maxHealth * 2)) * 0.7;
            ctx.stroke();
            ctx.globalAlpha = 1.0;
            
            // Show shield value
            ctx.fillStyle = '#00f7ff';
            ctx.font = '6px Arial';
            ctx.fillText(`${Math.ceil(this.shieldDurability)}`, this.x + this.width + 2, this.y - this.height / 2);
        }
        
        const healthBarWidth = this.width;
        const healthPercent = Math.max(0, this.health / this.maxHealth);
        ctx.fillStyle = this.health < 30 ? 'red' : this.health < 60 ? 'yellow' : 'green';
        ctx.fillRect(this.x, this.y - this.height - 7, healthBarWidth * healthPercent, 3);
        
        ctx.font = '8px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText(this.selectedWeapon, this.x, this.y - this.height - 10);
        
        if (this.isBuried) {
            ctx.fillStyle = 'red';
            ctx.fillText('BURIED!', this.x, this.y - this.height - 20);
        }

        // Draw Parachute if falling and has durability
        if (this.vy > 0 && this.parachuteDurability > 0) {
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - this.height);
            ctx.quadraticCurveTo(this.x + this.width / 2, this.y - this.height - 40, this.x + this.width, this.y - this.height);
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(this.x + this.width / 2, this.y - this.height);
            ctx.lineTo(this.x + this.width / 2, this.y - this.height - 30);
            ctx.stroke();
            ctx.lineWidth = 1;
        }
    }

    fireLaser(laserId = 'laser') {
        const weaponItem = this.inventory.find(i => i.id === laserId);
        const beamWidth = Math.max(2, Math.min(20, weaponItem?.effect?.radius || 4));
        const baseDamage = weaponItem?.effect?.damage || 35;
        
        // Heavy laser logic: higher damage and penetration scaling
        const isHeavy = laserId === 'laser_heavy';
        
        // Direct-hit output scaling with power
        const directHitDamage = Math.max(baseDamage * 0.5, Math.min(baseDamage * 2, Math.round(baseDamage * (0.55 + (this.power / 150)))));
        
        // Power governs how much solid terrain the beam can tunnel through.
        let penetrationBudget = Math.max(6, Math.min(1000, Math.round(this.power * (isHeavy ? 5.0 : 1.9))));

        const barrelLength = 35;
        const step = 2;
        const maxDist = 2000;
        const originX = this.x + this.width / 2 + barrelLength * Math.cos(this.angle);
        const originY = this.y - this.height - barrelLength * Math.sin(this.angle);
        let x = originX;
        let y = originY;
        let endX = originX;
        let endY = originY;

        const dx = Math.cos(this.angle);
        const dy = -Math.sin(this.angle);

        let directHitTank = null;
        for (let dist = 0; dist < maxDist; dist += step) {
            x += dx * step;
            y += dy * step;

            if (x < 0 || x > state.canvas.width || y < 0 || y > state.canvas.height) {
                endX = x;
                endY = y;
                break;
            }

            const isSolid = state.terrain?.checkCollision ? state.terrain.checkCollision(x, y) : false;
            if (isSolid) {
                if (state.terrain?.removeCircle) {
                    state.terrain.removeCircle(x, y, beamWidth);
                }
                penetrationBudget -= 1;
                if (penetrationBudget <= 0) {
                    endX = x;
                    endY = y;
                    break;
                }
            }

            const target = checkDirectHit(x, y, state.tanks, this, true);
            if (target) {
                target.health -= directHitDamage;
                createExplosion(x, y, isHeavy ? 15 : 7, isHeavy ? '#ff0000' : '#5dffb3');
                if (target.health <= 0) target.die(state.tanks.indexOf(this));
                directHitTank = target;
                endX = x;
                endY = y;
                break;
            }

            endX = x;
            endY = y;
        }

        if (state.terrain?.updateCanvas) {
            state.terrain.updateCanvas();
        }

        const beamDurationMs = isHeavy ? 350 : 180;
        if (!Array.isArray(state.laserBeams)) {
            state.laserBeams = [];
        }
        state.laserBeams.push({
            x1: originX,
            y1: originY,
            x2: endX,
            y2: endY,
            width: beamWidth,
            color: isHeavy ? (directHitTank ? '#ffaaaa' : '#ff4444') : (directHitTank ? '#8dffd1' : '#48fcb0'),
            expiresAt: performance.now() + beamDurationMs,
            duration: beamDurationMs
        });

        triggerScreenShake(isHeavy ? 12 : 6, beamDurationMs);
        state.freezeTankGravity = true;
        if (state.terrain) state.terrain.freezeGravity = true;
        if (state.ctx && state.canvas && state.terrain?.draw) {
            draw();
        }

        setTimeout(() => {
            try {
                if (state.terrain?.settle) {
                    state.terrain.settle();
                }
                state.tanks.forEach(t => { t.isFalling = true; });
                startTurn(getNextAliveTankIndex(state.currentPlayer));
            } finally {
                state.freezeTankGravity = false;
                if (state.terrain) state.terrain.freezeGravity = false;

                const index = this.inventory.findIndex(item => item.id === laserId);
                if (index !== -1) this.inventory.splice(index, 1);
                this.selectedWeapon = 'default';
            }
        }, beamDurationMs);
    }

    fire() {
        // Prevent firing if any projectiles are still active (standard turn-based rule)
        if (state.projectiles.length > 0) return;

        if (this.selectedWeapon === 'laser' || this.selectedWeapon === 'laser_heavy') {
            this.fireLaser(this.selectedWeapon);
            return;
        }

        if (this.selectedWeapon === 'teleport') {
            const canvasWidth = state.canvas?.width || 1200;
            const canvasHeight = state.canvas?.height || 600;
            const newX = Math.random() * (canvasWidth - 100) + 50;
            
            // 20% chance to end up underground
            if (Math.random() < 0.2) {
                // Find a spot deep in the terrain
                this.x = newX;
                this.y = canvasHeight - 50; // Deep down
            } else {
                this.x = newX;
                this.y = 50; // High in the air
            }

            this.lastSolidY = this.y;
            this.teleportImmunity = true;
            this.vy = 0;
            
            if (state.ctx && state.canvas && draw) {
                // Flash effect at origin
                createExplosion(this.x, this.y, 40, '#00f7ff');
            }

            // Consume and reset
            const index = this.inventory.findIndex(item => item.id === 'teleport');
            if (index !== -1) this.inventory.splice(index, 1);
            this.selectedWeapon = 'default';
            
            startTurn(getNextAliveTankIndex(state.currentPlayer));
            return;
        }

        if (this.selectedWeapon === 'health') {
            const item = this.inventory.find(i => i.id === 'health');
            if (item) {
                this.health = this.maxHealth;
                console.log(`${this.name} healed to full health!`);
                
                if (state.ctx && state.canvas && draw) {
                    // Green flash effect
                    createExplosion(this.x + this.width/2, this.y - this.height/2, 40, '#00ff00');
                }

                // Consume and reset
                const index = this.inventory.findIndex(i => i.id === 'health');
                if (index !== -1) this.inventory.splice(index, 1);
                this.selectedWeapon = 'default';
                
                startTurn(getNextAliveTankIndex(state.currentPlayer));
            }
            return;
        }

        if (this.selectedWeapon === 'wind_nullifier') {
            const item = this.inventory.find(i => i.id === 'wind_nullifier');
            if (item) {
                state.wind = 0;
                console.log(`WIND NULLIFIED!`);
                if (state.ctx && state.canvas && draw) {
                    createExplosion(this.x + this.width/2, this.y - this.height/2, 60, 'white');
                }
                const index = this.inventory.findIndex(item => item.id === 'wind_nullifier');
                if (index !== -1) this.inventory.splice(index, 1);
                this.selectedWeapon = 'default';
                startTurn(getNextAliveTankIndex(state.currentPlayer));
            }
            return;
        }

        if (this.selectedWeapon === 'wind_shuffler') {
            const item = this.inventory.find(i => i.id === 'wind_shuffler');
            if (item) {
                // Ignore match settings, pick a totally random intensity
                const intensities = ['none', 'low', 'normal', 'high', 'extreme'];
                const randomIntensity = intensities[Math.floor(Math.random() * intensities.length)];
                state.wind = calculateWind(randomIntensity);
                console.log(`WIND SHUFFLED (Intensity: ${randomIntensity}): ${state.wind}`);
                if (state.ctx && state.canvas && draw) {
                    createExplosion(this.x + this.width/2, this.y - this.height/2, 60, 'cyan');
                }
                const index = this.inventory.findIndex(item => item.id === 'wind_shuffler');
                if (index !== -1) this.inventory.splice(index, 1);
                this.selectedWeapon = 'default';
                startTurn(getNextAliveTankIndex(state.currentPlayer));
            }
            return;
        }

        if (this.selectedWeapon === 'wind_extreme') {
            const item = this.inventory.find(i => i.id === 'wind_extreme');
            if (item) {
                // Force extreme wind (new extreme intensity)
                state.wind = calculateWind('extreme');
                console.log(`EXTREME WIND TRIGGERED: ${state.wind}`);
                if (state.ctx && state.canvas && draw) {
                    createExplosion(this.x + this.width/2, this.y - this.height/2, 80, '#aaaaff');
                }
                const index = this.inventory.findIndex(item => item.id === 'wind_extreme');
                if (index !== -1) this.inventory.splice(index, 1);
                this.selectedWeapon = 'default';
                startTurn(getNextAliveTankIndex(state.currentPlayer));
            }
            return;
        }
        
        let explosionRadius = 15; 
        let damage = 50; // Default reduced to 50
        let projectileColor = 'black';
        let extraDistance = 0;
        let special = null;
        
        let vx = this.power * Math.cos(this.angle) * 0.2;
        let vy = -this.power * Math.sin(this.angle) * 0.2;
        
        if (this.selectedWeapon === 'heavy') {
            explosionRadius = 30;
            damage = 75;
            projectileColor = '#444444';
        } else if (this.selectedWeapon === 'blockbuster') {
            explosionRadius = 60;
            damage = 100;
            projectileColor = '#ff8800';
        } else if (this.selectedWeapon === 'titan_shell') {
            explosionRadius = 120;
            damage = 150;
            projectileColor = '#880000';
        } else if (this.selectedWeapon === 'mega_nuke') {
            explosionRadius = 250;
            damage = 250;
            projectileColor = 'red';
            extraDistance = 10;
        } else if (this.selectedWeapon === 'cluster_bomb') {
            explosionRadius = 20; // Radius of sub-munitions
            damage = 30; // Damage of sub-munitions
            projectileColor = '#ff00ff';
            special = 'cluster';
        } else if (this.selectedWeapon === 'dirtball') {
            explosionRadius = 30;
            damage = 0;
            projectileColor = '#3d2b1f';
            special = 'add_terrain';
        } else if (this.selectedWeapon === 'mound') {
            explosionRadius = 60;
            damage = 0;
            projectileColor = '#3d2b1f';
            special = 'add_terrain';
        } else if (this.selectedWeapon === 'mountain') {
            explosionRadius = 120;
            damage = 0;
            projectileColor = '#3d2b1f';
            special = 'add_terrain';
                } else if (this.selectedWeapon === 'shovel') {
                    explosionRadius = 60;
                    damage = 0;
                    projectileColor = '#aaaaaa';
                    special = 'remove_terrain_cone';
                }
         else if (this.selectedWeapon.startsWith('earthquake')) {
            const weaponItem = this.inventory.find(i => i.id === this.selectedWeapon);
            explosionRadius = weaponItem?.effect?.radius || 100;
            damage = weaponItem?.effect?.damage || 20;
            projectileColor = '#555555';
            special = 'earthquake';
        } else if (this.selectedWeapon.startsWith('blackhole')) {
            const weaponItem = this.inventory.find(i => i.id === this.selectedWeapon);
            explosionRadius = weaponItem?.effect?.radius || 100;
            damage = 0;
            projectileColor = '#000000';
            special = 'black_hole';
        }

        // Sudden Death: Nuke Growth
        if (state.suddenDeath?.active && state.suddenDeath.activeType === 'nuke_growth') {
            explosionRadius *= (state.suddenDeath.nukeScale || 1);
            damage *= (state.suddenDeath.nukeScale || 1);
            if (state.suddenDeath.nukeScale > 1.5) projectileColor = 'red';
        } else if (this.selectedWeapon === 'wind_cyclone') {
            explosionRadius = 300;
            damage = 0;
            projectileColor = '#ffffff';
            special = 'terrain_shove';
        } else if (this.selectedWeapon === 'global_wave') {
            explosionRadius = 0;
            damage = 0;
            projectileColor = '#00ffff';
            special = 'global_wave';
        } else if (this.selectedWeapon === 'global_wave_crazy') {
            explosionRadius = 0;
            damage = 0;
            projectileColor = '#ff00ff';
            special = 'global_wave_crazy';
        }
        
        const barrelLength = Math.min(20, 15 + extraDistance);
        let x = this.x + this.width / 2 + barrelLength * Math.cos(this.angle);
        let y = this.y - this.height - barrelLength * Math.sin(this.angle);
        
        const initialProjectile = {
            x, y, vx, vy,
            type: this.selectedWeapon,
            damage,
            explosionRadius,
            color: projectileColor,
            special,
            sourcePlayerId: state.tanks.indexOf(this),
            sourceTank: this,
            isSubMunition: false,
            hasSplit: false,
            turnStartTime: Date.now()
        };

        state.projectiles.push(initialProjectile);
        
        draw();
        
        const safeStartingDistance = 25; // Fixed small safety distance
        const tankCenterX = this.x + this.width/2;
        const tankCenterY = this.y - this.height/2;
        const distanceFromTankCenterToProjectile = Math.sqrt(
            (initialProjectile.x - tankCenterX)**2 + (initialProjectile.y - tankCenterY)**2
        );
        
        if (distanceFromTankCenterToProjectile > 0 && distanceFromTankCenterToProjectile < safeStartingDistance) {
            const safetyFactor = safeStartingDistance / distanceFromTankCenterToProjectile;
            initialProjectile.x = tankCenterX + (initialProjectile.x - tankCenterX) * safetyFactor;
            initialProjectile.y = tankCenterY + (initialProjectile.y - tankCenterY) * safetyFactor;
        }
        this.startProjectileLoop(true);
    }

    startProjectileLoop(consumeWeapon = false) {
        if (state.projectiles.length === 0 || state.projectileLoopActive) return;
        state.projectileLoopActive = true;

        const immunityTime = 200;
        const maxTurnTime = 10000;
        const finalizeTurn = () => {
            state.projectileLoopActive = false;
            startTurn(getNextAliveTankIndex(state.currentPlayer));

            if (consumeWeapon && this.selectedWeapon !== 'default') {
                const index = this.inventory.findIndex(item => item.id === this.selectedWeapon);
                if (index !== -1) {
                    this.inventory.splice(index, 1);
                }
                this.selectedWeapon = 'default';
            }
        };

        const moveProjectiles = () => {
            if (state.projectiles.length === 0) {
                finalizeTurn();
                return;
            }

            const toRemove = [];
            const toAdd = [];

            state.projectiles.forEach((proj, index) => {
                if (!Number.isFinite(proj?.vx) || !Number.isFinite(proj?.vy)) {
                    toRemove.push(index);
                    return;
                }

                // Apply physics
                proj.vy += state.gravity;
                proj.vx += state.wind;

                // Sub-stepping
                const speed = Math.sqrt((proj.vx * proj.vx) + (proj.vy * proj.vy));
                const steps = Math.max(1, Math.ceil(speed / 2));
                const stepX = proj.vx / steps;
                const stepY = proj.vy / steps;

                let hit = false;

                for (let s = 0; s < steps; s++) {
                    proj.x += stepX;
                    proj.y += stepY;

                    const elapsedTime = Date.now() - (proj.turnStartTime || Date.now());
                    const excludeSourcePlayer = elapsedTime < immunityTime;

                    const directHitTank = checkDirectHit(proj.x, proj.y, state.tanks, proj.sourceTank, excludeSourcePlayer);
                    if (directHitTank) {
                        hit = true;
                        proj.directHitTank = directHitTank;
                    } else {
                        const collision = checkTerrainAndBounds(proj.x, proj.y, state.terrain, state.canvas);
                        if (collision.hit) {
                            if (state.activeEdgeBehavior === 'reflect' && (collision.side === 'left' || collision.side === 'right' || collision.side === 'top')) {
                                // Reflect logic
                                if (collision.side === 'left') { proj.vx = Math.abs(proj.vx); proj.x = 0; }
                                if (collision.side === 'right') { proj.vx = -Math.abs(proj.vx); proj.x = state.canvas.width; }
                                if (collision.side === 'top') { proj.vy = Math.abs(proj.vy); proj.y = 0; }
                                // No 'hit' for reflection, keep moving in the new direction
                            } else if (state.activeEdgeBehavior === 'teleport' && (collision.side === 'left' || collision.side === 'right')) {
                                // Teleport logic
                                if (collision.side === 'left') proj.x = state.canvas.width;
                                if (collision.side === 'right') proj.x = 0;
                                // No 'hit' for teleport, keep moving from the new side
                            } else if (collision.side === 'top') {
                                // In all other modes, arcing out the top is NOT a hit
                                // Just let it keep moving until it comes back or hits a side
                            } else {
                                // Standard impact (bottom, terrain, or side-hit in Impact behavior)
                                hit = true;
                            }
                        }
                    }

                    if (hit) break;
                }

                // Check for Cluster Split at apex
                if (proj.special === 'cluster' && !proj.isSubMunition && !proj.hasSplit && proj.vy > 0) {
                    proj.hasSplit = true;
                    // Spawn 5 sub-munitions
                    for (let i = 0; i < 5; i++) {
                        const spreadX = (Math.random() - 0.5) * 4;
                        const spreadY = (Math.random() - 0.5) * 2;
                        toAdd.push({
                            ...proj,
                            vx: proj.vx + spreadX,
                            vy: proj.vy + spreadY,
                            isSubMunition: true,
                            special: null, // Sub-munitions are normal explosives
                            x: proj.x,
                            y: proj.y
                        });
                    }
                    toRemove.push(index);
                    return;
                }

                // Apex trigger for Event Horizon (Large Black Hole)
                if (proj.type === 'blackhole_l' && proj.vy > 0) {
                    hit = true;
                }

                const totalElapsedTime = Date.now() - (proj.turnStartTime || Date.now());
                if (totalElapsedTime >= maxTurnTime) hit = true;

                if (hit) {
                    // Only trigger explosion if hitting inside arena bounds.
                    if (proj.y >= 0 && proj.y <= (state.canvas?.height || 400)) {
                        const owner = (proj.sourceTank && typeof proj.sourceTank.handleProjectileImpact === 'function')
                            ? proj.sourceTank
                            : this;
                        owner.handleProjectileImpact(proj);
                    }
                    toRemove.push(index);
                }
            });

            // Clean up finished projectiles and add new ones (clusters)
            toRemove.sort((a, b) => b - a).forEach(idx => state.projectiles.splice(idx, 1));
            toAdd.forEach(p => state.projectiles.push(p));

            if (state.terrain?.updateCanvas) {
                state.terrain.updateCanvas();
            }
            draw();

            if (state.projectiles.length > 0 || toAdd.length > 0) {
                requestAnimationFrame(moveProjectiles);
            } else {
                finalizeTurn();
            }
        };

        setTimeout(moveProjectiles, 10);
    }

    handleProjectileImpact(proj) {
        const { x, y, type, explosionRadius, damage, sourcePlayerId, special, directHitTank } = proj;
        console.log(`DEBUG: Impact! Type: ${type}, Special: ${special}, Pos: ${Math.round(x)},${Math.round(y)}`);

        if (this.isAI && this.aiController && this.currentTarget && !proj.isSubMunition) {
            this.aiController.onShotResult(this.currentTarget, x, y);
        }

        if (special === 'black_hole') {
            this.handleBlackHoleImpact(proj);
            return;
        }

        if (special === 'terrain_shove') {
            // Calculate shift distance based on wind
            // If wind is 0, use a default small random shift
            const baseShift = 100;
            const windMultiplier = 2000;
            const distance = (state.wind === 0) 
                ? (Math.random() > 0.5 ? baseShift : -baseShift) 
                : state.wind * windMultiplier;

            if (state.terrain.shiftTerrain) {
                state.terrain.shiftTerrain(x, y, explosionRadius, distance);
            }

            // Shift tanks in range
            state.tanks.forEach(otherTank => {
                if (!otherTank.alive) return;
                const dx = x - (otherTank.x + otherTank.width / 2);
                const dy = y - (otherTank.y - otherTank.height / 2);
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < explosionRadius) {
                    otherTank.x += distance;
                    otherTank.lastSolidY = otherTank.y; // Update for fall damage if they were pushed off a ledge
                }
            });

            // Effects
            triggerScreenShake(15, 600);
            createExplosion(x, y, explosionRadius, 'rgba(255, 255, 255, 0.3)');
            return;
        }

        if (special === 'global_wave') {
            console.log("TECTONIC RIPPLE TRIGGERED!");
            state.activeGlobalWaves.push({
                x: 0,
                speed: 15,
                amplitude: 40 + Math.random() * 40,
                frequency: 0.02 + Math.random() * 0.03,
                phase: Math.random() * Math.PI * 2,
                launch: false
            });
            triggerScreenShake(20, 2000);
            return;
        }

        if (special === 'global_wave_crazy') {
            console.log("CRAZY TECTONIC WAVE TRIGGERED!");
            state.activeGlobalWaves.push({
                x: 0,
                speed: 20, // Faster
                amplitude: 80 + Math.random() * 60, // Much higher peaks
                frequency: 0.04 + Math.random() * 0.04, // Sharper peaks
                phase: Math.random() * Math.PI * 2,
                launch: true // Enable launching logic
            });
            triggerScreenShake(30, 2500);
            return;
        }

        if (special === 'add_terrain') {
            if (state.terrain.addTerrain) {
                state.terrain.addTerrain(x, y, explosionRadius);
            }
                } else if (special === 'remove_terrain_cone') {
                    if (state.terrain.removeTerrainCone) {
                        const angle = Math.atan2(-(y - (this.y - this.height)), x - (this.x + this.width / 2));
                        state.terrain.removeTerrainCone(x, y, explosionRadius, angle, Math.PI * 2 / 3); // 120 degrees
                    }
                }
         else if (special === 'earthquake') {
            // Apply zero-damage impact first to tag all nearby tanks with lastAttackerId
            // This ensures fall deaths during the quake are attributed to the shooter.
            applyExplosionDamage(x, y, state.tanks, explosionRadius, 0, sourcePlayerId);

            if (state.terrain.createCracks) {
                state.terrain.freezeGravity = true;
                state.freezeTankGravity = true;
                const weaponItem = this.inventory.find(i => i.id === type) || { effect: { intensity: 8 } };
                const intensity = weaponItem.effect.intensity || 8;
                const baseLength = 15 + (intensity * 4);
                                for (let i = 0; i < intensity; i++) {
                                    state.terrain.createCracks(x, y, baseLength, (i / intensity) * Math.PI * 2);
                                }
                
                                state.terrain.updateCanvas();
                                
                                setTimeout(() => { state.terrain.freezeGravity = false; }, 800);
                
                setTimeout(() => { state.freezeTankGravity = false; }, 2800);
            }
        } else {
            if (state.terrain.explode) {
                state.terrain.explode(x, y, explosionRadius);
            }
        }

        if (state.ctx && state.canvas && draw && !proj.noVisual) {
            const color = special === 'add_terrain' ? '#3d2b1f' : (special === 'remove_terrain_cone' ? '#aaaaaa' : null);
            createExplosion(x, y, explosionRadius, color);
        }

        applyExplosionDamage(x, y, state.tanks, explosionRadius, damage, sourcePlayerId, directHitTank);
    }

    handleBlackHoleImpact(proj) {
        const { x, y, type, explosionRadius } = proj;
        
        // Find the weapon profile in any tank's inventory (or source tank if known)
        let weaponItem = null;
        for (const t of state.tanks) {
            weaponItem = t.inventory?.find(i => i.id === type);
            if (weaponItem) break;
        }
        
        const pullStrength = weaponItem?.effect?.pullStrength || 10;
        const size = weaponItem?.effect?.size || 'small';

        triggerBlackHoleEffect(x, y, explosionRadius, pullStrength, size);
    }
    
    useItem(itemId) {
        const index = this.inventory.findIndex(item => item.id === itemId);
        if (index === -1) return false;
        
        const item = this.inventory[index];
        
        if (item.effect.type === 'weapon' || item.effect.type === 'teleport' || item.effect.type === 'terrain_remover' || item.effect.type === 'healing' || item.effect.type === 'utility') {
            // Select the item
            this.selectedWeapon = item.id;
            return true;
        }
        
        // defense items are now auto-active on purchase/landing logic
        return false;
    }
    
    applyGravity(terrain) {
        // If tank gravity is frozen (e.g. during earthquake), skip physics
        if (state.freezeTankGravity) return;

        // Handle horizontal momentum (e.g. from explosions or black holes)
        if (Math.abs(this.vx) > 0.1) {
            this.x += this.vx;
            this.vx *= 0.95; // Air friction
        } else {
            this.vx = 0;
        }

        const leftX = Math.floor(this.x);
        const centerX = Math.floor(this.x + this.width / 2);
        const rightX = Math.floor(this.x + this.width);
        
        const canvasHeight = state.canvas?.height || 800;
        const checkPoints = [leftX, centerX, rightX];
        
        let highestGround = canvasHeight;
        let highestStableGround = canvasHeight;

        for (let x of checkPoints) {
            // Start scan from current Y to allow being buried or in caves
            for (let y = Math.max(0, Math.floor(this.y)); y < canvasHeight; y++) {
                if (terrain.isSolid(x, y)) {
                    if (y < highestGround) highestGround = y;
                    
                    if (terrain.isPixelStable && terrain.isPixelStable(x, y)) {
                        if (y < highestStableGround) highestStableGround = y;
                        break;
                    }
                }
            }
        }
        
        const bottomLimit = canvasHeight - this.height - 5;
        const finalGroundY = Math.min(highestGround, bottomLimit);
        const finalStableY = Math.min(highestStableGround, bottomLimit);
        
        if (this.y < finalStableY) {
            // IN AIR relative to stable ground: Apply gravity
            this.vy += state.gravity;
            this.y += this.vy;
            
            // Sub-pixel safety: if we crossed stable ground, land
            if (this.y >= finalStableY) {
                this.y = finalStableY;
                this.vy = 0;
                this.handleLanding(this.y);
            }
        } else if (this.y > finalGroundY) {
            // BURIED: Snap to surface
            this.y = finalGroundY;
            this.vy = 0;
            this.lastSolidY = this.y;
        } else {
            // ON STABLE GROUND
            this.vy = 0;
            this.lastSolidY = this.y;
        }
        
        this.checkBuried(terrain);
    }

    checkBuried(terrain) {
        this.isBuried = false;
        const tankCenterX = Math.floor(this.x + this.width / 2);
        const tankTopY = Math.floor(this.y - this.height);
        
        for (let y = tankTopY; y >= Math.max(0, tankTopY - 10); y--) {
            if (terrain.isSolid(tankCenterX, y)) {
                this.isBuried = true;
                break;
            }
        }
    }

    aiFire() {
        if (!this.alive || !state.aiReadyToFire) return;
        state.aiReadyToFire = false;
        
        // Use controller's target selection logic
        const targetTank = this.aiController.chooseTarget(this, state.tanks);
        this.currentTarget = targetTank;
        
        if (!targetTank) {
            // No valid targets (game over condition mostly)
            state.aiReadyToFire = true;
            return;
        }
        
        const env = { 
            wind: state.wind, 
            gravity: state.gravity,
            checkTerrain: (x, y) => state.terrain.checkCollision(x, y),
            aiDeadline: Date.now() + 85 // hard per-turn AI compute budget (ms)
        };
        let shot = null;
        try {
            shot = this.aiController.calculateShot(this, targetTank, env);
        } catch (err) {
            console.error(`AI calculateShot failed for ${this.name}:`, err);
        }

        const defaultAngle = (targetTank.x >= this.x) ? (Math.PI / 4) : (3 * Math.PI / 4);
        const safeAngle = Number.isFinite(shot?.angle) ? shot.angle : defaultAngle;
        const safePower = Number.isFinite(shot?.power) ? Math.max(10, Math.min(120, shot.power)) : 65;
        
        this.angle = safeAngle;
        this.power = safePower;
        this.aiController.recordShot(targetTank);

        // Weapon Selection
        if (this.aiController.chooseWeapon) {
            try {
                const weaponId = this.aiController.chooseWeapon(this, targetTank, state.tanks, env);
                if (weaponId && weaponId !== 'default') {
                    this.useItem(weaponId);
                } else {
                    this.selectedWeapon = 'default';
                }
            } catch (err) {
                console.error(`AI chooseWeapon failed for ${this.name}:`, err);
                this.selectedWeapon = 'default';
            }
        }

        setTimeout(() => {
            try {
                if (this.alive) {
                    this.fire();
                } else {
                    console.log(`AI ${this.name} died before firing, skipping.`);
                }
            } catch (err) {
                console.error(`AI fire failed for ${this.name}:`, err);
            } finally {
                state.aiReadyToFire = true;
            }
        }, 2000);
    }
}
