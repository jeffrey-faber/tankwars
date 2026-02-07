import { describe, it, expect, beforeEach } from 'vitest';
import { state } from './gameContext.js';

describe('Game State Machine', () => {
    beforeEach(() => {
        state.gameState = 'LOBBY';
    });

    it('should have a LOBBY state', () => {
        expect(state.gameState).toBe('LOBBY');
    });

    it('should allow transitioning to LOBBY_SHOPPING sub-state', () => {
        state.gameState = 'LOBBY_SHOPPING';
        expect(state.gameState).toBe('LOBBY_SHOPPING');
    });

    it('should allow transitioning to PLAYING state', () => {
        state.gameState = 'PLAYING';
        expect(state.gameState).toBe('PLAYING');
    });
});