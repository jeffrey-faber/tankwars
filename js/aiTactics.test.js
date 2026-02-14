import { describe, it, expect } from 'vitest';
import { detectClumping } from './aiControllers.js';

describe('AI Tactics - detectClumping', () => {
    it('should return true if 2 or more enemies are within 100px of target', () => {
        const target = { x: 200, y: 300, width: 20, height: 10 };
        const otherTanks = [
            { x: 250, y: 300, width: 20, height: 10, alive: true }, // ~50px away
            { x: 150, y: 300, width: 20, height: 10, alive: true }, // ~50px away
            { x: 500, y: 300, width: 20, height: 10, alive: true }  // far away
        ];
        
        // target + 2 others = clump of 3
        expect(detectClumping(target, otherTanks)).toBe(true);
    });

    it('should return false if only 1 enemy is within 100px of target', () => {
        const target = { x: 200, y: 300, width: 20, height: 10 };
        const otherTanks = [
            { x: 250, y: 300, width: 20, height: 10, alive: true }, // ~50px away
            { x: 500, y: 300, width: 20, height: 10, alive: true }  // far away
        ];
        
        // target + 1 other = 2 tanks total, but clump requires 3+ total (target + 2 others)
        // Wait, the spec says ">= 2 enemies are within 100px of the target".
        // That means target + 2 others = 3 tanks.
        expect(detectClumping(target, otherTanks)).toBe(false);
    });

    it('should ignore dead tanks', () => {
        const target = { x: 200, y: 300, width: 20, height: 10 };
        const otherTanks = [
            { x: 250, y: 300, width: 20, height: 10, alive: false },
            { x: 150, y: 300, width: 20, height: 10, alive: true },
            { x: 210, y: 300, width: 20, height: 10, alive: true }
        ];
        
        // 2 alive nearby + target = 3 total. 
        // But the dead one should be ignored.
        // Wait, let's re-read: ">= 2 enemies are within 100px of the target".
        // otherTanks[1] and otherTanks[2] are enemies near target.
        expect(detectClumping(target, otherTanks)).toBe(true);
    });
});
