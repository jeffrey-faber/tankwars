export function detectClumping(target, allTanks) {
    const radius = 100;
    const tx = target.x + target.width / 2;
    const ty = target.y - target.height / 2;

    const enemiesNearTarget = allTanks.filter(t => {
        if (!t.alive || t === target) return false;
        const dx = (t.x + t.width / 2) - tx;
        const dy = (t.y - t.height / 2) - ty;
        return Math.sqrt(dx * dx + dy * dy) < radius;
    });

    return enemiesNearTarget.length >= 2;
}

// Helper to simulate shots and find the best parameters within constraints
function findBestShot(tank, target, env, angleMin, angleMax, powerMin = 10, powerMax = 100, preference = 'any', initialAngleStep = Math.PI / 45, initialPowerStep = 2) {
    const g = env.gravity;
    const physicsScale = 0.2; 
    const barrelLength = 30;

    const tx = target.x + target.width / 2;
    const ty = target.y - target.height / 2;

    let bestAngle = null;
    let bestPower = null;
    let minError = Infinity;
    let bestCriteria = (preference === 'steepest' ? -Infinity : Infinity);

    const checkBetter = (error, angle, peakY) => {
        if (error > 20) return false; // Must be reasonably close to be considered a "hit"
        
        if (preference === 'any') {
            return error < minError;
        }
        
        // If error is significantly better, always take it
        if (error < minError - 5) return true;
        // If errors are similar, use preference
        if (Math.abs(error - minError) <= 5) {
            if (preference === 'flattest') {
                return peakY > bestCriteria; // higher Y value means lower peak height
            }
            if (preference === 'steepest') {
                return peakY < bestCriteria; // lower Y value means higher peak height
            }
        }
        return false;
    };

    // Phase 1: Coarse Search
    for (let power = powerMin; power <= powerMax; power += initialPowerStep) {
        for (let angle = angleMin; angle <= angleMax; angle += initialAngleStep) {
            const res = simulateSingleTrajectory(tank, target, env, angle, power, g, physicsScale, barrelLength, tx, ty);
            if (res.hitX && checkBetter(res.error, angle, res.peakY)) {
                minError = res.error;
                bestAngle = angle;
                bestPower = power;
                bestCriteria = res.peakY;
            }
        }
    }

    // Phase 2: Refined Search
    if (bestAngle !== null) {
        const refineAngleRange = initialAngleStep;
        const refinePowerRange = initialPowerStep;
        const refineSteps = 5;

        for (let power = Math.max(powerMin, bestPower - refinePowerRange); power <= Math.min(powerMax, bestPower + refinePowerRange); power += refinePowerRange / refineSteps) {
            for (let angle = Math.max(angleMin, bestAngle - refineAngleRange); angle <= Math.min(angleMax, bestAngle + refineAngleRange); angle += refineAngleRange / refineSteps) {
                const res = simulateSingleTrajectory(tank, target, env, angle, power, g, physicsScale, barrelLength, tx, ty);
                if (res.hitX && res.error < minError) {
                    minError = res.error;
                    bestAngle = angle;
                    bestPower = power;
                }
            }
        }
    }
    
    return { angle: bestAngle, power: bestPower, error: minError };
}

function simulateSingleTrajectory(tank, target, env, angle, power, g, physicsScale, barrelLength, tx, ty) {
    let x = tank.x + tank.width / 2 + barrelLength * Math.cos(angle);
    let y = tank.y - tank.height - barrelLength * Math.sin(angle);
    let vx = power * Math.cos(angle) * physicsScale;
    let vy = -power * Math.sin(angle) * physicsScale;
    
    const dxInitial = tx - (tank.x + tank.width / 2);
    let peakY = y;

    for(let t = 0; t < 500; t++) {
        vy += g;
        vx += env.wind;
        
        if (y < peakY) peakY = y;

        const speed = Math.sqrt(vx*vx + vy*vy);
        const steps = Math.ceil(speed / 2);
        const stepX = vx / steps;
        const stepY = vy / steps;
        
        for (let s = 0; s < steps; s++) {
            x += stepX;
            y += stepY;
            if (env.checkTerrain && env.checkTerrain(x, y)) {
                return { hitX: false }; // Hit terrain
            }
        }

        const crossedX = (dxInitial > 0 && x >= tx) || (dxInitial < 0 && x <= tx);
        if (crossedX) {
            return { hitX: true, error: Math.abs(y - ty), peakY };
        }
        if (y > 1500) break; 
    }
    return { hitX: false };
}

