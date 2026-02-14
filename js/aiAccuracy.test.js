import { describe, it, expect } from 'vitest';
import { MastermindAI, StandardAI, SniperAI, LobberAI } from './aiControllers.js';

// Mock tank for simulation
const createTank = (x, y) => ({ 
    x, y, width: 20, height: 10, name: 'Shooter', 
    isAI: true, currency: 1000, health: 100,
    inventory: [], selectedWeapon: 'default'
});
const createTarget = (x, y) => ({ x, y, width: 20, height: 10, name: 'Target', alive: true, health: 100 });

const PHYSICS = { gravity: 0.1, scale: 0.2 };

function simulateShot(shot, source, target, env) {
    const barrelLength = 30;
    const weaponRadius = 15;
    
    let x = source.x + source.width / 2 + barrelLength * Math.cos(shot.angle);
    let y = source.y - source.height - barrelLength * Math.sin(shot.angle);
    
    // SYNC WITH GAME PHYSICS: Apply safe starting distance "teleport"
    const safeStartingDistance = weaponRadius + 20;
    const tankCenterX = source.x + source.width/2;
    const tankCenterY = source.y - source.height/2;
    const distanceFromTankCenterToProjectile = Math.sqrt(
        (x - tankCenterX)**2 + (y - tankCenterY)**2
    );
    
    if (distanceFromTankCenterToProjectile < safeStartingDistance) {
        const safetyFactor = safeStartingDistance / distanceFromTankCenterToProjectile;
        x = tankCenterX + (x - tankCenterX) * safetyFactor;
        y = tankCenterY + (y - tankCenterY) * safetyFactor;
    }

    let vx = shot.power * Math.cos(shot.angle) * PHYSICS.scale;
    let vy = -shot.power * Math.sin(shot.angle) * PHYSICS.scale;
    
    const tx = target.x + target.width / 2;
    const ty = target.y - target.height / 2;
    const radius = 10; // Tight hit radius for precision testing

    for (let t = 0; t < 1000; t++) {
        vy += PHYSICS.gravity;
        vx += env.wind;

        const speed = Math.sqrt(vx*vx + vy*vy);
        const steps = Math.ceil(speed / 2);
        const stepX = vx / steps;
        const stepY = vy / steps;

        let hit = false;
        for (let s = 0; s < steps; s++) {
            x += stepX;
            y += stepY;
            if (env.checkTerrain && env.checkTerrain(x, y)) {
                hit = true;
                break;
            }
        }
        if (hit) return { hit: false, x, y, hitTerrain: true };

        const dist = Math.sqrt((x - tx)**2 + (y - ty)**2);
        if (dist <= radius) return { hit: true, x, y };
        
        if (y > 2000 || x < -1000 || x > 3000) return { hit: false, x, y };
    }
    return { hit: false, x, y };
}

function runDuel(controllerClass, difficulty, env, maxShots = 5, startX = 100, startY = 500, targetX = 700, targetY = 500) {
    const ai = new controllerClass(difficulty);
    const source = createTank(startX, startY);
    const target = createTarget(targetX, targetY); 
    
    ai.chooseTarget(source, [target]);

    for (let i = 1; i <= maxShots; i++) {
        const shot = ai.calculateShot(source, target, env);
        const result = simulateShot(shot, source, target, env);
        if (result.hit) return i;
        ai.recordShot(target);
        ai.onShotResult(target, result.x, result.y);
    }
    return -1;
}

