import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state, startTurn } from './gameContext.js';

describe('Sudden Death Logic', () => {
    beforeEach(() => {
        // Reset state
        state.suddenDeath = {
            active: false,
            type: 'health_decay',
            startTurn: 2,
            currentTurnCount: 0,
            nukeScale: 1.0,
            teleportFocus: 0.0
        };
        state.tanks = [
            { alive: true, health: 100, maxHealth: 100, die: vi.fn(), x: 100, width: 20, y: 500, height: 10 },
            { alive: true, health: 100, maxHealth: 100, die: vi.fn(), x: 500, width: 20, y: 500, height: 10 }
        ];
    });

    it('should increment turn count and activate after startTurn', () => {
        expect(state.suddenDeath.active).toBe(false);
        
        startTurn(0); // Turn 1
        expect(state.suddenDeath.currentTurnCount).toBe(1);
        expect(state.suddenDeath.active).toBe(false);
        
        startTurn(1); // Turn 2
        expect(state.suddenDeath.currentTurnCount).toBe(2);
        expect(state.suddenDeath.active).toBe(true);
        expect(state.suddenDeath.activeType).toBe('health_decay');
    });

    it('should apply health decay every turn after activation', () => {
        state.suddenDeath.type = 'health_decay';
        state.suddenDeath.startTurn = 1;
        
        startTurn(0); // Activates and applies first decay
        expect(state.suddenDeath.active).toBe(true);
        expect(state.tanks[0].health).toBe(90);
        expect(state.tanks[1].health).toBe(90);
        
        startTurn(1); // Second turn
        expect(state.tanks[0].health).toBe(80);
        expect(state.tanks[1].health).toBe(80);
    });

    it('should increment nuke scale in nuke_growth mode', () => {
        state.suddenDeath.type = 'nuke_growth';
        state.suddenDeath.startTurn = 1;
        
        startTurn(0);
        expect(state.suddenDeath.nukeScale).toBeGreaterThan(1.0);
        const firstScale = state.suddenDeath.nukeScale;
        
        startTurn(1);
        expect(state.suddenDeath.nukeScale).toBeGreaterThan(firstScale);
    });
});
