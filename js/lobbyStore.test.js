import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state } from './gameContext.js';
import { Store } from './store.js';
import './main.js';

describe('Lobby Store UI', () => {
    let store;

    beforeEach(() => {
        // Reset state
        state.gameState = 'LOBBY';
        state.tanks = [{ isAI: false, alive: true, currency: 100 }];
        state.currentPlayer = 0;
        
        // Mock DOM
        document.body.innerHTML = '<div id="gameCanvas"></div>';
        
        store = new Store();
        store.init(state.tanks);
    });

    it('should show the store button in LOBBY state', () => {
        const storeButton = document.getElementById('storeButton');
        expect(storeButton).not.toBeNull();
        // We need to implement the logic that hides/shows it
    });

    it('should hide the store button when state is PLAYING', () => {
        state.gameState = 'PLAYING';
        store.updateVisibility();
        
        const storeButton = document.getElementById('storeButton');
        expect(storeButton.style.display).toBe('none');
    });

    it('should allow buying multiple items of the same type', () => {
        const tank = state.tanks[0];
        tank.currency = 200;
        
        store.currentTank = tank;
        store.buyItem('nuke');
        store.buyItem('nuke');
        
        const nukes = tank.inventory.filter(i => i.id === 'nuke');
        expect(nukes.length).toBe(2);
        expect(tank.currency).toBe(200 - (store.items.find(i => i.id === 'nuke').price * 2));
    });

    it('should trigger useItem on numeric key 1', () => {
        const tank = state.tanks[0];
        tank.inventory = [{ id: 'nuke', effect: { type: 'weapon' } }];
        tank.useItem = vi.fn();
        state.gameState = 'PLAYING';
        state.store = store; // main.js uses state.store
        
        const event = { key: '1' };
        document.dispatchEvent(event);
        
        expect(tank.useItem).toHaveBeenCalledWith('nuke');
    });

    it('should select default weapon on key 0', () => {
        const tank = state.tanks[0];
        tank.selectedWeapon = 'nuke';
        state.gameState = 'PLAYING';
        state.store = store;
        
        const event = { key: '0' };
        document.dispatchEvent(event);
        
        expect(tank.selectedWeapon).toBe('default');
    });

    it('should ignore hotkeys in LOBBY state', () => {
        const tank = state.tanks[0];
        tank.inventory = [{ id: 'nuke', effect: { type: 'weapon' } }];
        tank.useItem = vi.fn();
        state.gameState = 'LOBBY';
        state.store = store;
        
        const event = { key: '1' };
        document.dispatchEvent(event);
        
        expect(tank.useItem).not.toHaveBeenCalled();
    });

    it('should refresh weapon selector when starting match', () => {
        const tank = state.tanks[0];
        store.updateWeaponSelector = vi.fn();
        
        // Find start button (created in init)
        // We need to query document body because it's appended there
        const startButton = document.getElementById('startMatchButton');
        expect(startButton).toBeTruthy();
        
        // Click it
        startButton.click();
        
        expect(state.gameState).toBe('PLAYING');
        expect(store.updateWeaponSelector).toHaveBeenCalledWith(tank);
    });
});
