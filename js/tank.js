import { getRandomColor, createExplosion } from './utils.js';
import { state, getNextAliveTankIndex, draw } from './gameContext.js';

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
            
            if (otherTank.shielded) {
                otherTank.shielded = false;
                if (tankIndex !== sourcePlayerId) {
                    tanks[sourcePlayerId].score += 0.5;
                    tanks[sourcePlayerId].currency += 5;
                }
            } else {
                otherTank.health -= effectiveDamage;
                if (otherTank.health <= 0) {
                    otherTank.health = 0;
                    otherTank.alive = false;
                    if (tankIndex !== sourcePlayerId) {
                        tanks[sourcePlayerId].score += 1;
                        tanks[sourcePlayerId].currency += 20;
                    }
                }
            }
        }
    });
}

export class Tank {
    constructor(x, y, isAI = false, aiLevel = 0, name = '') {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 10;
        this.angle = Math.PI / 4;
        this.power = 50;
        this.color = getRandomColor();
        this.isAI = isAI;
        this.aiLevel = aiLevel;
        this.name = name;
        this.score = 0;
        this.currency = 100;
        this.alive = true;
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.shielded = false;
        this.inventory = [];
        this.selectedWeapon = 'default';
        this.vy = 0; // Vertical velocity for falling
        this.aiParams = {
            angleRange: 5 * Math.PI / 180,
            powerRange: 2.5,
            angleIncrement: 1 * Math.PI / 180,
            powerIncrement: 0.5,
            minAngleRange: 2 * Math.PI / 180,
            maxAngleRange: 15 * Math.PI / 180,
            minPowerRange: 1,
            maxPowerRange: 10
        };
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
        } else if (this.selectedWeapon === 'nuke') {
            ctx.strokeStyle = 'red';
        } else if (this.selectedWeapon === 'laser') {
            ctx.strokeStyle = '#00ff00';
        } else {
            ctx.strokeStyle = 'black';
        }
        
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.lineWidth = 1;
        
