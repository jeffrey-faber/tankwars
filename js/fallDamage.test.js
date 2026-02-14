
import { describe, it, expect, beforeEach } from 'vitest';
import { Tank } from './tank.js';

describe('Fall Damage Logic', () => {
    let tank;

    beforeEach(() => {
        // Mock tank initialization if necessary
        tank = new Tank(100, 100, 'Player 1', 'red');
    });

    it('should have fall damage constants defined', () => {
        // These might be on the Tank class or a global constants object
        // Assuming Tank static properties or instance properties for now
        expect(tank.safeFallHeight).toBeDefined();
        expect(tank.fallDamageMultiplier).toBeDefined();
    });

    it('should track lastSolidY', () => {
        tank.y = 100;
        tank.updateFallTracking(true); // Is on ground
        expect(tank.lastSolidY).toBe(100);
        
        tank.y = 150;
        tank.updateFallTracking(false); // In air
        expect(tank.lastSolidY).toBe(100); // Should remain the last solid ground
    });

    it('should apply damage after a long fall', () => {
        // Fall 100px (Safe is 40px). Damage = (100 - 40) * 1.5 = 90
        tank.y = 100;
        tank.updateFallTracking(true); // Ground at 100
        
        tank.y = 200; // Land at 200
        tank.handleLanding(200); // We'll need this method
        
        expect(tank.health).toBe(tank.maxHealth - 90);
    });

    it('should not apply damage for short falls', () => {
        // Fall 20px (Safe is 50px). Damage = 0
        tank.y = 100;
        tank.updateFallTracking(true); 
        
        tank.y = 120;
        tank.handleLanding(120);
        
        expect(tank.health).toBe(tank.maxHealth);
    });

    it('should ignore damage if it is the initial spawn', () => {
        tank.isInitialSpawn = true;
        // Simulate falling from high up without having landed yet
        tank.lastSolidY = 0; 
        
        tank.y = 500; // Land after 500px fall
        tank.handleLanding(500);
        
        expect(tank.health).toBe(tank.maxHealth);
        expect(tank.isInitialSpawn).toBe(false); // Should clear flag after landing
    });
});
