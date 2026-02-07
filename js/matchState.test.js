import { describe, it, expect } from 'vitest';
import { state } from './gameContext.js';

describe('Match State Model Extension', () => {
    it('should have totalGames property', () => {
        expect(state).toHaveProperty('totalGames');
    });

    it('should have currentGameIndex property', () => {
        expect(state).toHaveProperty('currentGameIndex');
    });

    it('should have winCondition property', () => {
        expect(state).toHaveProperty('winCondition');
    });

    it('should have startingCash property', () => {
        expect(state).toHaveProperty('startingCash');
    });

    it('should have playerRosterConfig property', () => {
        expect(state).toHaveProperty('playerRosterConfig');
    });
});
