import { describe, it, expect } from 'vitest';
import { selectRandomEdgeBehavior } from './utils.js';

describe('Utils', () => {
    describe('selectRandomEdgeBehavior', () => {
        it('should return one of the valid edge behaviors (impact, reflect, teleport)', () => {
            const validOptions = ['impact', 'reflect', 'teleport'];
            for (let i = 0; i < 100; i++) {
                const behavior = selectRandomEdgeBehavior();
                expect(validOptions).toContain(behavior);
            }
        });

        it('should not return random', () => {
            for (let i = 0; i < 100; i++) {
                const behavior = selectRandomEdgeBehavior();
                expect(behavior).not.toBe('random');
            }
        });
    });
});
