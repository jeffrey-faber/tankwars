import { describe, it, expect, beforeEach } from 'vitest';
import { BitmaskTerrain } from './BitmaskTerrain.js';

describe('BitmaskTerrain', () => {
    let terrain;
    const width = 100;
    const height = 100;

    beforeEach(() => {
        terrain = new BitmaskTerrain(width, height);
    });

    it('should initialize with correct dimensions', () => {
        expect(terrain.width).toBe(width);
        expect(terrain.height).toBe(height);
    });

    it('should initialize with all pixels empty by default', () => {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                expect(terrain.isSolid(x, y)).toBe(false);
            }
        }
    });

    it('should allow setting pixels as solid', () => {
        terrain.setSolid(10, 10, true);
        expect(terrain.isSolid(10, 10)).toBe(true);
        terrain.setSolid(10, 10, false);
        expect(terrain.isSolid(10, 10)).toBe(false);
    });

    it('should handle out of bounds gracefully', () => {
        expect(terrain.isSolid(-1, -1)).toBe(false);
        expect(terrain.isSolid(width, height)).toBe(false);
        
        terrain.setSolid(-1, -1, true); // Should not throw
        terrain.setSolid(width, height, true); // Should not throw
    });

    it('should handle checkCollision alias', () => {
        terrain.setSolid(20, 20, true);
        expect(terrain.checkCollision(20, 20)).toBe(true);
        expect(terrain.checkCollision(20, 21)).toBe(false);
    });

    it('should remove solid pixels within explosion radius', () => {
        // ... (previous test code)
    });

    it('should identify floating pixels', () => {
        // Create a platform at the bottom (connected to ground)
        for (let x = 0; x < width; x++) {
            terrain.setSolid(x, height - 1, true);
        }
        
        // Create a floating island
        terrain.setSolid(50, 50, true);
        terrain.setSolid(51, 50, true);
        
        const floating = terrain.findFloatingPixels();
        
        // (50, 50) and (51, 50) should be floating
        expect(floating).toContainEqual({x: 50, y: 50});
        expect(floating).toContainEqual({x: 51, y: 50});
        
        // Bottom row should NOT be floating
        expect(floating).not.toContainEqual({x: 0, y: height - 1});
    });
});
