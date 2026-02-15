import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Tank } from './tank.js';
import { BitmaskTerrain } from './BitmaskTerrain.js';
import { state } from './gameContext.js';

describe('Tank', () => {
    let tank;
    let terrain;

    beforeEach(() => {
        // Reset state
        state.canvas = { width: 800, height: 600 };
        
        // Mock canvas context
        const mockCtx = {
            clearRect: vi.fn(),
            createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(800 * 600 * 4) })),
            putImageData: vi.fn(),
            drawImage: vi.fn(),
        };

        global.document = {
            createElement: vi.fn(() => ({
                getContext: vi.fn(() => mockCtx),
                width: 800,
                height: 600
            }))
        };
        
        global.window = {
            canvas: { width: 800, height: 600 },
            ctx: mockCtx,
        };

        tank = new Tank(100, 100);
        terrain = new BitmaskTerrain(800, 600);
    });

    it('should fall if terrain below is empty', () => {
        // Terrain is empty by default
        tank.y = 100;
        
        // Simulate multiple frames until it reaches bottom
        for(let i = 0; i < 200; i++) {
            tank.applyGravity(terrain);
        }
        
        // Should fall to bottom (minus height)
        expect(tank.y).toBe(600 - tank.height - 5);
    });

    it('should stop falling when hitting terrain', () => {
        // Create ground at y=200
        for (let x = 0; x < 800; x++) {
            // Need 6 layers for "stable ground" logic (checks 5 down)
            for (let dy = 0; dy <= 5; dy++) {
                terrain.setSolid(x, 200 + dy, true);
            }
        }
        
        tank.y = 100;
        // Simulate multiple frames
        for(let i = 0; i < 100; i++) {
            tank.applyGravity(terrain);
        }
        
        // Should land on 200
        expect(tank.y).toBe(200);
    });

    it('should detect when buried', () => {
        // Create ground at 200
        for (let x = 0; x < 800; x++) {
            terrain.setSolid(x, 200, true);
        }
        tank.y = 200;
        
        // Create "dirt" above the tank center (x + width/2 = 100 + 10 = 110)
        terrain.setSolid(110, 180, true);
        
        tank.checkBuried(terrain);
        expect(tank.isBuried).toBe(true);
    });

    it('should not be buried if air is above', () => {
        tank.y = 200;
        terrain.setSolid(110, 201, true); // Ground below
        
        tank.checkBuried(terrain);
        expect(tank.isBuried).toBe(false);
    });
});
