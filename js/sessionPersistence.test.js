import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Tank } from './tank.js';

describe('Session Persistence', () => {
    let tanks;
    let canvas;

    beforeEach(() => {
        canvas = { width: 800, height: 600 };
        tanks = [
            new Tank(100, 100, false, 0, 'Player 1'),
            new Tank(200, 100, false, 0, 'Player 2')
        ];
        
        // Mock window properties if needed
        global.window = {
            canvas: canvas
        };
    });

    it('should persist currency and inventory after a simulated round reset', () => {
        const player = tanks[0];
        
        // Initial state
        expect(player.currency).toBe(100);
        expect(player.inventory.length).toBe(0);
        
        // Modify state (simulate buying something)
        player.currency = 50;
        player.inventory.push({ id: 'nuke', name: 'Nuke' });
        
        // Simulate resetRound logic (simplified from main.js)
        const resetRound = (tanksToReset) => {
            const newPositions = [{x: 150, y: 150}, {x: 250, y: 150}];
            tanksToReset.forEach((tank, i) => {
                tank.x = newPositions[i].x;
                tank.y = newPositions[i].y;
                tank.angle = Math.PI / 4;
                tank.power = 50;
                tank.alive = true;
                tank.health = tank.maxHealth;
                tank.shielded = false;
                tank.selectedWeapon = 'default';
            });
        };
        
        resetRound(tanks);
        
        // Verify persistence
        expect(player.currency).toBe(50);
        expect(player.inventory.length).toBe(1);
        expect(player.inventory[0].id).toBe('nuke');
    });

    it('should NOT persist health and position after a simulated round reset', () => {
        const player = tanks[0];
        player.health = 10;
        player.x = 999;
        
        const resetRound = (tanksToReset) => {
            const newPositions = [{x: 150, y: 150}, {x: 250, y: 150}];
            tanksToReset.forEach((tank, i) => {
                tank.x = newPositions[i].x;
                tank.y = newPositions[i].y;
                tank.alive = true;
                tank.health = tank.maxHealth;
            });
        };
        
        resetRound(tanks);
        
        expect(player.health).toBe(100);
        expect(player.x).toBe(150);
    });
});
