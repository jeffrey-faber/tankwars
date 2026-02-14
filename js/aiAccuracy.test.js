
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
    let x = source.x + source.width / 2 + barrelLength * Math.cos(shot.angle);
    let y = source.y - source.height - barrelLength * Math.sin(shot.angle);
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
        
        if (y > 1500) return { hit: false, x, y };
    }
    return { hit: false, x, y };
}

function runDuel(controllerClass, difficulty, env, maxShots = 5, startX = 100, targetX = 700) {
    const ai = new controllerClass(difficulty);
    const source = createTank(startX, 500);
    const target = createTarget(targetX, 500); 
    
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
    it('Mastermind: Calm Weather (Standard)', () => {
        const result = runDuel(MastermindAI, null, { wind: 0, gravity: 0.1 });
        expect(result).toBeGreaterThan(0);
        expect(result).toBeLessThanOrEqual(3);
    });

    it('Mastermind: Strong Wind', () => {
        const result = runDuel(MastermindAI, null, { wind: 0.15, gravity: 0.1 });
        expect(result).toBeGreaterThan(0);
        expect(result).toBeLessThanOrEqual(5);
    });

    it('Mastermind: Over a Mountain', () => {
        const mountainEnv = {
            wind: 0,
            gravity: 0.1,
            checkTerrain: (x, y) => {
                if (x < 300 || x > 500) return false;
                let surfaceY = (x < 400) ? 500 - (x - 300) * 3 : 200 + (x - 400) * 3;
                return y > surfaceY; 
            }
        };
        const result = runDuel(MastermindAI, null, mountainEnv, 5);
        expect(result).toBeGreaterThan(0);
    });

    it('Mastermind: Into a Pit', () => {
        const pitEnv = {
            wind: 0,
            gravity: 0.1,
            checkTerrain: (x, y) => {
                // Pit from 600 to 800
                if (x >= 600 && x <= 800) return y > 800; // Deep pit
                return y > 500;
            }
        };
        // Target is at bottom of pit
        const source = createTank(100, 500);
        const target = createTarget(700, 750); 
        const ai = new MastermindAI();
        ai.chooseTarget(source, [target]);

        let hit = false;
        for(let i=0; i<5; i++) {
            const shot = ai.calculateShot(source, target, pitEnv);
            const res = simulateShot(shot, source, target, pitEnv);
            if (res.hit) { hit = true; break; }
            ai.onShotResult(target, res.x, res.y);
            ai.recordShot(target);
        }
        expect(hit).toBe(true);
    });

    it('Mastermind: High Cliff', () => {
        const cliffEnv = {
            wind: 0,
            gravity: 0.1,
            checkTerrain: (x, y) => {
                if (x < 400) return y > 500; // Low ground
                return y > 200; // High cliff starting at 400
            }
        };
        // Source is at 100, 500. Target is at 700, 200 (on cliff).
        const source = createTank(100, 500);
        const target = createTarget(700, 200);
        const ai = new MastermindAI();
        ai.chooseTarget(source, [target]);

        let hit = false;
        for(let i=0; i<5; i++) {
            const shot = ai.calculateShot(source, target, cliffEnv);
            const res = simulateShot(shot, source, target, cliffEnv);
            if (res.hit) { hit = true; break; }
            ai.onShotResult(target, res.x, res.y);
            ai.recordShot(target);
        }
        expect(hit).toBe(true);
    });

    it('Mastermind: Under a Ceiling (Tunnel)', () => {
        const tunnelEnv = {
            wind: 0,
            gravity: 0.1,
            checkTerrain: (x, y) => {
                const isGround = y > 500;
                const isCeiling = y < 300 && x > 200 && x < 600;
                return isGround || isCeiling;
            }
        };
        // Must fire a low-power, low-angle shot to stay under the ceiling
        const result = runDuel(MastermindAI, null, tunnelEnv, 5);
        expect(result).toBeGreaterThan(0);
    });

    it('Sniper: Must fire direct shots even if blocked', () => {
        const hillEnv = {
            wind: 0,
            gravity: 0.1,
            checkTerrain: (x, y) => {
                // Small hill in middle
                if (x < 350 || x > 450) return false;
                return y > 450; 
            }
        };
        const result = runDuel(SniperAI, null, hillEnv, 5, 100, 700);
        expect(result).toBeGreaterThan(0);
    });

    it('Lobber: Must always lob', () => {
        const lobber = new LobberAI();
        const source = createTank(100, 500);
        const target = createTarget(700, 500);
        const env = { wind: 0, gravity: 0.1 };
        
        const shot = lobber.calculateShot(source, target, env);
        const angleDeg = shot.angle * 180 / Math.PI;
        // Should be high angle (>= 60)
        expect(angleDeg).toBeGreaterThanOrEqual(60);
    });
});