        if (this.shielded) {
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y - this.height / 2, 15, 0, Math.PI * 2);
            ctx.strokeStyle = '#00f7ff';
            ctx.stroke();
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
    }

    fire() {
        if (state.projectile.flying) return;
        
        let explosionRadius = 30;
        let damage = 100;
        let projectileColor = 'black';
        let extraDistance = 0;
        
        let vx = this.power * Math.cos(this.angle) * 0.2;
        let vy = -this.power * Math.sin(this.angle) * 0.2;
        
        if (this.selectedWeapon === 'nuke') {
            explosionRadius = 80;
            damage = 150;
            projectileColor = 'red';
            extraDistance = 10;
        } else if (this.selectedWeapon === 'laser') {
            vx *= 2;
            vy *= 2;
            projectileColor = '#00ff00';
            extraDistance = 5;
        }
        
        const barrelLength = 30 + extraDistance;
        let x = this.x + this.width / 2 + barrelLength * Math.cos(this.angle);
        let y = this.y - this.height - barrelLength * Math.sin(this.angle);
        
        state.projectile.flying = true;
        state.projectile.type = this.selectedWeapon;
        state.projectile.damage = damage;
        state.projectile.explosionRadius = explosionRadius;
        state.projectile.color = projectileColor;
        state.projectile.sourcePlayerId = state.tanks.indexOf(this);
        state.projectile.sourceTank = this;
        state.projectile.x = x;
        state.projectile.y = y;
        
        draw();
        
        const safeStartingDistance = explosionRadius + 20;
        const tankCenterX = this.x + this.width/2;
        const tankCenterY = this.y - this.height/2;
        const distanceFromTankCenterToProjectile = Math.sqrt(
            (x - tankCenterX)**2 + (y - tankCenterY)**2
        );
        
        const immunityTime = 200;
        const maxTurnTime = 10000;
        const turnStartTime = Date.now();
        
        if (distanceFromTankCenterToProjectile < safeStartingDistance) {
            const safetyFactor = safeStartingDistance / distanceFromTankCenterToProjectile;
            x = tankCenterX + (x - tankCenterX) * safetyFactor;
            y = tankCenterY + (y - tankCenterY) * safetyFactor;
            state.projectile.x = x;
            state.projectile.y = y;
        }
        
        setTimeout(() => {
            const moveProjectile = () => {
                // Apply gravity to velocity first
                vy += state.gravity;
                vx += state.wind;

                // Sub-stepping to prevent tunneling
                const speed = Math.sqrt(vx*vx + vy*vy);
                const steps = Math.ceil(speed / 2); // Check every 2 pixels roughly
                const stepX = vx / steps;
                const stepY = vy / steps;
                
                let hit = false;

                for (let s = 0; s < steps; s++) {
                    x += stepX;
                    y += stepY;
                    
                    const elapsedTime = Date.now() - turnStartTime;
                    const excludeSourcePlayer = elapsedTime < immunityTime;
                    
                    if (elapsedTime < immunityTime) {
                        hit = checkTerrainAndBounds(x, y, state.terrain, state.canvas);
                    } else {
                        const directHitTank = checkDirectHit(x, y, state.tanks, this, excludeSourcePlayer);
                        if (directHitTank) {
                            hit = true;
                            this.directHitTank = directHitTank;
                        } else {
                            hit = checkTerrainAndBounds(x, y, state.terrain, state.canvas);
                        }
                    }
                    
                    if (hit) break; // Stop stepping if hit
                }
                
                state.projectile.x = x;
                state.projectile.y = y;
                
                draw();
                
                const elapsedTime = Date.now() - turnStartTime;
                if (elapsedTime >= maxTurnTime) hit = true;
                
                if (!hit) {
                    requestAnimationFrame(moveProjectile);
                } else {
                    if (y >= 0 && y <= (state.canvas?.height || 400)) {
                        if (state.terrain.explode) {
                            state.terrain.explode(x, y, state.projectile.explosionRadius);
                        }
                        
                        if (state.ctx && state.canvas && draw) {
                            createExplosion(x, y, state.projectile.explosionRadius, state.ctx, state.canvas, draw);
                        }
                        
                        applyExplosionDamage(x, y, state.tanks, state.projectile.explosionRadius, state.projectile.damage, state.projectile.sourcePlayerId, this.directHitTank);
                        this.directHitTank = null;
                    }
                    
                    state.currentPlayer = getNextAliveTankIndex(state.currentPlayer);
                    state.projectile.flying = false;
                    
                    if (this.selectedWeapon !== 'default') {
                        const index = this.inventory.findIndex(item => item.id === this.selectedWeapon);
                        if (index !== -1) {
                            this.inventory.splice(index, 1);
                        }
                        this.selectedWeapon = 'default';
                    }
                }
            };
            
            moveProjectile();
        }, 10);
    }
    
    useItem(itemId) {
        const index = this.inventory.findIndex(item => item.id === itemId);
        if (index === -1) return false;
        
        const item = this.inventory[index];
        
        if (item.effect.type === 'weapon') {
            // Select the weapon
            this.selectedWeapon = item.id;
            return true;
        } else if (item.effect.type === 'defense' && item.id === 'shield') {
            // Activate shield
            this.shielded = true;
            // Remove from inventory after use
            this.inventory.splice(index, 1);
            return true;
        }
        
        return false;
    }
    
    applyGravity(terrain) {
        const tankCenterX = Math.floor(this.x + this.width / 2);
        let groundHeight = null;
        const canvasHeight = state.canvas?.height || 400;
        
        // Scan from top to find the first solid pixel (ground surface)
        for (let y = 0; y < canvasHeight; y++) {
            if (terrain.isSolid(tankCenterX, y)) {
                groundHeight = y;
                break;
            }
        }
        
        if (groundHeight === null) {
            groundHeight = canvasHeight;
        }
        
        // Ensure tank sits on top of ground (groundHeight is the solid pixel)
        // We want the tank bottom (this.y) to be at groundHeight?
        // If groundHeight is 300 (solid). Tank y=300 (bottom).
        // Draw 290-300. Sits on top. Correct.
        // Clamp to screen bottom
        groundHeight = Math.min(groundHeight, canvasHeight - this.height - 5);
        
        const fallDistance = groundHeight - this.y;
        
        if (fallDistance > 0) {
            // Apply fall damage
            const fallDamage = Math.max(0, Math.floor((fallDistance - 20) / 10));
            
            if (fallDamage > 0 && !this.shielded) {
                this.health -= fallDamage;
                if (this.health <= 0) {
                    this.health = 0;
                    this.alive = false;
                }
            }
            
            // Snap to ground
            this.y = groundHeight;
        }
        
        // Ensure we don't go below the screen
        if (this.y > canvasHeight - this.height - 5) {
            this.y = canvasHeight - this.height - 5;
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
        
        if (this.inventory && this.inventory.length > 0 && Math.random() < 0.7) {
            const randomItem = this.inventory[Math.floor(Math.random() * this.inventory.length)];
            this.useItem(randomItem.id);
        }
        
        let targetTank;
        do {
            targetTank = state.tanks[Math.floor(Math.random() * state.tanks.length)];
        } while (targetTank === this || !targetTank.alive);
        
        if (this.aiLevel === 8) {
            this.aiLevelMaxLob(targetTank, state.terrain);
        }
        setTimeout(() => {
            this.fire();
            state.aiReadyToFire = true;
        }, 1000);
    }

    aiLevel8(targetTank) {
        const g = state.gravity;
        const windFactor = state.wind * 5.5;
        const dx = targetTank.x + targetTank.width / 2 - (this.x + this.width / 2);
        const dy = targetTank.y - this.y - this.height + 5;
        let bestAngle, bestPower, minError = Infinity;
        
        const angleMin = 20 * (Math.PI / 180);
        const angleMax = 160 * (Math.PI / 180);
        
        for (let power = 40; power <= 100; power += 1) {
            for (let angle = angleMin; angle <= angleMax; angle += (Math.PI / 360)) {
                const vx = power * Math.cos(angle) * 0.2 - windFactor * state.wind;
                const vy = -power * Math.sin(angle) * 0.2;
                
                if ((dx > 0 && vx <= 0) || (dx < 0 && vx >= 0)) continue;
                
                const t = Math.abs(dx / vx);
                if (t > 0) {
                    const landingX = vx * t;
                    const landingY = vy * t + 0.5 * g * t * t;
                    const error = Math.sqrt((landingX - dx) ** 2 + (landingY - dy) ** 2);
                    
                    if (error < minError) {
                        minError = error;
                        bestAngle = angle;
                        bestPower = power;
                    }
                }
            }
        }
        
        if (bestAngle === undefined) {
            bestAngle = Math.PI / 4;
            bestPower = 70;
        }
        
        const angleError = (Math.random() * 1 - 0.5) * (Math.PI / 180);
        const powerError = Math.random() * 2 - 1;
        
        this.angle = bestAngle + angleError;
        this.power = Math.max(40, Math.min(100, bestPower + powerError));
        
        if (this.inventory && this.inventory.length > 0) {
            const useSpecialWeapon = minError < 20 && Math.random() < 0.8;
            if (useSpecialWeapon) {
                const weapons = this.inventory.filter(item => 
                    item.effect.type === 'weapon' || 
                    (item.effect.type === 'defense' && targetTank.health > 50)
                );
                
                if (weapons.length > 0) {
                    const weapon = weapons[Math.floor(Math.random() * weapons.length)];
                    this.useItem(weapon.id);
                }
            }
        }
    }

    aiLevelMax(targetTank) {
        const g = state.gravity;
        const physicsScale = 0.2;
        const calc = this.aiCalculations(targetTank);
        let bestAngle = null;
        let bestPower = null;
        let minError = Infinity;

        for (let power = 10; power <= 100; power += 0.1) {
            for (
                let angle = 5 * Math.PI / 180;
                angle <= 175 * Math.PI / 180;
                angle += (0.1 * Math.PI / 180)
            ) {
                const vx = power * Math.cos(angle) * physicsScale + state.wind;
                const vy = -power * Math.sin(angle) * physicsScale;
                if (vx <= 0) continue;
                const t = calc.dx / vx;
                if (t > 0) {
                    const predictedY = vy * t + 0.5 * g * t * t;
                    const error = Math.abs(vx * t - calc.dx) + Math.abs(predictedY - calc.dy);
                    if (error < minError) {
                        minError = error;
                        bestAngle = angle;
                        bestPower = power;
                    }
                }
            }
        }

        if (bestAngle === null || bestPower === null) {
            return this.aiLevel8(targetTank);
        }

        this.angle = bestAngle;
        this.power = Math.max(30, Math.min(100, bestPower));
    }

    aiLevelMaxLob(targetTank) {
        const dt = 0.05;
        const maxSimTime = 10;
        const g = state.gravity;
        const physicsScale = 0.2;
        
        const barrelLength = 30;
        const startX = this.x + this.width / 2 + barrelLength * Math.cos(this.angle);
        const startY = this.y - this.height - barrelLength * Math.sin(this.angle);

        const calc = {
            dx: targetTank.x + targetTank.width / 2 - startX,
            dy: targetTank.y - startY
        };

        let bestAngle = null;
        let bestPower = null;
        let minError = Infinity;
        
        let angleMin, angleMax, powerMin, powerMax;
        if (this.lastBestAngle !== undefined && this.lastBestPower !== undefined) {
            angleMin = Math.max(Math.PI/6, this.lastBestAngle - this.aiParams.angleRange);
            angleMax = Math.min(5*Math.PI/6, this.lastBestAngle + this.aiParams.angleRange);
            powerMin = Math.max(40, this.lastBestPower - this.aiParams.powerRange);
            powerMax = Math.min(100, this.lastBestPower + this.aiParams.powerRange);
        } else {
            const distanceToTarget = Math.sqrt(calc.dx * calc.dx + calc.dy * calc.dy);
            
            if (distanceToTarget < state.canvas.width * 0.3) {
                angleMin = Math.PI / 2.5;
                angleMax = Math.PI / 1.5;
            } else {
                angleMin = Math.PI / 4;
                angleMax = Math.PI / 2.2;
            }
            
            powerMin = 40 + (distanceToTarget / state.canvas.width) * 30;
            powerMax = 100;
        }

        const angleIncrement = Math.PI / 360;
        const powerIncrement = 0.5;
        
        for (let power = powerMin; power <= powerMax; power += powerIncrement) {
            for (let angle = angleMin; angle <= angleMax; angle += angleIncrement) {
                let minWindError = Infinity;
                const windScenarios = [0, state.wind, state.wind * 2];
                
                for (const windFactor of windScenarios) {
                    let x = startX, y = startY;
                    let vx = power * Math.cos(angle) * physicsScale;
                    let vy = -power * Math.sin(angle) * physicsScale;
                    let t = 0;
    
                    while (t < maxSimTime && y < state.canvas.height) {
                        x += vx * dt;
                        y += vy * dt;
                        vy += g * dt;
                        vx += windFactor * dt;
                        t += dt;
                        
                        if ((calc.dx > 0 && vx < 0) || (calc.dx < 0 && vx > 0)) {
                            break;
                        }
                    }
    
                    const error = Math.sqrt(
                        Math.pow(x - (startX + calc.dx), 2) + 
                        Math.pow(y - (startY + calc.dy), 2)
                    );
                    
                    minWindError = Math.min(minWindError, error);
                }
                
                if (minWindError < minError) {
                    minError = minWindError;
                    bestAngle = angle;
                    bestPower = power;
                }
            }
        }

        if (bestAngle === null || bestPower === null) {
            return this.aiLevel8(targetTank);
        }

        this.lastBestAngle = bestAngle;
        this.lastBestPower = bestPower;

        const errorThreshold = 15;
        if (minError < errorThreshold) {
            this.aiParams.angleRange = Math.max(this.aiParams.minAngleRange, this.aiParams.angleRange * 0.7);
            this.aiParams.powerRange = Math.max(this.aiParams.minPowerRange, this.aiParams.powerRange * 0.7);
        } else {
            this.aiParams.angleRange = Math.min(this.aiParams.maxAngleRange, this.aiParams.angleRange * 1.3);
            this.aiParams.powerRange = Math.min(this.aiParams.maxPowerRange, this.aiParams.powerRange * 1.3);
        }

        this.angle = bestAngle + (Math.random() * 0.01 - 0.005);
        this.power = Math.max(40, Math.min(100, bestPower));
        
        if (this.inventory && this.inventory.length > 0) {
            const targetDistance = Math.sqrt(calc.dx * calc.dx + calc.dy * calc.dy);
            const isGoodShot = minError < errorThreshold;
            const useSpecialWeapon = isGoodShot && Math.random() < 0.7;
            
            if (useSpecialWeapon) {
                let preferredWeaponType = null;
                
                if (targetDistance > state.canvas.width * 0.6) {
                    preferredWeaponType = 'nuke';
                } else if (targetDistance < state.canvas.width * 0.3) {
                    preferredWeaponType = 'laser';
                }
                
                const weapons = this.inventory.filter(item => 
                    item.effect.type === 'weapon' && 
                    (!preferredWeaponType || item.id === preferredWeaponType)
                );
                
                if (this.health < 40 && Math.random() < 0.8) {
                    const shields = this.inventory.filter(item => item.id === 'shield');
                    if (shields.length > 0) {
                        this.useItem('shield');
                        return;
                    }
                }
                
                if (weapons.length > 0) {
                    const weapon = weapons[Math.floor(Math.random() * weapons.length)];
                    this.useItem(weapon.id);
                }
            }
        }
    }

    aiCalculations(targetTank) {
        const dx = targetTank.x + targetTank.width / 2 - (this.x + this.width / 2);
        const dy = targetTank.y - this.y - this.height + 5;
        return { dx, dy };
    }
}
