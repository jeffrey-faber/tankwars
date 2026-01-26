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
});