export class AIController {
    constructor() {
        this.shotsAgainstTarget = new Map(); // targetName -> count
    }

    calculateShot(tank, target, env) {
        throw new Error('calculateShot must be implemented by subclass');
    }

    shop(store, tank) {
        // Default: random chance to buy affordable items
        if (Math.random() > 0.3) return; 
        
        const affordable = store.items.filter(i => i.price <= tank.currency);
        if (affordable.length === 0) return;
        
        const item = affordable[Math.floor(Math.random() * affordable.length)];
        store.buyItem(item.id);
    }

    getShotHistory(target) {
        return this.shotsAgainstTarget.get(target.name) || 0;
    }

    recordShot(target) {
        const count = this.getShotHistory(target);
        this.shotsAgainstTarget.set(target.name, count + 1);
    }

    onShotResult(target, impactX, impactY) {
        // Default: do nothing
    }

    chooseTarget(tank, allTanks) {
        // Default: Random alive target that isn't self
        const targets = allTanks.filter(t => t !== tank && t.alive);
        if (targets.length === 0) return null;
        return targets[Math.floor(Math.random() * targets.length)];
    }
}

export class StandardAI extends AIController {
    constructor(difficulty = 'medium') {
        super();
        this.difficulty = difficulty;
        this.lastTarget = null;
    }

    shop(store, tank) {
        // Standard AI: 50% chance to shop
        if (Math.random() > 0.5) return;

        const affordable = store.items.filter(i => i.price <= tank.currency);
        if (affordable.length === 0) return;

        // Prioritize healing if low health
        if (tank.health < 50) {
            const health = affordable.find(i => i.effect.type === 'healing');
            if (health) {
                store.buyItem(health.id);
                return;
            }
        }

        // Proactive Parachute
        if (tank.currency >= 50 && tank.parachuteDurability === 0 && Math.random() < 0.1) {
            store.buyItem('parachute');
            return;
        }

        // Hard/Medium buying logic
        if (this.difficulty === 'hard') {
            if (tank.currency >= 350 && Math.random() < 0.3) {
                store.buyItem('earthquake_l');
                return;
            }
            if (tank.currency >= 150 && Math.random() < 0.2) {
                store.buyItem('blockbuster');
                return;
            }
            if (tank.currency >= 50 && Math.random() < 0.5) {
                store.buyItem('heavy');
                return;
            }
        }
        
        if (this.difficulty === 'medium') {
            if (tank.currency >= 150 && Math.random() < 0.1) {
                store.buyItem('blockbuster');
                return;
            }
            if (tank.currency >= 50 && Math.random() < 0.2) {
                store.buyItem('heavy');
                return;
            }
        }

        // Random otherwise
        const item = affordable[Math.floor(Math.random() * affordable.length)];
        store.buyItem(item.id);
    }

    chooseWeapon(tank, target, allTanks) {
        // Hard bots use best available
        if (this.difficulty === 'hard') {
            if (tank.inventory.find(i => i.id === 'earthquake_l')) return 'earthquake_l';
            if (tank.inventory.find(i => i.id === 'titan_shell')) return 'titan_shell';
            if (tank.inventory.find(i => i.id === 'blockbuster')) return 'blockbuster';
            if (tank.inventory.find(i => i.id === 'heavy')) return 'heavy';
        }
        // Medium bots use good available
        if (this.difficulty === 'medium') {
            if (tank.inventory.find(i => i.id === 'blockbuster')) return 'blockbuster';
            if (tank.inventory.find(i => i.id === 'heavy')) return 'heavy';
        }
        return 'default';
    }

    chooseTarget(tank, allTanks) {
        if (this.lastTarget && this.lastTarget.alive && Math.random() > 0.3) {
            return this.lastTarget;
        }
        const newTarget = super.chooseTarget(tank, allTanks);
        this.lastTarget = newTarget;
        return newTarget;
    }

    calculateShot(tank, target, env) {
        const result = findBestShot(tank, target, env, 5 * Math.PI/180, 175 * Math.PI/180, 10, 100);
        
        let bestAngle = result.angle || Math.PI / 4;
        let bestPower = result.power || 70;

        let errorScale = 1.0;
        if (this.difficulty === 'easy') errorScale = 2.0;
        if (this.difficulty === 'hard') errorScale = 0.5;

        const history = this.getShotHistory(target);
        const learningFactor = Math.max(0.1, 1.0 - (history * 0.3));
        
        const angleError = (Math.random() * 2 - 1) * (Math.PI / 180) * 5 * errorScale * learningFactor;
        const powerError = (Math.random() * 2 - 1) * 5 * errorScale * learningFactor;
        
        return {
            angle: bestAngle + angleError,
            power: Math.max(10, Math.min(100, bestPower + powerError))
        };
    }
}

