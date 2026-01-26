import { describe, it, expect, beforeEach } from 'vitest';
import { state } from './gameContext.js';

describe('Game State Management', () => {
    it('should have a default gameState of LOBBY', () => {
        expect(state.gameState).toBe('LOBBY');
    });

    it('should allow transitioning from LOBBY to PLAYING', () => {
        state.gameState = 'LOBBY';
        state.gameState = 'PLAYING';
        expect(state.gameState).toBe('PLAYING');
    });
});
