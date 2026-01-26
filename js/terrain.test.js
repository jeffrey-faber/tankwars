import { Terrain } from './terrain';

describe('Terrain', () => {
    it('should remove terrain in a crater shape', () => {
        // 1. Setup
        const canvasWidth = 800;
        const canvasHeight = 600;
        const terrain = new Terrain(canvasWidth, canvasHeight, {
            variance: 0,
            baseHeight: 400,
            detail: 10
        });
        const initialPoints = [...terrain.points];

        // 2. Action
        const explosionX = 400;
        const explosionY = 400;
        const radius = 50;
        terrain.removeTerrain(explosionX, explosionY, radius);

        // 3. Assertion
        // Check that points within the crater radius have been modified or new points added
        const craterPoints = terrain.points.filter(p =>
            p.x >= explosionX - radius && p.x <= explosionX + radius
        );

        // Expect that some points have been affected
        expect(craterPoints.length).toBeGreaterThan(0);

        // Expect that the terrain is lower in the middle of the crater
        const centerPoint = craterPoints.find(p => p.x === explosionX);
        const edgePoint = initialPoints.find(p => p.x === explosionX - radius);

        const initialCenterPoint = initialPoints.find(p => p.x === explosionX);

        // We expect the new center point to be higher (lower on screen) than before
        if (centerPoint && initialCenterPoint) {
            expect(centerPoint.y).toBeGreaterThan(initialCenterPoint.y);
        }
    });
});
