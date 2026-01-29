import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Tank } from './tank.js';
import { BitmaskTerrain } from './BitmaskTerrain.js';
import { state } from './gameContext.js';

describe('Gravity Integration', () => {
    let tank;
    let terrain;

    beforeEach(() => {
        state.canvas = { width: 800, height: 600 };
        const mockCtx = {
            clearRect: vi.fn(),
            createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(800 * 600 * 4) })),
            putImageData: vi.fn(),
            drawImage: vi.fn(),
        };
        state.ctx = mockCtx;

        tank = new Tank(100, 0); // Start at top
        terrain = new BitmaskTerrain(800, 600);
        state.terrain = terrain;
    });

    it('should fall from sky to ground', () => {
        // Create ground at y=300
        const points = [{x: 0, y: 300}, {x: 800, y: 300}];
        terrain.bakeHeightmap(points);
        
        // Simulate falling
        for (let i = 0; i < 100; i++) {
            tank.applyGravity(terrain);
        }
        
        // Tank should be near 300 (e.g. 299 or 300)
        expect(Math.abs(tank.y - 299)).toBeLessThan(2);
        expect(tank.vy).toBeLessThan(0.5);
    });

    it('should stay on ground if placed on ground', () => {
        const points = [{x: 0, y: 300}, {x: 800, y: 300}];
        terrain.bakeHeightmap(points);
        
        tank.y = 299; // Sit on top
        tank.applyGravity(terrain);
        
        expect(Math.abs(tank.y - 299)).toBeLessThan(1);
        expect(tank.vy).toBeLessThan(0.5);
    });
});
