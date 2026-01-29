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
        tank.applyGravity(terrain);
        
        // Should start falling (velocity increases)
        expect(tank.vy).toBeGreaterThan(0);
        expect(tank.y).toBeGreaterThan(100);
    });

    it('should stop falling when hitting terrain', () => {
        // Create ground at y=200
        for (let x = 0; x < 800; x++) {
            terrain.setSolid(x, 200, true);
        }
        
        // Drop from slightly above
        tank.y = 199;
        tank.vy = 2; // Moving down
        
        tank.applyGravity(terrain);
        
        // Should land near 200 (199 is empty, 200 is solid).
        // checkY = 199 + 2 + gravity = ~201.
        // isSolid(201) -> true.
        // Moves up to empty space. 199.
        
        // Wait, if it lands, vy should be 0.
        // And y should be <= 199.
        // vy will be 0.1 because gravity is added at start of frame
        
        expect(tank.vy).toBeLessThan(0.2);
        expect(tank.y).toBeLessThanOrEqual(200);
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
