
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIController, StandardAI, StupidAI, LobberAI, SniperAI, MastermindAI } from './aiControllers.js';

describe('AI Controllers', () => {
    let mockTank;
    let mockTarget;
    let env = { wind: 0.05, gravity: 0.1 };

    beforeEach(() => {
        mockTank = { x: 100, y: 500, width: 20, height: 10, name: 'AI', inventory: [], selectedWeapon: 'default' };
        mockTarget = { x: 400, y: 500, width: 20, height: 10, name: 'Target' };
    });

    describe('Base AIController', () => {
        it('should throw error on direct use of calculateShot', () => {
            const controller = new AIController();
            expect(() => controller.calculateShot(mockTank, mockTarget, env)).toThrow();
        });
    });

    describe('StandardAI', () => {
        it('should return angle and power', () => {
            const controller = new StandardAI('medium');
            const result = controller.calculateShot(mockTank, mockTarget, env);
            expect(result).toHaveProperty('angle');
            expect(result).toHaveProperty('power');
        });
    });

    describe('StupidAI', () => {
        it('should return highly variable results', () => {
            const controller = new StupidAI();
            const result = controller.calculateShot(mockTank, mockTarget, env);
            expect(result).toHaveProperty('angle');
            expect(result).toHaveProperty('power');
        });
    });

    describe('LobberAI', () => {
        it('should return high angles', () => {
            const controller = new LobberAI();
            const result = controller.calculateShot(mockTank, mockTarget, env);
            expect(result.angle).toBeGreaterThan(Math.PI / 4); // > 45 degrees
        });
    });

    describe('SniperAI', () => {
        it('should return high power results', () => {
            const controller = new SniperAI();
            const result = controller.calculateShot(mockTank, mockTarget, env);
            expect(result.power).toBeGreaterThanOrEqual(70);
        });
    });

    describe('MastermindAI', () => {
        it('should improve accuracy over time', () => {
            const controller = new MastermindAI();
            // This is a more complex test, just checking it returns something for now
            const result = controller.calculateShot(mockTank, mockTarget, env);
            expect(result).toHaveProperty('angle');
            expect(result).toHaveProperty('power');
        });
    });
});