export class StupidAI extends AIController {
    shop(store, tank) {
        // Stupid: Loves chaos (Cluster, Nuke)
        if (tank.currency >= 150 && Math.random() < 0.5) {
            store.buyItem('cluster_bomb');
            return;
        }
        if (tank.currency >= 500 && Math.random() < 0.5) {
            store.buyItem('mega_nuke');
            return;
        }

        // Randomly buy things
        if (Math.random() < 0.5) {
            const affordable = store.items.filter(i => i.price <= tank.currency);
            if (affordable.length > 0) {
                const item = affordable[Math.floor(Math.random() * affordable.length)];
                store.buyItem(item.id);
            }
        }
    }

    chooseWeapon(tank, target, allTanks) {
        // Randomly pick a weapon from inventory
        const weapons = tank.inventory.filter(i => i.effect.type === 'weapon');
        if (weapons.length > 0 && Math.random() < 0.5) {
            return weapons[Math.floor(Math.random() * weapons.length)].id;
        }
        return 'default';
    }

    calculateShot(tank, target, env) {
        // Stupid: Random everything, no constraints
        let angle = Math.random() * Math.PI;
        const power = 10 + Math.random() * 90;
        return { angle, power };
    }
}

export class LobberAI extends AIController {
    shop(store, tank) {
        // Lobber loves Big Bombs
        if (tank.currency >= 500) {
            store.buyItem('mega_nuke');
        } else if (tank.currency >= 350) {
            store.buyItem('earthquake_l');
        } else if (tank.currency >= 300) {
            store.buyItem('titan_shell');
        } else if (tank.currency >= 150) {
            store.buyItem('blockbuster');
        } else if (tank.currency >= 120) {
            store.buyItem('earthquake_m');
        } else if (tank.currency >= 50) {
            store.buyItem('heavy');
        } else if (tank.currency >= 35) {
            store.buyItem('dirtball');
        }
    }

    chooseWeapon(tank, target, allTanks) {
        if (tank.inventory.find(i => i.id === 'mega_nuke')) return 'mega_nuke';
        if (tank.inventory.find(i => i.id === 'titan_shell')) return 'titan_shell';
        if (tank.inventory.find(i => i.id === 'earthquake_l')) return 'earthquake_l';
        if (tank.inventory.find(i => i.id === 'blockbuster')) return 'blockbuster';
        if (tank.inventory.find(i => i.id === 'heavy')) return 'heavy';
        if (tank.inventory.find(i => i.id === 'dirtball')) return 'dirtball';
        return 'default';
    }

    calculateShot(tank, target, env) {
        const dx = target.x - tank.x;
        let minA, maxA;
        if (dx > 0) {
            minA = 60 * Math.PI / 180;
            maxA = 88 * Math.PI / 180;
        } else {
            minA = 92 * Math.PI / 180;
            maxA = 120 * Math.PI / 180;
        }
        // Lobber locked to high angles and prefers STEEPEST
        const result = findBestShot(tank, target, env, minA, maxA, 20, 100, 'steepest');
        const history = this.getShotHistory(target);
        const learningFactor = Math.max(0.1, 1.0 - (history * 0.2));
        const noise = (Math.random() * 2 - 1) * 2 * learningFactor;
        return {
            angle: (result.angle || (minA + maxA)/2) + (noise * Math.PI / 180),
            power: Math.max(10, Math.min(100, (result.power || 70) + noise * 2))
        };
    }
}

export class SniperAI extends AIController {
    shop(store, tank) {
        // Sniper loves Lasers and needs Shovel to clear paths
        if (tank.currency >= 40 && !tank.inventory.find(i => i.id === 'laser')) {
            store.buyItem('laser');
        } else if (tank.currency >= 50 && !tank.inventory.find(i => i.id === 'heavy')) {
            store.buyItem('heavy'); // Good for bunkers
        } else if (tank.currency >= 20 && !tank.inventory.find(i => i.id === 'shovel')) {
            store.buyItem('shovel');
        }
    }

    chooseWeapon(tank, target, allTanks) {
        if (tank.inventory.find(i => i.id === 'laser')) return 'laser';
        if (tank.inventory.find(i => i.id === 'heavy')) return 'heavy';
        return 'default';
    }

