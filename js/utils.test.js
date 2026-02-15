import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { selectRandomEdgeBehavior, isTouchDevice } from './utils.js';

describe('Utils', () => {
    describe('isTouchDevice', () => {
        beforeEach(() => {
            window.matchMedia = vi.fn();
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('should return true if matchMedia("(pointer: coarse)").matches is true', () => {
            window.matchMedia.mockReturnValue({
                matches: true,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            });
            expect(isTouchDevice()).toBe(true);
            expect(window.matchMedia).toHaveBeenCalledWith('(pointer: coarse)');
        });

        it('should return false if matchMedia("(pointer: coarse)").matches is false', () => {
            window.matchMedia.mockReturnValue({
                matches: false,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            });
            expect(isTouchDevice()).toBe(false);
        });

        it('should return false if matchMedia is not supported', () => {
            const originalMatchMedia = window.matchMedia;
            delete window.matchMedia;
            expect(isTouchDevice()).toBe(false);
            window.matchMedia = originalMatchMedia;
        });
    });

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
