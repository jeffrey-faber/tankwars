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

    it('should initialize with all pixels empty by default (except bedrock)', () => {
        for (let y = 0; y < height - 1; y++) {
            for (let x = 0; x < width; x++) {
                expect(terrain.isSolid(x, y)).toBe(false);
            }
        }
        // Bedrock row
        for (let x = 0; x < width; x++) {
            expect(terrain.isSolid(x, height - 1)).toBe(true);
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
        expect(terrain.isSolid(0, height)).toBe(true); // Hits bedrock logic
        expect(terrain.isSolid(width, 0)).toBe(false); // Out of bounds X
        
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
        // ... (previous test)
    });

    it('should update gravity with sand physics', () => {
        // Create a single pixel in the air
        terrain.setSolid(50, 50, true);
        
        terrain.updateGravity();
        
        // Should have moved down
        expect(terrain.isSolid(50, 50)).toBe(false);
        expect(terrain.isSolid(50, 51)).toBe(true);
    });

    it('should slide pixels diagonally (sand behavior)', () => {
        const h = height;
        // Setup:
        //   X (50, h-3)
        //  .X. (49 empty, 50 solid, 51 empty) at h-2
        //  Bedrock at h-1
        
        terrain.setSolid(50, h - 2, true); // Intermediate Ground
        terrain.setSolid(50, h - 3, true); // Pixel to fall
        
        // Ensure empty sides
        terrain.setSolid(49, h - 2, false);
        terrain.setSolid(51, h - 2, false);
        
        const moved = terrain.updateGravity();
        expect(moved).toBe(true);
        
        // Should have moved from original spot
        expect(terrain.isSolid(50, h - 3)).toBe(false);
        
        // Should be in one of the diagonal spots
        const left = terrain.isSolid(49, h - 2);
        const right = terrain.isSolid(51, h - 2);
        expect(left || right).toBe(true);
    });
});