    calculateShot(tank, target, env) {
        // Sniper prefers FLATTEST shots across the full viable range
        const result = findBestShot(tank, target, env, 5 * Math.PI / 180, 175 * Math.PI / 180, 70, 100, 'flattest');
        
        // If Sniper's best shot is blocked, try to use shovel to clear a path
        if (result.angle === null && tank.inventory.find(i => i.id === 'shovel')) {
            const hasShovel = tank.useItem('shovel');
            if (hasShovel) {
                // Aim shovel at the blocking terrain
                const shovelResult = findBestShot(tank, target, { ...env, checkTerrain: null }, 5 * Math.PI / 180, 175 * Math.PI / 180, 30, 60, 'flattest');
                return {
                    angle: shovelResult.angle || (Math.PI / 4),
                    power: (shovelResult.power || 50)
                };
            }
        }

        const history = this.getShotHistory(target);
        const learningFactor = Math.max(0.05, 0.8 - (history * 0.4)); 
        const noise = (Math.random() * 2 - 1) * 1 * learningFactor;
        
        const minA = 5 * Math.PI / 180;
        const maxA = 175 * Math.PI / 180;

        return {
            angle: (result.angle || (minA + maxA)/2) + (noise * Math.PI / 180),
            power: Math.max(70, Math.min(100, (result.power || 85) + noise))
        };
    }
}

export class MastermindAI extends AIController {
    constructor() {
        super();
        this.currentTarget = null;
        this.shotHistoryMap = new Map(); // targetName -> [{power, errorX}]
        this.pendingPower = 0;
    }

    shop(store, tank) {
        // Priority 1: Survival
        if (tank.health < 40 && tank.currency >= 25) {
            store.buyItem('health');
            return;
        }

        // Priority 2: Defense
        if (tank.currency >= 100 && tank.shieldDurability === 0) {
            store.buyItem('shield');
            return;
        }

        // Priority 3: Fall Protection
        if (tank.currency >= 50 && tank.parachuteDurability === 0) {
            store.buyItem('parachute');
            return;
        }

        // Priority 4: Tactical Arsenal
        if (tank.currency >= 500) {
            store.buyItem('mega_nuke');
        } else if (tank.currency >= 350) {
            store.buyItem('earthquake_l');
        } else if (tank.currency >= 150) {
            store.buyItem('cluster_bomb');
        } else if (tank.currency >= 120) {
            store.buyItem('earthquake_m');
        } else if (tank.currency >= 50) {
            store.buyItem('heavy');
        }
    }

    chooseWeapon(tank, target, allTanks) {
        if (!tank.inventory || tank.inventory.length === 0) return 'default';

        const weapons = tank.inventory.filter(i => i.effect.type === 'weapon');
        if (weapons.length === 0) return 'default';

        // 1. Group unique weapons to avoid redundant simulations
        const uniqueWeapons = Array.from(new Map(weapons.map(w => [w.id, w])).values());
        
        // 2. Tactical Analysis: Evaluate every weapon's Expected Value (EV)
        let bestWeaponId = 'default';
        let highestScore = -Infinity;

        // Add 'default' to the options
        const options = [{ id: 'default', effect: { radius: 15, damage: 50 }, price: 0 }, ...uniqueWeapons];

        for (const weapon of options) {
            const radius = weapon.effect.radius || 15;
            const damage = weapon.effect.damage || 50;
            const cost = weapon.price || 1; // Avoid div by zero for default

            // Simulate the shot to get predicted impact
            const env = { wind: state.wind, gravity: state.gravity, checkTerrain: (x, y) => state.terrain.checkCollision(x, y) };
            const shot = this.calculateShot(tank, target, env);
            
            // Very basic trajectory prediction for ROI calculation
            // In a real duel, we'd use the simulated impact point
            const tx = target.x + target.width / 2;
            const ty = target.y - target.height / 2;

            let weaponScore = 0;
            
            // Calculate Damage ROI against ALL tanks
            for (const other of allTanks) {
                if (!other.alive) continue;
                
                const ox = other.x + other.width / 2;
                const oy = other.y - other.height / 2;
                const dist = Math.sqrt((tx - ox)**2 + (ty - oy)**2);

                if (dist < radius) {
                    const factor = 1 - (dist / radius);
                    const predictedDamage = damage * factor;
                    
                    if (other === tank) {
                        weaponScore -= predictedDamage * 2; // High penalty for self-harm
                    } else {
                        weaponScore += predictedDamage;
                        if (predictedDamage >= other.health) weaponScore += 100; // Kill bonus
                    }
                }
            }

            // Normalize by cost (Expensive weapons need to deal more damage to be worth it)
            const roi = weaponScore / (cost + 10); 
            
            if (roi > highestScore) {
                highestScore = roi;
                bestWeaponId = weapon.id;
            }
        }

        return bestWeaponId;
    }

