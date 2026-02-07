// Helper to simulate shots and find the best parameters within constraints
function findBestShot(tank, target, env, angleMin, angleMax, angleStep = Math.PI / 180, powerStep = 1) {
    const g = env.gravity;
    const windFactor = env.wind * 5.5; // Tuning factor for wind
    const physicsScale = 0.2; // From tank.js
    
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
            
            // Quick heuristic filter
            const vx = power * Math.cos(angle) * physicsScale - windFactor * env.wind;
            const vy = -power * Math.sin(angle) * physicsScale;
            
            const dx = tx - startX;
            // If shooting away from target, skip
            if ((dx > 0 && vx <= 0) || (dx < 0 && vx >= 0)) continue;

            // Simplified trajectory check
            const t = Math.abs(dx / vx);
            if (t > 0 && isFinite(t)) {
                const landingY = startY + vy * t + 0.5 * g * t * t;
                const error = Math.abs(landingY - ty); // Vertical error at target X

                if (error < minError) {
                    minError = error;
                    bestAngle = angle;
                    bestPower = power;
                }
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
}

export class StandardAI extends AIController {
    constructor(difficulty = 'medium') {
        super();
        this.difficulty = difficulty;
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
    calculateShot(tank, target, env) {
        // Mastermind uses the best shot finding with high precision steps
        const result = findBestShot(tank, target, env, 0, Math.PI, Math.PI/360, 0.5);
        
        const history = this.getShotHistory(target);
        // Mastermind starts good, becomes perfect quickly
        // 0 shots: small error
        // 1 shot: tiny error
        // 2+ shots: 0 error
        const learningFactor = history >= 2 ? 0 : (0.2 / (history + 1));
        
        const angleError = (Math.random() * 2 - 1) * (Math.PI / 180) * 2 * learningFactor;
        const powerError = (Math.random() * 2 - 1) * 2 * learningFactor;

        return {
            angle: (result.angle || Math.PI/4) + angleError,
            power: Math.max(10, Math.min(100, (result.power || 70) + powerError))
        };
    }
}