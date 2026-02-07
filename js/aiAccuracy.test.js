import { describe, it, expect } from 'vitest';
import { MastermindAI, StandardAI } from './aiControllers.js';

// Mock tank for simulation
const createTank = (x, y) => ({ x, y, width: 20, height: 10, name: 'Shooter', isAI: true });
const createTarget = (x, y) => ({ x, y, width: 20, height: 10, name: 'Target', alive: true });

// Physics constants from main.js
const PHYSICS = {
    gravity: 0.1,
    scale: 0.2
};

// Simulate a shot to see if it hits
function simulateShot(shot, source, target, env) {
    let x = source.x + source.width / 2;
    let y = source.y - source.height;
    let vx = shot.power * Math.cos(shot.angle) * PHYSICS.scale;
    let vy = -shot.power * Math.sin(shot.angle) * PHYSICS.scale;
    
    const tx = target.x + target.width / 2;
    const ty = target.y - target.height / 2;
    const radius = 30; 

    for (let t = 0; t < 1000; t++) {
        vy += PHYSICS.gravity;
        vx += env.wind;
        x += vx;
        y += vy;

        if (env.checkTerrain && env.checkTerrain(x, y)) {
            return { hit: false, x, y, hitTerrain: true };
        }

        const dist = Math.sqrt((x - tx)**2 + (y - ty)**2);
        if (dist <= radius) return { hit: true, x, y };
        
        if (y > 1000) return { hit: false, x, y };
    }
    return { hit: false, x, y };
}

describe('AI Accuracy Benchmark', () => {
    
    // Helper to run a "match"
    function runDuel(controllerClass, difficulty, env, maxShots = 5) {
        const ai = new controllerClass(difficulty);
        const source = createTank(100, 500);
        const target = createTarget(700, 500); // 600px away
        
        // Mock target selection
        ai.chooseTarget(source, [target]);

        for (let i = 1; i <= maxShots; i++) {
            const shot = ai.calculateShot(source, target, env);
            const result = simulateShot(shot, source, target, env);
            
            if (result.hit) return i; // Hit on shot i
            
            // Feed back result
            ai.recordShot(target);
            ai.onShotResult(target, result.x, result.y);
        }
        return -1; // Failed
    }

    it('Mastermind should hit static target in calm weather within 3 shots', () => {
        const shots = runDuel(MastermindAI, null, { wind: 0, gravity: 0.1 });
        expect(shots).toBeGreaterThan(0);
        expect(shots).toBeLessThanOrEqual(3);
    });

    it('Mastermind should hit static target in strong wind within 5 shots', () => {
        const shots = runDuel(MastermindAI, null, { wind: 0.1, gravity: 0.1 });
        expect(shots).toBeGreaterThan(0);
        expect(shots).toBeLessThanOrEqual(5);
    });

    it('Mastermind should hit over a mountain within 5 shots', () => {
        const mountainEnv = {
            wind: 0,
            gravity: 0.1,
            checkTerrain: (x, y) => {
                // Peak at x=400, y=200 (ground is 500)
                if (x < 300 || x > 500) return false;
                
                let surfaceY;
                if (x < 400) surfaceY = 500 - (x - 300) * 3;
                else surfaceY = 200 + (x - 400) * 3;
                
                return y > surfaceY; 
            }
        };
        
        const shots = runDuel(MastermindAI, null, mountainEnv, 5);
        expect(shots).toBeGreaterThan(0);
        expect(shots).toBeLessThanOrEqual(5);
    });
});