describe('AI Accuracy Benchmark', () => {
    
    describe('MastermindAI Performance', () => {
        it('Standard: Calm Weather', () => {
            const result = runDuel(MastermindAI, null, { wind: 0, gravity: 0.1 });
            expect(result).toBeGreaterThan(0);
            expect(result).toBeLessThanOrEqual(3);
        });

        it('Standard: Strong Wind', () => {
            const result = runDuel(MastermindAI, null, { wind: 0.15, gravity: 0.1 });
            expect(result).toBeGreaterThan(0);
            expect(result).toBeLessThanOrEqual(5);
        });

        it('Obstacle: Over a Mountain', () => {
            const mountainEnv = {
                wind: 0,
                gravity: 0.1,
                checkTerrain: (x, y) => {
                    if (x < 300 || x > 500) return y > 500;
                    let surfaceY = (x < 400) ? 500 - (x - 300) * 3 : 200 + (x - 400) * 3;
                    return y > surfaceY; 
                }
            };
            const result = runDuel(MastermindAI, null, mountainEnv, 5);
            expect(result).toBeGreaterThan(0);
        });

        it('Obstacle: Deep Narrow Valley', () => {
            const valleyEnv = {
                wind: 0,
                gravity: 0.1,
                checkTerrain: (x, y) => {
                    // Two high pillars with a gap at 400
                    if (x > 350 && x < 450) return y > 700; // Deep gap
                    return y > 300; // High ground
                }
            };
            // Target is at bottom of valley
            const result = runDuel(MastermindAI, null, valleyEnv, 5, 100, 300, 400, 700);
            expect(result).toBeGreaterThan(0);
        });

        it('Constraint: Under an Overhanging Ledge', () => {
            const ledgeEnv = {
                wind: 0,
                gravity: 0.1,
                checkTerrain: (x, y) => {
                    const isGround = y > 500;
                    const isLedge = y < 400 && y > 350 && x > 500; // Ceiling over target
                    return isGround || isLedge;
                }
            };
            // Target at 700, 500 under a ledge at 350. Requires flat shot.
            const result = runDuel(MastermindAI, null, ledgeEnv, 5, 100, 500, 700, 500);
            expect(result).toBeGreaterThan(0);
        });

        it('Targeting: Into a Deep Pit', () => {
            const pitEnv = {
                wind: 0,
                gravity: 0.1,
                checkTerrain: (x, y) => {
                    if (x >= 600 && x <= 800) return y > 800; 
                    return y > 500;
                }
            };
            const result = runDuel(MastermindAI, null, pitEnv, 5, 100, 500, 700, 750);
            expect(result).toBeGreaterThan(0);
        });

        it('Targeting: High Cliff (Uphill)', () => {
            const cliffEnv = {
                wind: 0,
                gravity: 0.1,
                checkTerrain: (x, y) => {
                    if (x < 400) return y > 500;
                    return y > 200;
                }
            };
            const result = runDuel(MastermindAI, null, cliffEnv, 5, 100, 500, 700, 200);
            expect(result).toBeGreaterThan(0);
        });

        it('Extreme: Hurricane Force Wind', () => {
            const extremeWind = { wind: 0.4, gravity: 0.1 }; // Very strong wind
            const result = runDuel(MastermindAI, null, extremeWind, 8); // Allow more shots
            expect(result).toBeGreaterThan(0);
        });

        it('Scenario: Floating Island', () => {
            const islandEnv = {
                wind: 0,
                gravity: 0.1,
                checkTerrain: (x, y) => {
                    const isSourceGround = x < 200 && y > 500;
                    const isIsland = x > 500 && x < 700 && y > 300 && y < 350;
                    return isSourceGround || isIsland;
                }
            };
            // Target at 600, 300 on a floating island
            const result = runDuel(MastermindAI, null, islandEnv, 5, 100, 500, 600, 300);
            expect(result).toBeGreaterThan(0);
        });
    });

    describe('SniperAI Performance', () => {
        it('Must fire direct shots even if blocked', () => {
            const hillEnv = {
                wind: 0,
                gravity: 0.1,
                checkTerrain: (x, y) => {
                    if (x < 350 || x > 450) return false;
                    return y > 450; 
                }
            };
            const result = runDuel(SniperAI, null, hillEnv, 5, 100, 500, 700, 500);
            expect(result).toBeGreaterThan(0);
        });

        it('Deadly accuracy from high ground', () => {
            const highGroundEnv = {
                wind: 0,
                gravity: 0.1,
                checkTerrain: (x, y) => {
                    if (x < 300) return y > 200;
                    return y > 500;
                }
            };
            const result = runDuel(SniperAI, null, highGroundEnv, 5, 100, 200, 700, 500);
            expect(result).toBeGreaterThan(0);
        });

        it('Should succeed when path is blocked IF it can clear a path (personality constraint)', () => {
            const mountainEnv = {
                wind: 0,
                gravity: 0.1,
                checkTerrain: (x, y) => {
                    if (x < 300 || x > 500) return y > 500;
                    return y > 100; // Massive wall
                }
            };
            // Sniper will try to shoot through or clear the path. 
            // In our simulation, they might use 'default' or 'shovel' logic.
            const result = runDuel(SniperAI, null, mountainEnv, 5);
            expect(result).toBeGreaterThan(0);
        });
    });

    describe('LobberAI Performance', () => {
        it('Must always lob', () => {
            const lobber = new LobberAI();
            const source = createTank(100, 500);
            const target = createTarget(700, 500);
            const env = { wind: 0, gravity: 0.1 };
            
            const shot = lobber.calculateShot(source, target, env);
            const angleDeg = shot.angle * 180 / Math.PI;
            expect(angleDeg).toBeGreaterThanOrEqual(60);
        });

        it('Precision lobbing into a bucket', () => {
            const bucketEnv = {
                wind: 0,
                gravity: 0.1,
                checkTerrain: (x, y) => {
                    // A bucket at 700
                    if (x > 650 && x < 750) {
                        const isWall = (x < 670 || x > 730) && y > 400;
                        const isFloor = y > 550;
                        return isWall || isFloor;
                    }
                    return y > 600;
                }
            };
            const result = runDuel(LobberAI, null, bucketEnv, 10, 100, 600, 700, 500);
            expect(result).toBeGreaterThan(0);
        });
    });
});