    onShotResult(target, impactX, impactY) {


        const tx = target.x + target.width / 2;
        const errorX = impactX - tx;
        let history = this.shotHistoryMap.get(target.name);
        if (!history) {
            history = [];
            this.shotHistoryMap.set(target.name, history);
        }
        if (this.pendingPower) {
            history.push({ power: this.pendingPower, error: errorX });
            if (history.length > 5) history.shift();
        }
    }

    chooseTarget(tank, allTanks) {
        if (this.currentTarget && this.currentTarget.alive) return this.currentTarget;
        const targets = allTanks.filter(t => t !== tank && t.alive);
        if (targets.length === 0) return null;
        targets.sort((a, b) => Math.abs(a.x - tank.x) - Math.abs(b.x - tank.x));
        this.currentTarget = targets[0];
        return this.currentTarget;
    }

    calculateShot(tank, target, env) {
        // 1. Dual-Trajectory Intelligence: Evaluate Direct and Lob options
        const directResult = findBestShot(tank, target, env, 0, Math.PI, 10, 100);
        const lobResult = findBestShot(tank, target, env, Math.PI / 4, 3 * Math.PI / 4, 20, 100, 'steepest');
        
        let best = directResult;
        
        // If direct is blocked or risky, prefer the lob
        if (directResult.angle === null || (lobResult.angle !== null && lobResult.error < directResult.error)) {
            best = lobResult;
        }

        let angle = best.angle || Math.PI/4;
        let idealPower = best.power || 70;

        // 2. Predictive History Interpolation
        const history = this.shotHistoryMap.get(target.name) || [];
        if (history.length >= 1) {
            const direction = Math.cos(angle) >= 0 ? 1 : -1;
            
            if (history.length >= 2) {
                const sorted = [...history].sort((a, b) => Math.abs(a.error) - Math.abs(b.error));
                const bestHistoric = sorted[0];
                const bracket = sorted.find(s => Math.sign(s.error) !== Math.sign(bestHistoric.error));
                
                if (bracket) {
                    const t = (0 - bestHistoric.error) / (bracket.error - bestHistoric.error);
                    idealPower = bestHistoric.power + (bracket.power - bestHistoric.power) * t;
                } else {
                    const last = history[history.length - 1];
                    const Kp = Math.abs(Math.cos(angle)) * 0.2 + 0.1;
                    idealPower = last.power - (last.error * direction * Kp);
                }
            } else {
                const last = history[0];
                const Kp = Math.abs(Math.cos(angle)) * 0.2 + 0.1;
                idealPower = last.power - (last.error * direction * Kp);
            }
        }

        idealPower = Math.max(10, Math.min(100, idealPower));

        // 3. Recursive Safety Check: Nudge angle until shot is clear
        let safetyIterations = 0;
        while (this.detectSelfHarm(tank, env, angle, idealPower) && safetyIterations < 5) {
            angle += (Math.PI / 36) * (Math.cos(angle) > 0 ? 1 : -1); // 5 degree nudge
            safetyIterations++;
        }

        this.pendingPower = idealPower;
        return { angle, power: idealPower };
    }

    detectSelfHarm(tank, env, angle, power) {
        const g = env.gravity;
        const physicsScale = 0.2;
        const barrelLength = 30;
        let x = tank.x + tank.width / 2 + barrelLength * Math.cos(angle);
        let y = tank.y - tank.height - barrelLength * Math.sin(angle);
        let vx = power * Math.cos(angle) * physicsScale;
        let vy = -power * Math.sin(angle) * physicsScale;

        // Check first 30 frames (approx 500ms in game time, but we care about immediate)
        for(let t = 0; t < 30; t++) {
            vy += g;
            vx += env.wind;
            x += vx;
            y += vy;
            if (env.checkTerrain && env.checkTerrain(x, y)) {
                // If it hits within a small radius of the tank, it's likely self-harm
                const distFromTank = Math.sqrt((x - (tank.x+tank.width/2))**2 + (y - (tank.y-tank.height/2))**2);
                if (distFromTank < 60) return true; 
            }
        }
        return false;
    }
}
