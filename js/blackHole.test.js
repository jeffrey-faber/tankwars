import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state } from './gameContext.js';
import { Tank } from './tank.js';

describe('Black Hole Weapon Logic', () => {
    let tank;
    let target;

    beforeEach(() => {
        state.tanks = [];
        state.canvas = { width: 1200, height: 600 };
        state.terrain = {
            explode: vi.fn(),
            addTerrain: vi.fn(),
            updateCanvas: vi.fn()
        };
        tank = new Tank(100, 500, false, 0, 'Shooter');
        target = new Tank(200, 500, false, 0, 'Target');
        tank.alive = true;
        target.alive = true;
        state.tanks = [tank, target];
    });

    it('should pull nearby tanks towards the impact point', () => {
        const proj = {
            x: 150,
            y: 500,
            type: 'blackhole_s',
            explosionRadius: 100,
            sourcePlayerId: 0
        };
        
        // Add item to inventory so handleBlackHoleImpact can find it for pullStrength
        tank.inventory.push({
            id: 'blackhole_s',
            effect: { pullStrength: 10, size: 'small' }
        });

        const initialTargetX = target.x;
        tank.handleBlackHoleImpact(proj);
        
        // Target is at 200, impact is at 150. Target should be pulled left (x decreases).
        expect(target.x).toBeLessThan(initialTargetX);
    });

    it('should apply vertical velocity (throw effect)', () => {
        const proj = {
            x: 200,
            y: 400, // Above the target
            type: 'blackhole_m',
            explosionRadius: 150,
            sourcePlayerId: 0
        };
        
        tank.inventory.push({
            id: 'blackhole_m',
            effect: { pullStrength: 15, size: 'medium' }
        });

        tank.handleBlackHoleImpact(proj);
        
        // Impact is above target (400 vs 500). Target should have negative vy (moving up).
        expect(target.vy).toBeLessThan(0);
    });

    it('should apply horizontal momentum (vx)', () => {
        const proj = {
            x: 50, // Impact at 50
            y: 500,
            type: 'blackhole_s',
            explosionRadius: 500, // Large radius
            sourcePlayerId: 0
        };
        target.x = 200; // Target at 200
        target.alive = true;
        state.tanks = [tank, target];
        
        tank.inventory.push({ 
            id: 'blackhole_s', 
            effect: { pullStrength: 50, size: 'small' } 
        });

        tank.handleBlackHoleImpact(proj);
        
        // Target is at 200, impact is at 50. Pull direction is left.
        expect(target.vx).toBeLessThan(0);
    });

    it('should remove and add terrain for medium/large sizes', () => {
        const proj = {
            x: 150, y: 500, type: 'blackhole_l', explosionRadius: 100, sourcePlayerId: 0
        };
        tank.inventory.push({ id: 'blackhole_l', effect: { pullStrength: 25, size: 'large' } });

        tank.handleBlackHoleImpact(proj);

        expect(state.terrain.explode).toHaveBeenCalled();
        expect(state.terrain.addTerrain).toHaveBeenCalled();
    });

    it('should fire standard laser and remove terrain circle', () => {
        state.terrain.removeCircle = vi.fn();
        state.terrain.checkCollision = vi.fn().mockReturnValue(true);
        tank.inventory.push({ id: 'laser', effect: { radius: 4, damage: 35 } });
        tank.selectedWeapon = 'laser';
        tank.angle = 0; // Fire right
        tank.power = 50;
        
        tank.fireLaser('laser');
        
        expect(state.terrain.removeCircle).toHaveBeenCalled();
    });

    it('should fire heavy laser with increased radius', () => {
        state.terrain.removeCircle = vi.fn();
        state.terrain.checkCollision = vi.fn().mockReturnValue(true);
        tank.inventory.push({ id: 'laser_heavy', effect: { radius: 12, damage: 100 } });
        tank.selectedWeapon = 'laser_heavy';
        tank.angle = 0; 
        tank.power = 50;
        
        tank.fireLaser('laser_heavy');
        
        // Verify it uses the radius from the weapon profile
        expect(state.terrain.removeCircle).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 12);
    });
});
