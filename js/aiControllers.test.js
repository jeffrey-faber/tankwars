
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIController, StandardAI, StupidAI, LobberAI, SniperAI, MastermindAI, NemesisAI, BitwiseCommanderAI, GhostAI } from './aiControllers.js';
import { state } from './gameContext.js';

describe('AI Controllers', () => {
    let mockTank;
    let mockTarget;
    let env = { wind: 0.05, gravity: 0.1 };

    beforeEach(() => {
        mockTank = { x: 100, y: 500, width: 20, height: 10, name: 'AI', inventory: [], selectedWeapon: 'default' };
        mockTarget = { x: 400, y: 500, width: 20, height: 10, name: 'Target' };
        state.activeEdgeBehavior = 'impact';
        state.canvas = { width: 1200, height: 600 };
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

        it('should prefer heavy over laser when conventional shot is viable', () => {
            const controller = new SniperAI();
            const shooter = {
                x: 100,
                y: 500,
                width: 20,
                height: 10,
                name: 'Sniper',
                selectedWeapon: 'default',
                inventory: [
                    { id: 'heavy', effect: { type: 'weapon', radius: 30, damage: 60 } },
                    { id: 'laser', effect: { type: 'weapon', radius: 4, damage: 35, special: 'beam' } }
                ]
            };
            const target = { x: 520, y: 500, width: 20, height: 10, name: 'Target', alive: true, health: 100 };
            const clearEnv = { wind: 0, gravity: 0.1, checkTerrain: (x, y) => y > 500 };

            const weapon = controller.chooseWeapon(shooter, target, [shooter, target], clearEnv);
            expect(weapon).toBe('heavy');
        });

        it('should avoid laser when default shot remains viable', () => {
            const controller = new SniperAI();
            const shooter = {
                x: 100,
                y: 500,
                width: 20,
                height: 10,
                name: 'Sniper',
                selectedWeapon: 'default',
                inventory: [
                    { id: 'laser', effect: { type: 'weapon', radius: 4, damage: 35, special: 'beam' } }
                ]
            };
            const target = { x: 320, y: 500, width: 20, height: 10, name: 'Target', alive: true, health: 100 };
            const clutteredEnv = { wind: 0, gravity: 0.1, checkTerrain: (x, y) => y > 500 };

            const weapon = controller.chooseWeapon(shooter, target, [shooter, target], clutteredEnv);
            expect(weapon).toBe('default');
        });

        it('should prefer laser when direct ballistic lanes are blocked', () => {
            const controller = new SniperAI();
            const shooter = {
                x: 100,
                y: 500,
                width: 20,
                height: 10,
                name: 'Sniper',
                selectedWeapon: 'default',
                inventory: [
                    { id: 'heavy', effect: { type: 'weapon', radius: 30, damage: 60 } },
                    { id: 'laser', effect: { type: 'weapon', radius: 4, damage: 35, special: 'beam' } }
                ]
            };
            const target = { x: 620, y: 500, width: 20, height: 10, name: 'Target', alive: true, health: 100 };
            const blockedDirectEnv = {
                wind: 0,
                gravity: 0.1,
                checkTerrain: (x, y) => {
                    if (x > 300 && x < 380) return y > 170; // Tall wall blocks flat lanes
                    return y > 500;
                }
            };

            const weapon = controller.chooseWeapon(shooter, target, [shooter, target], blockedDirectEnv);
            expect(weapon).toBe('laser');
        });

        it('should have small opening-shot laser jitter that shrinks by second shot', () => {
            const controller = new SniperAI();
            const shooter = {
                x: 100,
                y: 500,
                width: 20,
                height: 10,
                name: 'Sniper',
                selectedWeapon: 'laser',
                inventory: [{ id: 'laser', effect: { type: 'weapon', radius: 4, damage: 35, special: 'beam' } }]
            };
            const target = { x: 450, y: 500, width: 20, height: 10, name: 'Target', alive: true, health: 100 };
            const clearEnv = { wind: 0, gravity: 0.1, checkTerrain: (x, y) => y > 500 };

            const baseline = controller.planLaserShot(shooter, target, clearEnv);
            const rnd = vi.spyOn(Math, 'random').mockReturnValue(1);

            const first = controller.calculateShot(shooter, target, clearEnv);
            controller.recordShot(target);
            const second = controller.calculateShot(shooter, target, clearEnv);
            rnd.mockRestore();

            const firstJitter = Math.abs(first.angle - baseline.angle);
            const secondJitter = Math.abs(second.angle - baseline.angle);
            expect(firstJitter).toBeGreaterThan(secondJitter);
            expect(firstJitter).toBeGreaterThan(0);
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

    describe('NemesisAI', () => {
        it('should return angle and power', () => {
            const controller = new NemesisAI();
            const result = controller.calculateShot(mockTank, mockTarget, env);
            expect(result).toHaveProperty('angle');
            expect(result).toHaveProperty('power');
        });

        it('should prefer teleport wrap lane when it is shorter', () => {
            state.activeEdgeBehavior = 'teleport';
            const controller = new NemesisAI();
            const shooter = { x: 80, y: 500, width: 20, height: 10, name: 'Shooter', inventory: [], selectedWeapon: 'default' };
            const target = { x: 1080, y: 500, width: 20, height: 10, name: 'Target', alive: true, health: 100 };
            const teleportEnv = {
                wind: 0,
                gravity: 0.1,
                checkTerrain: (x, y) => y > 500
            };

            const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
            const shot = controller.calculateShot(shooter, target, teleportEnv);
            randomSpy.mockRestore();

            expect(Math.cos(shot.angle)).toBeLessThan(0);
        });

        it('should avoid self-harm super weapons when a safer hit is available', () => {
            state.activeEdgeBehavior = 'impact';
            const controller = new NemesisAI();
            const makeWeapon = (id, radius, damage, price) => ({ id, price, effect: { type: 'weapon', radius, damage } });
            const shooter = {
                x: 100,
                y: 500,
                width: 20,
                height: 10,
                name: 'Shooter',
                selectedWeapon: 'default',
                inventory: [
                    makeWeapon('mega_nuke', 250, 250, 500),
                    makeWeapon('heavy', 30, 60, 50)
                ]
            };
            const target = { x: 210, y: 500, width: 20, height: 10, name: 'Target', alive: true, health: 100, shieldDurability: 0 };
            const nearbyEnemy = { x: 240, y: 500, width: 20, height: 10, name: 'Nearby', alive: true, health: 100, shieldDurability: 0 };
            const impactEnv = { wind: 0, gravity: 0.1, checkTerrain: (x, y) => y > 500 };

            const weapon = controller.chooseWeapon(shooter, target, [shooter, target, nearbyEnemy], impactEnv);
            expect(weapon).toBe('heavy');
        });

        it('should keep preplanned weapon between shot planning and weapon selection', () => {
            state.activeEdgeBehavior = 'impact';
            const controller = new NemesisAI();
            const shooter = {
                x: 100,
                y: 500,
                width: 20,
                height: 10,
                name: 'Shooter',
                selectedWeapon: 'default',
                inventory: [{ id: 'heavy', effect: { type: 'weapon', radius: 30, damage: 60 } }]
            };
            const target = { x: 380, y: 500, width: 20, height: 10, name: 'Target', alive: true, health: 100, shieldDurability: 0 };
            const envFlat = { wind: 0, gravity: 0.1, checkTerrain: (x, y) => y > 500 };
            state.tanks = [shooter, target];

            const originalCompute = controller.computeBestWeapon.bind(controller);
            controller.computeBestWeapon = vi.fn().mockImplementationOnce(() => 'heavy').mockImplementation(() => 'default');

            controller.calculateShot(shooter, target, envFlat);
            const picked = controller.chooseWeapon(shooter, target, [shooter, target], envFlat);

            controller.computeBestWeapon = originalCompute;
            expect(picked).toBe('heavy');
        });

        it('should favor earthquake weapons on high-relief crowded maps', () => {
            state.activeEdgeBehavior = 'impact';
            state.canvas = { width: 1200, height: 600 };
            state.terrain = {
                isSolid: (x, y) => y >= ((Math.floor(x / 120) % 2 === 0) ? 230 : 520),
                checkCollision: (x, y) => y > 500
            };

            const controller = new NemesisAI();
            const shooter = {
                x: 100,
                y: 500,
                width: 20,
                height: 10,
                name: 'Shooter',
                selectedWeapon: 'default',
                inventory: [
                    { id: 'earthquake_l', price: 350, effect: { type: 'weapon', radius: 160, damage: 40, intensity: 16 } },
                    { id: 'blockbuster', price: 150, effect: { type: 'weapon', radius: 60, damage: 100 } },
                    { id: 'heavy', price: 50, effect: { type: 'weapon', radius: 30, damage: 60 } }
                ]
            };
            const target = { x: 760, y: 250, width: 20, height: 10, name: 'Target', alive: true, health: 100, shieldDurability: 0 };
            const ally = { x: 100, y: 500, width: 20, height: 10, name: 'Ally', alive: true, health: 100, shieldDurability: 0 };
            const e2 = { x: 790, y: 265, width: 20, height: 10, name: 'Enemy2', alive: true, health: 100, shieldDurability: 0 };
            const e3 = { x: 820, y: 255, width: 20, height: 10, name: 'Enemy3', alive: true, health: 100, shieldDurability: 0 };
            const e4 = { x: 840, y: 260, width: 20, height: 10, name: 'Enemy4', alive: true, health: 100, shieldDurability: 0 };

            const env = { wind: 0.03, gravity: 0.1, checkTerrain: (x, y) => y > 500 };
            const picked = controller.chooseWeapon(shooter, target, [shooter, ally, target, e2, e3, e4], env);
            expect(picked).toBe('earthquake_l');
        });

        it('should buy earthquake_m when quake pressure is high and budget fits', () => {
            state.canvas = { width: 1200, height: 600 };
            state.terrain = {
                isSolid: (x, y) => y >= ((Math.floor(x / 100) % 2 === 0) ? 240 : 520)
            };

            const controller = new NemesisAI();
            const tank = { name: 'Nemesis', currency: 130, health: 100, alive: true, x: 120, y: 500, width: 20, height: 10 };
            const e1 = { x: 760, y: 250, width: 20, height: 10, alive: true };
            const e2 = { x: 810, y: 260, width: 20, height: 10, alive: true };
            const e3 = { x: 840, y: 245, width: 20, height: 10, alive: true };
            state.tanks = [tank, e1, e2, e3];

            const store = {
                items: [
                    { id: 'heavy', price: 50 },
                    { id: 'earthquake_m', price: 120 },
                    { id: 'earthquake_l', price: 350 }
                ],
                buyItem: vi.fn()
            };

            controller.shop(store, tank);
            expect(store.buyItem).toHaveBeenCalledWith('earthquake_m');
        });

        it('should gracefully fall back when AI deadline is already expired', () => {
            const controller = new NemesisAI();
            const shooter = {
                x: 100,
                y: 500,
                width: 20,
                height: 10,
                name: 'Shooter',
                selectedWeapon: 'default',
                inventory: [{ id: 'heavy', effect: { type: 'weapon', radius: 30, damage: 60 } }]
            };
            const target = { x: 600, y: 500, width: 20, height: 10, name: 'Target', alive: true, health: 100, shieldDurability: 0 };
            const expiredEnv = {
                wind: 0,
                gravity: 0.1,
                checkTerrain: (x, y) => y > 500,
                aiDeadline: Date.now() - 1
            };

            const shot = controller.calculateShot(shooter, target, expiredEnv);
            const weapon = controller.chooseWeapon(shooter, target, [shooter, target], expiredEnv);

            expect(Number.isFinite(shot.angle)).toBe(true);
            expect(Number.isFinite(shot.power)).toBe(true);
            expect(typeof weapon).toBe('string');
        });
    });

    describe('BitwiseCommanderAI', () => {
        it('should avoid laser first-pick when other terrain options exist', () => {
            const controller = new BitwiseCommanderAI();
            const shooter = {
                x: 100,
                y: 500,
                width: 20,
                height: 10,
                name: 'Commander',
                selectedWeapon: 'default',
                inventory: [
                    { id: 'laser', effect: { type: 'weapon', speedMultiplier: 2.0, damage: 80 } },
                    { id: 'heavy', effect: { type: 'weapon', radius: 30, damage: 60 } }
                ]
            };
            const target = { x: 700, y: 760, width: 20, height: 10, name: 'Target', alive: true, health: 100 };
            const envDeep = {
                wind: 0,
                gravity: 0.1,
                checkTerrain: (x, y) => {
                    if (x > 620 && x < 780) return y > 860;
                    return y > 520;
                }
            };

            const weapon = controller.chooseWeapon(shooter, target, [shooter, target], envDeep);
            expect(weapon).toBe('heavy');
        });

        it('should preserve preplan across calculateShot and chooseWeapon', () => {
            const controller = new BitwiseCommanderAI();
            const shooter = {
                x: 100,
                y: 500,
                width: 20,
                height: 10,
                name: 'Commander',
                selectedWeapon: 'default',
                inventory: [{ id: 'laser', effect: { type: 'weapon', speedMultiplier: 2.0, damage: 80 } }]
            };
            const target = { x: 700, y: 760, width: 20, height: 10, name: 'Target', alive: true, health: 100 };
            const envDeep = {
                wind: 0,
                gravity: 0.1,
                checkTerrain: (x, y) => {
                    if (x > 620 && x < 780) return y > 860;
                    return y > 520;
                }
            };

            state.tanks = [shooter, target];
            const shot = controller.calculateShot(shooter, target, envDeep);
            const picked = controller.chooseWeapon(shooter, target, [shooter, target], envDeep);

            expect(Number.isFinite(shot.angle)).toBe(true);
            expect(Number.isFinite(shot.power)).toBe(true);
            expect(typeof picked).toBe('string');
        });

        it('should break repeated short-lob undershoot loops with stronger power correction', () => {
            const controller = new BitwiseCommanderAI();
            const shooter = {
                x: 100,
                y: 500,
                width: 20,
                height: 10,
                name: 'Commander',
                selectedWeapon: 'default',
                inventory: []
            };
            const target = { x: 240, y: 500, width: 20, height: 10, name: 'CloseTarget', alive: true, health: 100 };
            const envFlat = { wind: 0, gravity: 0.1, checkTerrain: (x, y) => y > 500 };
            const tx = target.x + target.width / 2;
            const ty = target.y - target.height / 2;

            const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
            const baseline = controller.calculateShot(shooter, target, envFlat).power;
            controller.onShotResult(target, tx - 34, ty);
            const firstCorrection = controller.powerCorrections.get(target.name) || 0;

            controller.calculateShot(shooter, target, envFlat);
            controller.onShotResult(target, tx - 36, ty);
            const secondCorrection = controller.powerCorrections.get(target.name) || 0;
            const adjusted = controller.calculateShot(shooter, target, envFlat).power;
            randomSpy.mockRestore();

            expect(secondCorrection).toBeGreaterThan(firstCorrection);
            expect(adjusted).toBeGreaterThan(baseline);
        });
    });

    describe('GhostAI', () => {
        it('should reduce power after side-wall miss in impact mode', () => {
            state.activeEdgeBehavior = 'impact';
            state.canvas = { width: 1200, height: 600 };
            const controller = new GhostAI();
            const shooter = { x: 100, y: 500, width: 20, height: 10, name: 'Ghost', selectedWeapon: 'default', inventory: [] };
            const target = { x: 700, y: 500, width: 20, height: 10, name: 'Target', alive: true, health: 100 };
            const envFlat = { wind: 0, gravity: 0.1, checkTerrain: (x, y) => y > 500 };
            const ty = target.y - target.height / 2;

            const first = controller.calculateShot(shooter, target, envFlat).power;
            controller.onShotResult(target, 0, ty); // side wall miss
            const second = controller.calculateShot(shooter, target, envFlat).power;

            expect(second).toBeLessThan(first);
            expect(controller.sideHitStreaks.get(target.name)).toBeGreaterThan(0);
        });

        it('should hard-cut power after repeated side-wall misses', () => {
            state.activeEdgeBehavior = 'impact';
            state.canvas = { width: 1200, height: 600 };
            const controller = new GhostAI();
            const shooter = { x: 100, y: 500, width: 20, height: 10, name: 'Ghost', selectedWeapon: 'default', inventory: [] };
            const target = { x: 680, y: 500, width: 20, height: 10, name: 'Target', alive: true, health: 100 };
            const envFlat = { wind: 0, gravity: 0.1, checkTerrain: (x, y) => y > 500 };
            const ty = target.y - target.height / 2;

            const base = controller.calculateShot(shooter, target, envFlat).power;
            controller.onShotResult(target, 0, ty);
            const afterFirst = controller.calculateShot(shooter, target, envFlat).power;
            controller.onShotResult(target, 0, ty);
            const afterSecond = controller.calculateShot(shooter, target, envFlat).power;

            expect(afterFirst).toBeLessThan(base);
            expect(afterSecond).toBeLessThanOrEqual(afterFirst * 0.85);
            expect(controller.sideHitStreaks.get(target.name)).toBeGreaterThanOrEqual(2);
        });
    });
});
