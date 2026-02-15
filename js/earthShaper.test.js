
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BitmaskTerrain } from './BitmaskTerrain.js';
import { Tank } from './tank.js';

// Mock DOM since BitmaskTerrain creates a canvas
if (typeof document === 'undefined') {
    global.document = {
        createElement: () => ({
            getContext: () => ({
                clearRect: vi.fn(),
                createImageData: () => ({ data: new Uint8ClampedArray(400 * 400 * 4) }),
                putImageData: vi.fn()
            }),
            width: 400,
            height: 400
        })
    };
}

describe('Earth Shaper Mechanics', () => {
    let terrain;

    beforeEach(() => {
        terrain = new BitmaskTerrain(400, 400);
    });

    it('should add terrain in a cluster', () => {
        // Impact at 200, 200 with radius 10
        terrain.addTerrain(200, 200, 10);
        
        expect(terrain.isSolid(200, 200)).toBe(true);
        expect(terrain.isSolid(200, 210)).toBe(true);
        expect(terrain.isSolid(200, 211)).toBe(false); // Outside radius
    });

    it('should encase a tank if hit directly', () => {
        const tank = new Tank(190, 200, false, 0, 'Target');
        // Tank is at 190, 200. Width 20, height 10.
        // Bounds: x=[190, 210], y=[190, 200]
        
        // We'll need to mock some state for actual weapon firing,
        // but let's test the logical consequence first.
        
        // Simulate Dirt Ball impact at tank center
        const impactX = 200;
        const impactY = 195;
        const radius = 15;
        
        terrain.addTerrain(impactX, impactY, radius);
        
        // Check if tank center is now solid (buried)
        expect(terrain.isSolid(200, 195)).toBe(true);
        
        // Check tank property (we'll need to implement this check in game loop)
        tank.checkBuried(terrain);
        expect(tank.isBuried).toBe(true);
    });

    it('should remove terrain in a cone', () => {
        // Fill a block
        for(let x=100; x<200; x++) {
            for(let y=100; y<200; y++) {
                terrain.setSolid(x, y, true);
            }
        }
        
        // Remove cone at 150, 150, pointing Up (PI/2), spread PI/2 (90 deg)
        terrain.removeTerrainCone(150, 150, 20, Math.PI/2, Math.PI/2);
        
        // Point directly above should be gone
        expect(terrain.isSolid(150, 131)).toBe(false);
        // Point far below should still be there
        expect(terrain.isSolid(150, 169)).toBe(true);
    });
});
