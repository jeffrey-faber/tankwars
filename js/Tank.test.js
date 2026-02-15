import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Tank } from './tank.js';
import { BitmaskTerrain } from './BitmaskTerrain.js';
import { state } from './gameContext.js';
import * as utils from './utils.js';

describe('Tank', () => {
    let tank;
    let terrain;

    beforeEach(() => {
        // Reset state
        state.canvas = { width: 800, height: 600 };
        state.projectiles = [];
        state.projectileLoopActive = false;
        state.aiReadyToFire = true;
        state.currentPlayer = 0;
        state.deathTriggerChance = 0.1;
        state.store = null;
        state.laserBeams = [];
        
        // Mock canvas context
        const mockCtx = {
            clearRect: vi.fn(),
            createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(800 * 600 * 4) })),
            putImageData: vi.fn(),
            drawImage: vi.fn(),
            beginPath: vi.fn(),
            arc: vi.fn(),
            fill: vi.fn(),
            fillRect: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            stroke: vi.fn(),
            fillText: vi.fn(),
            quadraticCurveTo: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            translate: vi.fn()
        };
        state.ctx = mockCtx;

        global.document = {
            createElement: vi.fn(() => ({
                getContext: vi.fn(() => mockCtx),
                width: 800,
                height: 600
            }))
        };
        
        global.window = {
            canvas: { width: 800, height: 600 },
            ctx: mockCtx,
        };
        global.requestAnimationFrame = (cb) => cb();

        tank = new Tank(100, 100);
        terrain = new BitmaskTerrain(800, 600);
    });

    it('should fall if terrain below is empty', () => {
        // Terrain is empty by default
        tank.y = 100;
        
        // Simulate multiple frames until it reaches bottom
        for(let i = 0; i < 200; i++) {
            tank.applyGravity(terrain);
        }
        
        // Should fall to bottom (minus height)
        expect(tank.y).toBe(600 - tank.height - 5);
    });

    it('should stop falling when hitting terrain', () => {
        // Create ground at y=200
        for (let x = 0; x < 800; x++) {
            // Need 6 layers for "stable ground" logic (checks 5 down)
            for (let dy = 0; dy <= 5; dy++) {
                terrain.setSolid(x, 200 + dy, true);
            }
        }
        
        tank.y = 100;
        // Simulate multiple frames
        for(let i = 0; i < 100; i++) {
            tank.applyGravity(terrain);
        }
        
        // Should land on 200
        expect(tank.y).toBe(200);
    });

    it('should detect when buried', () => {
        // Create ground at 200
        for (let x = 0; x < 800; x++) {
            terrain.setSolid(x, 200, true);
        }
        tank.y = 200;
        
        // Create "dirt" above the tank center (x + width/2 = 100 + 10 = 110)
        terrain.setSolid(110, 180, true);
        
        tank.checkBuried(terrain);
        expect(tank.isBuried).toBe(true);
    });

    it('should not be buried if air is above', () => {
        tank.y = 200;
        terrain.setSolid(110, 201, true); // Ground below
        
        tank.checkBuried(terrain);
        expect(tank.isBuried).toBe(false);
    });

    it('laser should damage a direct-hit target without throwing', () => {
        vi.useFakeTimers();
        const explosionSpy = vi.spyOn(utils, 'createExplosion').mockImplementation(() => {});
        const shooter = new Tank(100, 100);
        const target = new Tank(180, 100);
        target.name = 'Target';
        target.health = 100;

        shooter.selectedWeapon = 'laser';
        shooter.inventory = [{ id: 'laser', effect: { type: 'weapon', radius: 4, damage: 35, special: 'beam' } }];
        shooter.angle = 0;
        shooter.power = 60;

        state.tanks = [shooter, target];
        state.terrain = {
            removeCircle: vi.fn(),
            checkCollision: vi.fn(() => false),
            updateCanvas: vi.fn(),
            settle: vi.fn()
        };

        expect(() => shooter.fire()).not.toThrow();
        expect(target.health).toBeLessThan(100);

        vi.runAllTimers();
        explosionSpy.mockRestore();
        vi.useRealTimers();
    });

    it('laser should not splash nearby tanks', () => {
        vi.useFakeTimers();
        const explosionSpy = vi.spyOn(utils, 'createExplosion').mockImplementation(() => {});
        const shooter = new Tank(100, 100);
        const target = new Tank(180, 100);
        const nearby = new Tank(180, 145); // Close in X, not on beam line
        const nearbyInitial = nearby.health;

        shooter.selectedWeapon = 'laser';
        shooter.inventory = [{ id: 'laser', effect: { type: 'weapon', radius: 4, damage: 35, special: 'beam' } }];
        shooter.angle = 0;
        shooter.power = 60;

        state.tanks = [shooter, target, nearby];
        state.terrain = {
            removeCircle: vi.fn(),
            checkCollision: vi.fn(() => false),
            updateCanvas: vi.fn(),
            settle: vi.fn()
        };

        shooter.fire();
        expect(target.health).toBeLessThan(100);
        expect(nearby.health).toBe(nearbyInitial);

        vi.runAllTimers();
        explosionSpy.mockRestore();
        vi.useRealTimers();
    });

    it('laser penetration should scale with power', () => {
        vi.useFakeTimers();
        const shooter = new Tank(100, 100);
        shooter.selectedWeapon = 'laser';
        shooter.inventory = [{ id: 'laser', effect: { type: 'weapon', radius: 4, damage: 35, special: 'beam' } }];
        shooter.angle = 0;

        let carved = 0;
        state.terrain = {
            checkCollision: vi.fn(() => true),
            removeCircle: vi.fn(() => { carved += 1; }),
            updateCanvas: vi.fn(),
            settle: vi.fn()
        };

        const runShot = (power) => {
            carved = 0;
            shooter.power = power;
            state.tanks = [shooter];
            shooter.fire();
            vi.runAllTimers();
            shooter.inventory = [{ id: 'laser', effect: { type: 'weapon', radius: 4, damage: 35, special: 'beam' } }];
            shooter.selectedWeapon = 'laser';
            return carved;
        };

        const lowPowerCarve = runShot(20);
        const highPowerCarve = runShot(80);
        expect(highPowerCarve).toBeGreaterThan(lowPowerCarve);

        vi.useRealTimers();
    });

    it('aiFire should always unlock aiReadyToFire if firing throws', () => {
        vi.useFakeTimers();
        const aiTank = new Tank(100, 100, true, 0, 'AI');
        const target = new Tank(300, 100);
        target.name = 'Target';

        aiTank.aiController = {
            shop: vi.fn(),
            chooseTarget: vi.fn(() => target),
            calculateShot: vi.fn(() => ({ angle: Math.PI / 4, power: 60 })),
            recordShot: vi.fn(),
            chooseWeapon: vi.fn(() => 'default')
        };

        state.tanks = [aiTank, target];
        state.terrain = { checkCollision: vi.fn(() => false) };
        state.aiReadyToFire = true;

        const fireSpy = vi.spyOn(aiTank, 'fire').mockImplementation(() => {
            throw new Error('synthetic fire crash');
        });

        aiTank.aiFire();
        vi.advanceTimersByTime(1000);
        expect(state.aiReadyToFire).toBe(true);

        fireSpy.mockRestore();
        vi.useRealTimers();
    });

    it('aiFire should unlock aiReadyToFire when no target exists', () => {
        const aiTank = new Tank(100, 100, true, 0, 'AI');
        aiTank.aiController = {
            shop: vi.fn(),
            chooseTarget: vi.fn(() => null),
            calculateShot: vi.fn(),
            recordShot: vi.fn(),
            chooseWeapon: vi.fn()
        };

        state.tanks = [aiTank];
        state.terrain = { checkCollision: vi.fn(() => false) };
        state.aiReadyToFire = true;

        aiTank.aiFire();
        expect(state.aiReadyToFire).toBe(true);
    });

    it('fireworks deathrattle should kick off projectile loop and resolve', () => {
        vi.useFakeTimers();
        const explosionSpy = vi.spyOn(utils, 'createExplosion').mockImplementation(() => {});
        const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.9); // force special + fireworks
        const dyingTank = new Tank(250, 200);
        state.tanks = [dyingTank];
        state.currentPlayer = 0;
        state.deathTriggerChance = 1;
        state.activeEdgeBehavior = 'impact';
        state.terrain = {
            checkCollision: vi.fn(() => false),
            explode: vi.fn(),
            updateCanvas: vi.fn(),
            draw: vi.fn()
        };

        dyingTank.triggerDeathExplosion(0);
        expect(state.projectiles.length).toBeGreaterThan(0);
        expect(state.projectileLoopActive).toBe(true);

        vi.runAllTimers();
        expect(state.projectiles.length).toBe(0);
        expect(state.projectileLoopActive).toBe(false);

        explosionSpy.mockRestore();
        randomSpy.mockRestore();
        vi.useRealTimers();
    });
});
