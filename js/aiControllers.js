
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
        // Ported from aiLevel8 but with scaling error
        const g = env.gravity;
        const windFactor = env.wind * 5.5;
        const dx = target.x + target.width / 2 - (tank.x + tank.width / 2);
        const dy = target.y - tank.y - tank.height + 5;
        let bestAngle, bestPower, minError = Infinity;
        
        const angleMin = 20 * (Math.PI / 180);
        const angleMax = 160 * (Math.PI / 180);
        
        for (let power = 40; power <= 100; power += 1) {
            for (let angle = angleMin; angle <= angleMax; angle += (Math.PI / 360)) {
                const vx = power * Math.cos(angle) * 0.2 - windFactor * env.wind;
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

        // Apply error based on difficulty and shot history
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
    calculateShot(tank, target, env) {
        // Just random stuff, might hit self
        const angle = Math.random() * Math.PI;
        const power = 20 + Math.random() * 80;
        return { angle, power };
    }
}

export class LobberAI extends AIController {
    calculateShot(tank, target, env) {
        // High angles
        const angle = (60 + Math.random() * 25) * (Math.PI / 180);
        const power = 60 + Math.random() * 40;
        return { angle, power };
    }
}

export class SniperAI extends AIController {
    calculateShot(tank, target, env) {
        // Low angles
        const angle = (10 + Math.random() * 20) * (Math.PI / 180);
        // Sniper needs to adjust power more carefully or use specialized math
        // For now, random but focused
        const power = 80 + Math.random() * 20;
        return { angle, power };
    }
}

export class MastermindAI extends AIController {
    constructor() {
        super();
        this.lastResult = null;
    }

    calculateShot(tank, target, env) {
        // Ported from aiLevelMaxLob
        const dt = 0.05;
        const maxSimTime = 10;
        const g = env.gravity;
        const physicsScale = 0.2;
        
        const barrelLength = 30;
        const startX = tank.x + tank.width / 2; // simplified for interface
        const startY = tank.y - tank.height;

        const calc = {
            dx: target.x + target.width / 2 - startX,
            dy: target.y - startY
        };

        let bestAngle = null;
        let bestPower = null;
        let minError = Infinity;
        
        // Mastermind runs deep simulation
        for (let power = 40; power <= 100; power += 2) {
            for (let angle = 10 * Math.PI/180; angle <= 170 * Math.PI/180; angle += Math.PI/180) {
                let x = startX, y = startY;
                let vx = power * Math.cos(angle) * physicsScale;
                let vy = -power * Math.sin(angle) * physicsScale;
                let t = 0;

                while (t < maxSimTime && y < 1000) { // arbitrary floor
                    x += vx * dt;
                    y += vy * dt;
                    vy += g * dt;
                    vx += env.wind * dt;
                    t += dt;
                    
                    const dist = Math.sqrt(Math.pow(x - (target.x + target.width/2), 2) + Math.pow(y - target.y, 2));
                    if (dist < minError) {
                        minError = dist;
                        bestAngle = angle;
                        bestPower = power;
                    }
                    if (y > target.y + 50) break;
                }
            }
        }

        const history = this.getShotHistory(target);
        const noise = history >= 2 ? 0 : (0.05 / (history + 1));
        
        return {
            angle: (bestAngle || Math.PI/4) + (Math.random() * 2 - 1) * noise,
            power: (bestPower || 50) + (Math.random() * 2 - 1) * noise * 10
        };
    }
}
