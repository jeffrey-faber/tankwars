import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state } from './gameContext.js';
import { Store } from './store.js';

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
});
