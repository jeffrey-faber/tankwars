// Helper to simulate shots and find the best parameters within constraints
function findBestShot(tank, target, env, angleMin, angleMax, angleStep = Math.PI / 180, powerStep = 1) {
    const g = env.gravity;
    const physicsScale = 0.2; // Matches tank.js
    
    const startX = tank.x + tank.width / 2;
    const startY = tank.y - tank.height;
    
    // Target center
    const tx = target.x + target.width / 2;
    const ty = target.y - target.height / 2;

    let bestAngle = null;
    let bestPower = null;
    let minError = Infinity;

    for (let power = 20; power <= 100; power += powerStep) {
        for (let angle = angleMin; angle <= angleMax; angle += angleStep) {
            let x = startX;
            let y = startY;
            let vx = power * Math.cos(angle) * physicsScale;
            let vy = -power * Math.sin(angle) * physicsScale;
            
            let hitX = x;
            let foundXMatch = false;

            // Sim flight
            for(let t = 0; t < 200; t++) {
                vy += g;
                vx += env.wind;
                x += vx;
                y += vy;

                // Check if we passed the target X
                const dx = tx - startX;
                if ((dx > 0 && x >= tx) || (dx < 0 && x <= tx)) {
                    hitX = x;
                    const error = Math.abs(y - ty);
                    if (error < minError) {
                        minError = error;
                        bestAngle = angle;
                        bestPower = power;
                    }
                    foundXMatch = true;
                    break;
                }
                if (y > 2000) break; // Floor
            }
        }
    }
    
    return { angle: bestAngle, power: bestPower, error: minError };
}

export class AIController {
    constructor() {
        this.shotsAgainstTarget = new Map(); // targetName -> count
    }

    calculateShot(tank, target, env) {
        throw new Error('calculateShot must be implemented by subclass');
    }

    shop(store, tank) {
        // Default: no shopping
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

    chooseTarget(tank, allTanks) {
        // Standard AI sticks to target until dead or random switch
        if (this.lastTarget && this.lastTarget.alive && Math.random() > 0.3) {
            return this.lastTarget;
        }
        const newTarget = super.chooseTarget(tank, allTanks);
        this.lastTarget = newTarget;
        return newTarget;
    }

    calculateShot(tank, target, env) {
        // Standard AI uses the full range but with scaled error
        const result = findBestShot(tank, target, env, 10 * Math.PI/180, 170 * Math.PI/180);
        
        let bestAngle = result.angle || Math.PI / 4;
        let bestPower = result.power || 70;

        // Apply error based on difficulty and shot history
        let errorScale = 1.0;
        if (this.difficulty === 'easy') errorScale = 2.0;
        if (this.difficulty === 'hard') errorScale = 0.5;

        const history = this.getShotHistory(target);
        // Learning: reduce error by 30% for each shot
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
    calculateShot(tank, target, env) {
        // High randomness, potential for self-harm
        let angle = Math.random() * Math.PI; // 0 to 180 degrees
        
        // 10% chance to fire at an absurd angle (straight up or backwards) that might hit self
        if (Math.random() < 0.1) {
            angle = (Math.random() * 20 + 80) * (Math.PI / 180); // 80-100 degrees (near vertical)
        }

        const power = 10 + Math.random() * 90;
        
        return { angle, power };
    }
}

export class LobberAI extends AIController {
    calculateShot(tank, target, env) {
        // Constrain to high angles: 60 to 85 degrees (and mirrored)
        // Check direction
        const dx = target.x - tank.x;
        let minA, maxA;
        
        // Always try to lob "forward" relative to target
        if (dx > 0) {
            minA = 60 * Math.PI / 180;
            maxA = 85 * Math.PI / 180;
        } else {
            minA = 95 * Math.PI / 180;
            maxA = 120 * Math.PI / 180;
        }

        const result = findBestShot(tank, target, env, minA, maxA);
        
        const history = this.getShotHistory(target);
        const learningFactor = Math.max(0.1, 1.0 - (history * 0.2)); // Slower learning than standard
        
        // Add some noise so it's not perfect
        const noise = (Math.random() * 2 - 1) * 2 * learningFactor;

        return {
            angle: (result.angle || (minA + maxA)/2) + (noise * Math.PI / 180),
            power: Math.max(10, Math.min(100, (result.power || 70) + noise * 2))
        };
    }
}

export class SniperAI extends AIController {
    calculateShot(tank, target, env) {
        // Constrain to low angles: 0-20 degrees (and mirrored)
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
        
        // Snipers are accurate initially but improve fast
        const history = this.getShotHistory(target);
        const learningFactor = Math.max(0.05, 0.8 - (history * 0.4)); 
        
        const noise = (Math.random() * 2 - 1) * 1 * learningFactor; // Very low noise

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

            onShotResult(target, impactX, impactY) {
                const tx = target.x + target.width / 2;
                let errorX = impactX - tx;
                
                // Record this shot result
                let history = this.shotHistoryMap.get(target.name);
                if (!history) {
                    history = [];
                    this.shotHistoryMap.set(target.name, history);
                }
                
                // Only add if we have a pending power
                if (this.pendingPower) {
                    history.push({ power: this.pendingPower, error: errorX });
                    if (history.length > 5) history.shift();
                }
            }
        chooseTarget(tank, allTanks) {
        if (this.currentTarget && this.currentTarget.alive) {
            return this.currentTarget;
        }
        const targets = allTanks.filter(t => t !== tank && t.alive);
        if (targets.length === 0) return null;
        targets.sort((a, b) => {
            const distA = Math.abs(a.x - tank.x);
            const distB = Math.abs(b.x - tank.x);
            return distA - distB; 
        });
        this.currentTarget = targets[0];
        return this.currentTarget;
    }

    calculateShot(tank, target, env) {
        // 1. Calculate Baseline (Best guess)
        const baseResult = findBestShot(tank, target, env, 0, Math.PI, Math.PI/360, 0.5);
        let angle = baseResult.angle || Math.PI/4;
        let idealPower = baseResult.power || 70;

        // 2. Interpolate from History
        const history = this.shotHistoryMap.get(target.name) || [];
        
        if (history.length >= 2) {
            // Sort by error magnitude to find closest shots
            const sorted = [...history].sort((a, b) => Math.abs(a.error) - Math.abs(b.error));
            
            // Try to find a bracket
            const best = sorted[0];
            const bracket = sorted.find(s => Math.sign(s.error) !== Math.sign(best.error));
            
            if (bracket) {
                // Linear Interpolation
                const p1 = best;
                const p2 = bracket;
                // Formula: power = p1 + (p2 - p1) * (0 - e1) / (e2 - e1)
                const t = (0 - p1.error) / (p2.error - p1.error);
                idealPower = p1.power + (p2.power - p1.power) * t;
            } else {
                // No bracket. Extrapolate from most recent.
                const last = history[history.length - 1];
                const Kp = 0.15;
                idealPower = last.power - (last.error * Kp);
            }
        } else if (history.length === 1) {
            // One shot history. Proportional correction.
            const last = history[0];
            const Kp = 0.2; 
            idealPower = last.power - (last.error * Kp);
        } else {
            // First shot: Baseline + small random noise
            idealPower += (Math.random() * 2 - 1);
        }

        // Clamp power
        idealPower = Math.max(10, Math.min(100, idealPower));
        
        // Save for recording later
        this.pendingPower = idealPower;

        return {
            angle: angle,
            power: idealPower
        };
    }
}