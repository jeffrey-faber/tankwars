import { getRandomColor, createExplosion } from './utils.js';
import { state, getNextAliveTankIndex, draw, triggerScreenShake } from './gameContext.js';
import { StandardAI, StupidAI, LobberAI, SniperAI, MastermindAI } from './aiControllers.js';

const ECONOMY_MULTIPLIER = 1;

function checkTerrainAndBounds(x, y, terrain, canvas) {
    if (x < 0 || x > canvas.width || y > canvas.height) return true;
    if (terrain.checkCollision(x, y)) return true;
    return false;
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
                
                // Partial score for damaging shield
                if (tankIndex !== sourcePlayerId && absorbed > 0 && sourcePlayerId !== -1) {
                    state.tanks[sourcePlayerId].score += 0.2;
                    state.tanks[sourcePlayerId].currency += Math.floor(5 * ECONOMY_MULTIPLIER);
                }
            }

            if (effectiveDamage > 0) {
                const actualDamage = Math.min(otherTank.health, effectiveDamage);
                otherTank.health -= actualDamage;
                
                // Reward for damage to others
                if (tankIndex !== sourcePlayerId && actualDamage > 0 && sourcePlayerId !== -1) {
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
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.shieldDurability = 0; // Durability in HP points
        this.inventory = [];
        this.selectedWeapon = 'default';
        this.vy = 0; // Vertical velocity for falling
        
        // Fall Damage Properties
        this.safeFallHeight = 40; // px
        this.fallDamageMultiplier = 1.5; // damage per px over limit
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
        } else if (this.personality === 'mastermind') {
            this.aiController = new MastermindAI();
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
            if (!this.isInitialSpawn) {
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
        
        // Always reset spawn flag and update tracker on landing
        this.isInitialSpawn = false;
        this.lastSolidY = currentY;
    }

    die(killerId = -1) {
        if (!this.alive) return;
        this.alive = false;
        this.health = 0;

        // Update killer score/currency if applicable
        if (killerId !== -1 && state.tanks[killerId]) {
            const killer = state.tanks[killerId];
            if (killer === this) {
                // Self kill: -1 penalty to kills, no score/currency change
                this.kills -= 1;
            } else {
                // Killed by another: Award score, kill, and currency to the killer
                killer.score += 1;
                killer.kills += 1;
                killer.currency += Math.floor(50 * ECONOMY_MULTIPLIER);
            }
        }

        // Trigger Death Explosion logic
        this.triggerDeathExplosion(killerId);
    }

    triggerDeathExplosion(killerId = -1) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y - this.height / 2;
        
        // 1. Check for item-based override
        const qualifyingItems = ['nuke', 'dirtball', 'earthquake_s', 'earthquake_m', 'earthquake_l'];
        const availableChaoticItems = this.inventory.filter(item => qualifyingItems.includes(item.id));
        
        let triggeredItem = null;
        
        if (availableChaoticItems.length > 0 && Math.random() < (state.deathTriggerChance || 0)) {
            // Pick a random qualifying item
            const randomIndex = Math.floor(Math.random() * availableChaoticItems.length);
            triggeredItem = availableChaoticItems[randomIndex];
            
            // Consume it
            const invIndex = this.inventory.indexOf(triggeredItem);
            this.inventory.splice(invIndex, 1);
        }

        // 2. Trigger appropriate effect
        if (triggeredItem) {
            console.log(`DEATH TRIGGER: ${this.name} used ${triggeredItem.id} on death!`);
            
            if (triggeredItem.id === 'dirtball') {
                if (state.terrain.addTerrain) {
                    state.terrain.addTerrain(centerX, centerY, 30);
                }
                if (state.ctx && state.canvas && draw) {
                    createExplosion(centerX, centerY, 30, state.ctx, state.canvas, draw, '#3d2b1f');
                }
                applyExplosionDamage(centerX, centerY, state.tanks, 30, 10, killerId);
            } else if (triggeredItem.id.startsWith('earthquake')) {
                if (state.terrain.createCracks) {
                    state.terrain.freezeGravity = true;
                    state.freezeTankGravity = true;
                    
                    const intensity = triggeredItem.effect.intensity || 8;
                    const baseLength = 15 + (intensity * 4);
                    
                    for (let i = 0; i < intensity; i++) {
                        state.terrain.createCracks(centerX, centerY, baseLength, (i / intensity) * Math.PI * 2);
                    }
                    
                    state.terrain.updateCanvas();
                    
                    setTimeout(() => { state.terrain.freezeGravity = false; }, 800);
                    setTimeout(() => { state.freezeTankGravity = false; }, 2800);
                }
                if (state.ctx && state.canvas && draw) {
                    createExplosion(centerX, centerY, triggeredItem.effect.radius || 100, state.ctx, state.canvas, draw, '#555555');
                }
                applyExplosionDamage(centerX, centerY, state.tanks, triggeredItem.effect.radius || 100, triggeredItem.effect.damage || 20, killerId);
            } else if (triggeredItem.id === 'nuke') {
                if (state.ctx && state.canvas && draw) {
                    createExplosion(centerX, centerY, 80, state.ctx, state.canvas, draw, 'red');
                }
                if (state.terrain.explode) {
                    state.terrain.explode(centerX, centerY, 80);
                }
                applyExplosionDamage(centerX, centerY, state.tanks, 80, 150, killerId);
            }
        } else {
            // Default death explosion
            if (state.ctx && state.canvas && draw) {
                createExplosion(centerX, centerY, 30, state.ctx, state.canvas, draw, 'orange');
            }
            applyExplosionDamage(centerX, centerY, state.tanks, 30, 50, killerId);
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
        } else if (this.selectedWeapon === 'dirtball') {
            ctx.strokeStyle = '#3d2b1f';
        } else if (this.selectedWeapon === 'shovel') {
            ctx.strokeStyle = '#aaaaaa';
        } else if (this.selectedWeapon.startsWith('earthquake')) {
            ctx.strokeStyle = '#555555';
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

    fire() {
        // Prevent firing if any projectiles are still active (standard turn-based rule)
        if (state.projectiles.length > 0) return;
        
        let explosionRadius = 15; // Default reduced to 15
        let damage = 50; // Default reduced to 50
        let projectileColor = 'black';
        let extraDistance = 0;
        let special = null;
        
        let vx = this.power * Math.cos(this.angle) * 0.2;
        let vy = -this.power * Math.sin(this.angle) * 0.2;
        
        if (this.selectedWeapon === 'heavy') {
            explosionRadius = 30;
            damage = 60;
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
        } else if (this.selectedWeapon === 'laser') {
            vx *= 2;
            vy *= 2;
            projectileColor = '#00ff00';
            extraDistance = 5;
        } else if (this.selectedWeapon === 'dirtball') {
            explosionRadius = 30;
            damage = 10;
            projectileColor = '#3d2b1f';
            special = 'add_terrain';
        } else if (this.selectedWeapon === 'shovel') {
            explosionRadius = 40;
            damage = 0;
            projectileColor = '#aaaaaa';
            special = 'remove_terrain_cone';
        } else if (this.selectedWeapon.startsWith('earthquake')) {
            const weaponItem = this.inventory.find(i => i.id === this.selectedWeapon);
            explosionRadius = weaponItem?.effect?.radius || 100;
            damage = weaponItem?.effect?.damage || 20;
            projectileColor = '#555555';
            special = 'earthquake';
        }
        
        const barrelLength = 30 + extraDistance;
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
        
        const safeStartingDistance = explosionRadius + 20;
        const tankCenterX = this.x + this.width/2;
        const tankCenterY = this.y - this.height/2;
        const distanceFromTankCenterToProjectile = Math.sqrt(
            (initialProjectile.x - tankCenterX)**2 + (initialProjectile.y - tankCenterY)**2
        );
        
        if (distanceFromTankCenterToProjectile < safeStartingDistance) {
            const safetyFactor = safeStartingDistance / distanceFromTankCenterToProjectile;
            initialProjectile.x = tankCenterX + (initialProjectile.x - tankCenterX) * safetyFactor;
            initialProjectile.y = tankCenterY + (initialProjectile.y - tankCenterY) * safetyFactor;
        }
        
        const immunityTime = 200;
        const maxTurnTime = 10000;

        const moveProjectiles = () => {
            if (state.projectiles.length === 0) {
                state.currentPlayer = getNextAliveTankIndex(state.currentPlayer);
                
                if (this.selectedWeapon !== 'default') {
                    const index = this.inventory.findIndex(item => item.id === this.selectedWeapon);
                    if (index !== -1) {
                        this.inventory.splice(index, 1);
                    }
                    this.selectedWeapon = 'default';
                    if (state.store) {
                        state.store.updateWeaponSelector(this);
                    }
                }
                return;
            }

            const toRemove = [];
            const toAdd = [];

            state.projectiles.forEach((proj, index) => {
                // Apply physics
                proj.vy += state.gravity;
                proj.vx += state.wind;

                // Sub-stepping
                const speed = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy);
                const steps = Math.ceil(speed / 2);
                const stepX = proj.vx / steps;
                const stepY = proj.vy / steps;
                
                let hit = false;

                for (let s = 0; s < steps; s++) {
                    proj.x += stepX;
                    proj.y += stepY;
                    
                    const elapsedTime = Date.now() - proj.turnStartTime;
                    const excludeSourcePlayer = elapsedTime < immunityTime;
                    
                    const directHitTank = checkDirectHit(proj.x, proj.y, state.tanks, proj.sourceTank, excludeSourcePlayer);
                    if (directHitTank) {
                        hit = true;
                        proj.directHitTank = directHitTank;
                    } else {
                        hit = checkTerrainAndBounds(proj.x, proj.y, state.terrain, state.canvas);
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

                const totalElapsedTime = Date.now() - proj.turnStartTime;
                if (totalElapsedTime >= maxTurnTime) hit = true;

                if (hit) {
                    // Impact logic
                    if (proj.y >= 0 && proj.y <= (state.canvas?.height || 400)) {
                        this.handleProjectileImpact(proj);
                    }
                    toRemove.push(index);
                }
            });

            // Clean up finished projectiles and add new ones (clusters)
            toRemove.sort((a, b) => b - a).forEach(idx => state.projectiles.splice(idx, 1));
            toAdd.forEach(p => state.projectiles.push(p));

            draw();
            
            if (state.projectiles.length > 0 || toAdd.length > 0) {
                requestAnimationFrame(moveProjectiles);
            } else {
                // All projectiles done
                state.currentPlayer = getNextAliveTankIndex(state.currentPlayer);
                
                // Consumed current weapon if used
                if (this.selectedWeapon !== 'default') {
                    const index = this.inventory.findIndex(item => item.id === this.selectedWeapon);
                    if (index !== -1) {
                        this.inventory.splice(index, 1);
                    }
                    this.selectedWeapon = 'default';
                }

                // Refresh selector for the NEW current player
                if (state.store) {
                    state.store.updateWeaponSelector(state.tanks[state.currentPlayer]);
                }
            }
        };

        setTimeout(moveProjectiles, 10);
    }

    handleProjectileImpact(proj) {
        const { x, y, type, explosionRadius, damage, sourcePlayerId, special, directHitTank } = proj;

        if (this.isAI && this.aiController && this.currentTarget && !proj.isSubMunition) {
            this.aiController.onShotResult(this.currentTarget, x, y);
        }

        if (special === 'add_terrain') {
            if (state.terrain.addTerrain) {
                state.terrain.addTerrain(x, y, explosionRadius);
            }
        } else if (special === 'remove_terrain_cone') {
            if (state.terrain.removeTerrainCone) {
                const angle = Math.atan2(-(y - (this.y - this.height)), x - (this.x + this.width / 2));
                state.terrain.removeTerrainCone(x, y, explosionRadius, angle, Math.PI / 2);
            }
        } else if (special === 'earthquake') {
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

        if (state.ctx && state.canvas && draw) {
            const color = special === 'add_terrain' ? '#3d2b1f' : (special === 'remove_terrain_cone' ? '#aaaaaa' : null);
            createExplosion(x, y, explosionRadius, state.ctx, state.canvas, draw, color);
        }

        applyExplosionDamage(x, y, state.tanks, explosionRadius, damage, sourcePlayerId, directHitTank);
    }
    
    useItem(itemId) {
        const index = this.inventory.findIndex(item => item.id === itemId);
        if (index === -1) return false;
        
        const item = this.inventory[index];
        
        if (item.effect.type === 'weapon') {
            // Select the weapon
            this.selectedWeapon = item.id;
            return true;
        }
        
        // defense items are now auto-active on purchase/landing logic
        return false;
    }
    
    applyGravity(terrain) {
        // If tank gravity is frozen (e.g. during earthquake), skip physics
        if (state.freezeTankGravity) return;

        const leftX = Math.floor(this.x);
        const centerX = Math.floor(this.x + this.width / 2);
        const rightX = Math.floor(this.x + this.width);
        
        const canvasHeight = state.canvas?.height || 800;
        const checkPoints = [leftX, centerX, rightX];
        
        let highestGround = canvasHeight;
        let highestStableGround = canvasHeight;

        for (let x of checkPoints) {
            for (let y = 0; y < canvasHeight; y++) {
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
        
        // Shopping phase (before firing)
        if (state.store) {
            this.aiController.shop(state.store, this);
        }
        
        // Use controller's target selection logic
        const targetTank = this.aiController.chooseTarget(this, state.tanks);
        this.currentTarget = targetTank;
        
        if (!targetTank) {
            // No valid targets (game over condition mostly)
            return;
        }
        
        const env = { 
            wind: state.wind, 
            gravity: state.gravity,
            checkTerrain: (x, y) => state.terrain.checkCollision(x, y) 
        };
        const shot = this.aiController.calculateShot(this, targetTank, env);
        
        this.angle = shot.angle;
        this.power = shot.power;
        this.aiController.recordShot(targetTank);

        // Weapon Selection
        if (this.aiController.chooseWeapon) {
            const weaponId = this.aiController.chooseWeapon(this, targetTank, state.tanks);
            if (weaponId && weaponId !== 'default') {
                this.useItem(weaponId);
            } else {
                this.selectedWeapon = 'default';
            }
        }

        setTimeout(() => {
            this.fire();
            state.aiReadyToFire = true;
        }, 1000);
    }
}
