import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Tank } from './tank.js';
import { Store } from './store.js';
import { state } from './gameContext.js';

describe('Weapon Rebalance and Store Updates', () => {
    let tank;
    let store;

    beforeEach(() => {
        // Mock canvas context
        const mockCtx = {
            save: vi.fn(),
            restore: vi.fn(),
            translate: vi.fn(),
            clearRect: vi.fn(),
            beginPath: vi.fn(),
            arc: vi.fn(),
            fill: vi.fn(),
            stroke: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            fillRect: vi.fn(),
            fillText: vi.fn(),
            font: '',
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 1
        };

        state.ctx = mockCtx;
        state.canvas = { width: 800, height: 600 };
        state.tanks = [];
        state.projectiles = [];
        state.terrain = { 
            draw: vi.fn(),
            checkCollision: vi.fn(() => false)
        };
        
        tank = new Tank(100, 100);
        state.tanks.push(tank);
        store = new Store();
        store.currentTank = tank;
    });

    it('should have reduced default weapon radius (15)', () => {
        tank.selectedWeapon = 'default';
        // Mock fire to see what it sets in state.projectiles
        tank.fire();
        expect(state.projectiles[0].explosionRadius).toBe(15);
    });

    it('should have heavy weapon with radius 30 and damage 60', () => {
        // First we need to buy it or add to inventory
        tank.inventory.push({ id: 'heavy', effect: { type: 'weapon', radius: 30, damage: 60 } });
        tank.selectedWeapon = 'heavy';
        tank.fire();
        expect(state.projectiles[0].explosionRadius).toBe(30);
        expect(state.projectiles[0].damage).toBe(60);
    });

    it('should have mega_nuke with radius 150 and damage 200', () => {
        tank.inventory.push({ id: 'mega_nuke', effect: { type: 'weapon', radius: 150, damage: 200 } });
        tank.selectedWeapon = 'mega_nuke';
        tank.fire();
        expect(state.projectiles[0].explosionRadius).toBe(150);
        expect(state.projectiles[0].damage).toBe(200);
    });

    it('should buy heavy weapon in pack of 5', () => {
        tank.currency = 100;
        store.buyItem('heavy');
        expect(tank.inventory.length).toBe(5);
        expect(tank.currency).toBe(50);
    });

    it('should buy cluster_bomb in pack of 3', () => {
        tank.currency = 200;
        store.buyItem('cluster_bomb');
        expect(tank.inventory.length).toBe(3);
        expect(tank.currency).toBe(50);
    });
});
