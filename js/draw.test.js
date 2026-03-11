import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state, draw } from './gameContext.js';

describe('Draw Loop', () => {
    beforeEach(() => {
        // Mock necessary state
        state.ctx = {
            save: vi.fn(),
            restore: vi.fn(),
            translate: vi.fn(),
            clearRect: vi.fn(),
            beginPath: vi.fn(),
            arc: vi.fn(),
            fill: vi.fn(),
            stroke: vi.fn(),
            createRadialGradient: vi.fn(() => ({
                addColorStop: vi.fn()
            })),
            createLinearGradient: vi.fn(() => ({
                addColorStop: vi.fn()
            })),
            fillText: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            fillRect: vi.fn(),
            drawImage: vi.fn(),
            font: '',
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 0,
            globalAlpha: 1.0,
            lineCap: 'butt',
            textAlign: 'left'
        };
        state.canvas = { width: 800, height: 600 };
        state.terrain = { draw: vi.fn() };
        state.tanks = [];
        state.projectiles = [];
        state.activeExplosions = [];
        state.laserBeams = [];
        state.windParticles = [];
        state.activeGlobalWaves = [];
        state.activeGravityWells = [];
        state.isGameOver = false;
        state.screenShake = { duration: 0 };
    });

    it('should execute draw() without errors with active gravity wells', () => {
        state.activeGravityWells = [{
            x: 400, y: 300, radius: 100, strength: 0.5, expiresAt: Date.now() + 10000
        }];
        
        expect(() => draw()).not.toThrow();
    });

    it('should execute draw() without errors with all active effects', () => {
        state.activeGravityWells = [{ x: 100, y: 100, radius: 50, expiresAt: Date.now() + 5000 }];
        state.activeExplosions = [{ x: 200, y: 200, radius: 30, startTime: Date.now(), duration: 500 }];
        state.laserBeams = [{ x1: 0, y1: 0, x2: 100, y2: 100, expiresAt: Date.now() + 500, duration: 500 }];
        state.windParticles = [{ x: 10, y: 10, speed: 1, length: 5 }];
        state.wind = 0.02;
        
        expect(() => draw()).not.toThrow();
    });
});
