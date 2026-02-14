import { describe, it, expect, beforeEach } from 'vitest';
import { Store } from './store.js';

describe('Store Purchase Logic', () => {
    let store;
    let tank;

    beforeEach(() => {
        store = new Store();
        tank = {
            name: 'Test Tank',
            currency: 1000,
            inventory: [],
            health: 50,
            maxHealth: 100,
            shielded: false
        };
        store.currentTank = tank;
    });

    it('should increment inventory for non-healing items', () => {
        store.buyItem('mega_nuke');
        expect(tank.inventory.length).toBe(1);
        expect(tank.inventory[0].id).toBe('mega_nuke');
        expect(tank.currency).toBe(500);
    });

    it('should NOT increment inventory for healing items (used immediately)', () => {
        store.buyItem('health');
        expect(tank.inventory.length).toBe(0);
        expect(tank.health).toBe(100);
        expect(tank.currency).toBe(975);
    });

    it('should increment inventory for shields', () => {
        store.buyItem('shield');
        expect(tank.inventory.length).toBe(1);
        expect(tank.inventory[0].id).toBe('shield');
        expect(tank.currency).toBe(900);
    });
});