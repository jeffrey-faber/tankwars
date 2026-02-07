
// Helper to simulate shots and find the best parameters within constraints
function findBestShot(tank, target, env, angleMin, angleMax, initialAngleStep = Math.PI / 45, initialPowerStep = 2) {
    const g = env.gravity;
    const physicsScale = 0.2; 
    const barrelLength = 30;

    const tx = target.x + target.width / 2;
    const ty = target.y - target.height / 2;

    let bestAngle = null;
    let bestPower = null;
    let minError = Infinity;

    // Phase 1: Coarse Search
    for (let power = 10; power <= 100; power += initialPowerStep) {
        for (let angle = angleMin; angle <= angleMax; angle += initialAngleStep) {
            const res = simulateSingleTrajectory(tank, target, env, angle, power, g, physicsScale, barrelLength, tx, ty);
            if (res.hitX && res.error < minError) {
                minError = res.error;
                bestAngle = angle;
                bestPower = power;
            }
        }
    }

    // Phase 2: Refined Search around the best coarse result
    if (bestAngle !== null) {
        const refineAngleRange = initialAngleStep;
        const refinePowerRange = initialPowerStep;
        const refineSteps = 5;

        for (let power = bestPower - refinePowerRange; power <= bestPower + refinePowerRange; power += refinePowerRange / refineSteps) {
            for (let angle = bestAngle - refineAngleRange; angle <= bestAngle + refineAngleRange; angle += refineAngleRange / refineSteps) {
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

    for(let t = 0; t < 500; t++) {
        vy += g;
        vx += env.wind;

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
            return { hitX: true, error: Math.abs(y - ty) };
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

        // Random otherwise
        const item = affordable[Math.floor(Math.random() * affordable.length)];
        store.buyItem(item.id);
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
        const result = findBestShot(tank, target, env, 10 * Math.PI/180, 170 * Math.PI/180);
        
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
        // Stupid: Randomly buy things, even if not needed
        if (Math.random() < 0.5) {
            const affordable = store.items.filter(i => i.price <= tank.currency);
            if (affordable.length > 0) {
                const item = affordable[Math.floor(Math.random() * affordable.length)];
                store.buyItem(item.id);
            }
        }
    }

    calculateShot(tank, target, env) {
        let angle = Math.random() * Math.PI;
        if (Math.random() < 0.1) {
            angle = (Math.random() * 20 + 80) * (Math.PI / 180);
        }
        const power = 10 + Math.random() * 90;
        return { angle, power };
    }
}

export class LobberAI extends AIController {
    shop(store, tank) {
        // Lobber loves Nukes (radius)
        if (tank.currency >= 50) {
            store.buyItem('nuke');
        } else if (Math.random() < 0.3) {
            // Or save up / buy cheap stuff
            const affordable = store.items.filter(i => i.price <= tank.currency);
            if (affordable.length > 0) {
                store.buyItem(affordable[0].id);
            }
        }
    }

    calculateShot(tank, target, env) {
        const dx = target.x - tank.x;
        let minA, maxA;
        if (dx > 0) {
            minA = 60 * Math.PI / 180;
            maxA = 85 * Math.PI / 180;
        } else {
            minA = 95 * Math.PI / 180;
            maxA = 120 * Math.PI / 180;
        }
        const result = findBestShot(tank, target, env, minA, maxA);
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
        // Sniper loves Lasers
        if (tank.currency >= 40) {
            store.buyItem('laser');
        }
    }

    calculateShot(tank, target, env) {
        const dx = target.x - tank.x;
        let minA, maxA;
        if (dx > 0) {
            minA = 0;
            maxA = 25 * Math.PI / 180;
        } else {
            minA = 155 * Math.PI / 180;
            maxA = 180 * Math.PI / 180;
        }
        const result = findBestShot(tank, target, env, minA, maxA);
        const history = this.getShotHistory(target);
        const learningFactor = Math.max(0.05, 0.8 - (history * 0.4)); 
        const noise = (Math.random() * 2 - 1) * 1 * learningFactor;
        return {
            angle: (result.angle || (minA + maxA)/2) + (noise * Math.PI / 180),
            power: Math.max(10, Math.min(100, (result.power || 80) + noise))
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



            // Priority 2: Defense if rich

            if (tank.currency >= 100 && !tank.shielded) {

                store.buyItem('shield');

                return;

            }



            // Priority 3: Offense

            // Buy Nuke for groups (simplified check) or Laser for long range?

            // Mastermind is rich, buy best available

            if (tank.currency >= 50) {

                store.buyItem('nuke');

            } else if (tank.currency >= 40) {

                store.buyItem('laser');

            }

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
        // 1. Calculate Baseline (Best guess)
        // Try standard range first
        let baseResult = findBestShot(tank, target, env, 0, Math.PI);
        
        // If no direct path found, try a pure lobbing strategy (45-90 degrees)
        if (baseResult.angle === null) {
            baseResult = findBestShot(tank, target, env, Math.PI/4, 3*Math.PI/4);
        }

        let angle = baseResult.angle || Math.PI/4;
        let idealPower = baseResult.power || 70;

        // 2. Interpolate from History
        const history = this.shotHistoryMap.get(target.name) || [];
        if (history.length >= 2) {
            // Sort by error magnitude to find closest shots
            const sorted = [...history].sort((a, b) => Math.abs(a.error) - Math.abs(b.error));
            const best = sorted[0];
            const bracket = sorted.find(s => Math.sign(s.error) !== Math.sign(best.error));
            
            if (bracket) {
                // Linear Interpolation
                const t = (0 - best.error) / (bracket.error - best.error);
                idealPower = best.power + (bracket.power - best.power) * t;
            } else {
                // No bracket. Proportional correction based on distance from target center.
                const last = history[history.length - 1];
                // Kp should be dynamic based on angle? (Lower power change needed for high arcs)
                const Kp = Math.abs(Math.cos(angle)) * 0.2 + 0.1;
                idealPower = last.power - (last.error * Kp);
            }
        } else if (history.length === 1) {
            const last = history[0];
            const Kp = Math.abs(Math.cos(angle)) * 0.2 + 0.1;
            idealPower = last.power - (last.error * Kp);
        }

        idealPower = Math.max(10, Math.min(100, idealPower));

        // 3. Self-Harm Detection
        // Simulate first 100ms of flight to see if we hit immediate terrain
        if (this.detectSelfHarm(tank, env, angle, idealPower)) {
            // Try to increase angle to clear local obstacle
            angle += (Math.PI / 18) * (Math.cos(angle) > 0 ? 1 : -1); // 10 degree nudge up
            // Re-simulate to see if we cleared it
            if (this.detectSelfHarm(tank, env, angle, idealPower)) {
                 angle += (Math.PI / 18) * (Math.cos(angle) > 0 ? 1 : -1); // Another 10
            }
        }

        this.pendingPower = idealPower;

        // 4. Anti-Stagnation
        // If we've fired 3+ times at the same target and aren't hitting, 
        // and our power adjustment is barely changing, try a different angle search.
        if (history.length >= 3) {
            const lastThree = history.slice(-3);
            const errorDiff = Math.abs(lastThree[0].error - lastThree[2].error);
            if (errorDiff < 5) { // Error is stuck
                // Force a lob if we weren't lobbing, or vice versa
                if (angle < Math.PI / 3 || angle > 2 * Math.PI / 3) {
                    const lobResult = findBestShot(tank, target, env, Math.PI / 3, 2 * Math.PI / 3);
                    if (lobResult.angle !== null) {
                        angle = lobResult.angle;
                        idealPower = lobResult.power;
                    }
                }
            }
        }

        return {
            angle: angle,
            power: idealPower
        };
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
