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
        // Fill a small area
        for (let y = 10; y < 20; y++) {
            for (let x = 10; x < 20; x++) {
                terrain.setSolid(x, y, true);
            }
        }
        
        expect(terrain.isSolid(15, 15)).toBe(true);
        
        terrain.explode(15, 15, 3);
        
        expect(terrain.isSolid(15, 15)).toBe(false);
        expect(terrain.isSolid(12, 15)).toBe(false);
        expect(terrain.isSolid(18, 15)).toBe(false); // Outside radius 3
        
        // Check boundary
        // Distance from (15,15) to (18,15) is 3. 
        // If radius is 3, (18,15) might be cleared depending on <= or <.
    });
});
