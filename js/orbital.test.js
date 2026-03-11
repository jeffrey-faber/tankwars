import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Tank } from './tank.js';
import { BitmaskTerrain } from './BitmaskTerrain.js';
import { state } from './gameContext.js';

// ─── helpers ────────────────────────────────────────────────────────────────

function makeTerrain(w = 800, h = 600) {
    const mockCtx = {
        clearRect: vi.fn(),
        createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(w * h * 4) })),
        putImageData: vi.fn(),
        drawImage: vi.fn(),
    };
    const t = new BitmaskTerrain(w, h, mockCtx);
    return t;
}

function makeTank(x = 100, y = 100) {
    return new Tank(x, y);
}

function setGravityCenter(x, y, strength = 0.15) {
    state.gravityCenter = { x, y, strength, turnsLeft: 3 };
}

function clearGravityCenter() {
    state.gravityCenter = null;
}

// Run n frames of orbital physics, returns { x, y, vx, vy } each frame
function simulate(tank, terrain, frames) {
    const history = [];
    for (let i = 0; i < frames; i++) {
        tank.applyGravity(terrain);
        history.push({ x: tank.x, y: tank.y, vx: tank.vx, vy: tank.vy });
    }
    return history;
}

// ─── setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
    state.canvas = { width: 800, height: 600 };
    state.ctx = {
        clearRect: vi.fn(),
        putImageData: vi.fn(),
        drawImage: vi.fn(),
    };
    state.tanks = [];
    state.projectiles = [];
    state.activeGravityWells = [];
    state.wind = 0;
    state.gravity = 0.1;
    state.freezeTankGravity = false;
    clearGravityCenter();
});

// ─── orbital force ───────────────────────────────────────────────────────────

describe('orbital gravity force', () => {
    it('accelerates tank toward core when core is directly below', () => {
        const terrain = makeTerrain();
        const tank = makeTank(390, 100); // no terrain, floating in space
        setGravityCenter(400, 500, 0.15);

        const before = { vx: tank.vx, vy: tank.vy };
        tank.applyGravity(terrain);

        // Core is roughly below → vy should increase (move downward)
        expect(tank.vy).toBeGreaterThan(before.vy);
        // Small rightward push since core is slightly right of tank center
        expect(tank.vx).toBeGreaterThanOrEqual(before.vx);
    });

    it('accelerates tank toward core when core is directly to the right', () => {
        const terrain = makeTerrain();
        const tank = makeTank(100, 295); // center at (110, 290), core at (500, 295)
        setGravityCenter(500, 290, 0.15);

        tank.applyGravity(terrain);

        expect(tank.vx).toBeGreaterThan(0); // pulled right
        expect(Math.abs(tank.vy)).toBeLessThan(0.05); // barely any vertical
    });

    it('speed is capped at 12 even after many frames of free-fall', () => {
        const terrain = makeTerrain();
        const tank = makeTank(390, 100);
        setGravityCenter(400, 500, 0.15);

        simulate(tank, terrain, 200);

        const speed = Math.sqrt(tank.vx ** 2 + tank.vy ** 2);
        expect(speed).toBeLessThanOrEqual(12.1); // slight float tolerance
    });
});

// ─── landing detection ────────────────────────────────────────────────────────

describe('orbital landing — core directly below tank', () => {
    it('lands on terrain 10px below center (within default halfSize)', () => {
        const terrain = makeTerrain();
        // Tank center is at (400, 200). halfSize = 12. Terrain at y=212 should be found.
        terrain.setSolid(400, 212, true);
        terrain.setSolid(399, 212, true);
        terrain.setSolid(401, 212, true);

        const tank = makeTank(390, 205); // center y ≈ 200
        tank.vx = 0; tank.vy = 0;
        setGravityCenter(400, 500);

        simulate(tank, terrain, 30);

        // Should have landed — no longer falling toward terrain
        expect(tank.vy).toBeLessThan(0.5);
    });

    it('lands on terrain 20px below center (just at scan limit)', () => {
        const terrain = makeTerrain();
        terrain.setSolid(400, 220, true);
        terrain.setSolid(399, 220, true);
        terrain.setSolid(401, 220, true);

        const tank = makeTank(390, 205);
        tank.vx = 0; tank.vy = 0;
        setGravityCenter(400, 500);

        simulate(tank, terrain, 40);

        expect(tank.vy).toBeLessThan(0.5);
    });

    it('DIAGNOSE: fails to land on terrain 30px below center (beyond default scan range)', () => {
        const terrain = makeTerrain();
        // Terrain surface 30px below tank center — this is > halfSize+8 = 20
        terrain.setSolid(400, 230, true);
        terrain.setSolid(399, 230, true);
        terrain.setSolid(401, 230, true);
        for (let y = 231; y < 600; y++) {
            terrain.setSolid(400, y, true);
            terrain.setSolid(399, y, true);
            terrain.setSolid(401, y, true);
        }

        const tank = makeTank(390, 205); // center y = 200, terrain at 230 = 30px gap
        tank.vx = 0; tank.vy = 0;
        setGravityCenter(400, 500);

        const history = simulate(tank, terrain, 60);
        const finalSpeed = Math.sqrt(tank.vx ** 2 + tank.vy ** 2);

        console.log(`After 60 frames: tank.y=${tank.y.toFixed(1)}, speed=${finalSpeed.toFixed(2)}`);
        console.log(`Distance from terrain surface: ${(230 - (tank.y - tank.height/2)).toFixed(1)}px`);

        // This test documents the current behaviour — passes if landed, fails otherwise
        expect(tank.vy).toBeLessThan(0.5);
    });

    it('DIAGNOSE: fails to land on terrain 50px below center (large gap)', () => {
        const terrain = makeTerrain();
        const surfaceY = 250;
        terrain.setSolid(400, surfaceY, true);
        terrain.setSolid(399, surfaceY, true);
        terrain.setSolid(401, surfaceY, true);
        for (let y = surfaceY + 1; y < 600; y++) {
            terrain.setSolid(400, y, true);
            terrain.setSolid(399, y, true);
            terrain.setSolid(401, y, true);
        }

        const tank = makeTank(390, 205); // center y = 200, terrain at 250 = 50px gap
        tank.vx = 0; tank.vy = 0;
        setGravityCenter(400, 500);

        const history = simulate(tank, terrain, 80);
        const finalSpeed = Math.sqrt(tank.vx ** 2 + tank.vy ** 2);

        console.log(`After 80 frames: tank.y=${tank.y.toFixed(1)}, speed=${finalSpeed.toFixed(2)}`);
        console.log(`Terrain at y=${surfaceY}, tank center at y=${(tank.y - tank.height/2).toFixed(1)}`);

        expect(tank.vy).toBeLessThan(0.5);
    });
});

describe('orbital landing — core to the side of tank', () => {
    it('lands on terrain to the right when core is far right', () => {
        const terrain = makeTerrain();
        // Tank at x=100, core at x=700, terrain surface at x=200 (vertical wall)
        for (let y = 0; y < 600; y++) {
            terrain.setSolid(200, y, true);
            terrain.setSolid(201, y, true);
        }

        const tank = makeTank(100, 295); // center at (110, 290)
        tank.vx = 0; tank.vy = 0;
        setGravityCenter(700, 290, 0.15);

        const history = simulate(tank, terrain, 60);
        console.log(`Side landing: tank.x=${tank.x.toFixed(1)}, vx=${tank.vx.toFixed(2)}`);

        expect(tank.vx).toBeLessThan(0.5);
    });
});

describe('orbital landing — core above tank', () => {
    it('lands on terrain above when core is up', () => {
        const terrain = makeTerrain();
        // Core at top, terrain is an overhead ceiling
        for (let x = 350; x < 450; x++) {
            terrain.setSolid(x, 100, true);
            terrain.setSolid(x, 99, true);
        }

        const tank = makeTank(390, 200); // center y = 195, terrain ceiling at y=100 (95px up)
        tank.vx = 0; tank.vy = 0;
        setGravityCenter(400, 50, 0.15);

        const history = simulate(tank, terrain, 80);
        console.log(`Upward landing: tank.y=${tank.y.toFixed(1)}, vy=${tank.vy.toFixed(2)}`);

        expect(tank.vy).toBeGreaterThan(-0.5); // no longer accelerating upward
    });
});

// ─── firing angle ────────────────────────────────────────────────────────────

describe('orbital firing angle', () => {
    // Helper: compute what vx/vy would be for a given setup
    // We can't easily call fire() without mocking lots of state,
    // so we directly test the math inline.

    function computeOrbitalFireVelocity(tankX, tankY, tankAngle, coreX, coreY, power = 50) {
        const tcx = tankX + 20 / 2; // tank width = 20
        const tcy = tankY - 10 / 2; // tank height = 10
        const orbitalRot = Math.atan2(coreY - tcy, coreX - tcx) - Math.PI / 2;
        const fireAngle = tankAngle - orbitalRot;
        const vx = power * Math.cos(fireAngle) * 0.2;
        const vy = -power * Math.sin(fireAngle) * 0.2;
        return { vx, vy, orbitalRot };
    }

    it('core directly below: angle=π/2 fires straight up (away from core)', () => {
        // Core below, tank fires "up" (away from core) = positive Y direction = screen up = negative vy
        const { vx, vy } = computeOrbitalFireVelocity(390, 200, Math.PI / 2, 400, 500);
        console.log(`Core below, fire up: vx=${vx.toFixed(3)}, vy=${vy.toFixed(3)}`);
        expect(Math.abs(vx)).toBeLessThan(0.5);  // nearly no horizontal
        expect(vy).toBeLessThan(-1);             // firing upward (negative vy = screen up)
    });

    it('core directly below: angle=0 fires horizontally right', () => {
        const { vx, vy } = computeOrbitalFireVelocity(390, 200, 0, 400, 500);
        console.log(`Core below, fire right: vx=${vx.toFixed(3)}, vy=${vy.toFixed(3)}`);
        expect(vx).toBeGreaterThan(1);
        expect(Math.abs(vy)).toBeLessThan(0.5);
    });

    it('core to the right: angle=π/2 fires LEFT (away from core)', () => {
        // Tank at (100, 295), core at (700, 290). "Up" = away from core = leftward.
        const { vx, vy, orbitalRot } = computeOrbitalFireVelocity(100, 295, Math.PI / 2, 700, 295);
        console.log(`Core right, fire "up": vx=${vx.toFixed(3)}, vy=${vy.toFixed(3)}, rot=${(orbitalRot * 180 / Math.PI).toFixed(1)}°`);
        expect(vx).toBeLessThan(-1); // fires left = away from core
        expect(Math.abs(vy)).toBeLessThan(0.5);
    });

    it('core directly above: angle=π/2 fires DOWN (away from core)', () => {
        const { vx, vy } = computeOrbitalFireVelocity(390, 400, Math.PI / 2, 400, 100);
        console.log(`Core above, fire "up": vx=${vx.toFixed(3)}, vy=${vy.toFixed(3)}`);
        expect(Math.abs(vx)).toBeLessThan(0.5);
        expect(vy).toBeGreaterThan(1); // fires downward (away from overhead core)
    });
});

// ─── scan range diagnostic ───────────────────────────────────────────────────

describe('scan range diagnostic', () => {
    it('reports the effective scan range of _applyOrbitalPhysics', () => {
        const tank = makeTank(390, 200);
        const halfSize = Math.max(tank.width, tank.height) / 2 + 2;
        const scanRange = halfSize + 8;
        console.log(`Tank width=${tank.width}, height=${tank.height}`);
        console.log(`halfSize=${halfSize}, total scan range=${scanRange}px`);
        console.log(`Max speed cap=12 px/frame — at full speed, tank moves 12px/frame`);
        console.log(`If terrain is ${scanRange + 1}px away, it will NOT be detected this frame`);

        expect(scanRange).toBeGreaterThan(0);
    });
});

// ─── moving terrain (the real in-game failure case) ──────────────────────────

describe('orbital landing — terrain moves away each frame', () => {
    function buildColumn(terrain, x, fromY) {
        for (let y = fromY; y < 590; y++) terrain.setSolid(x, y, true);
    }

    it('tank follows terrain retreating at 1px/frame (gravity wins)', () => {
        const terrain = makeTerrain();
        let surfaceY = 215; // 10px below initial tank center (205)
        buildColumn(terrain, 399, surfaceY);
        buildColumn(terrain, 400, surfaceY);
        buildColumn(terrain, 401, surfaceY);

        const tank = makeTank(390, 210); // center y=205
        tank.vx = 0; tank.vy = 0;
        setGravityCenter(400, 500, 0.15);

        for (let i = 0; i < 60; i++) {
            tank.applyGravity(terrain);
            // Terrain retreats 1px/frame toward core
            if (surfaceY < 400) {
                terrain.setSolid(399, surfaceY, false);
                terrain.setSolid(400, surfaceY, false);
                terrain.setSolid(401, surfaceY, false);
                surfaceY++;
                buildColumn(terrain, 399, surfaceY);
                buildColumn(terrain, 400, surfaceY);
                buildColumn(terrain, 401, surfaceY);
            }
        }

        const gap = surfaceY - (tank.y - tank.height / 2);
        console.log(`1px/frame retreat: tank center=${(tank.y - tank.height/2).toFixed(1)}, surfaceY=${surfaceY}, gap=${gap.toFixed(1)}px`);

        // Tank should stay within 25px of surface — not float away indefinitely
        expect(gap).toBeLessThan(25);
    });

    it('tank follows terrain retreating at 2px/frame', () => {
        const terrain = makeTerrain();
        let surfaceY = 215;
        buildColumn(terrain, 399, surfaceY);
        buildColumn(terrain, 400, surfaceY);
        buildColumn(terrain, 401, surfaceY);

        const tank = makeTank(390, 210);
        tank.vx = 0; tank.vy = 0;
        setGravityCenter(400, 500, 0.15);

        for (let i = 0; i < 60; i++) {
            tank.applyGravity(terrain);
            if (surfaceY < 400) {
                terrain.setSolid(399, surfaceY, false);
                terrain.setSolid(400, surfaceY, false);
                terrain.setSolid(401, surfaceY, false);
                terrain.setSolid(399, surfaceY + 1, false);
                terrain.setSolid(400, surfaceY + 1, false);
                terrain.setSolid(401, surfaceY + 1, false);
                surfaceY += 2;
                buildColumn(terrain, 399, surfaceY);
                buildColumn(terrain, 400, surfaceY);
                buildColumn(terrain, 401, surfaceY);
            }
        }

        const gap = surfaceY - (tank.y - tank.height / 2);
        console.log(`2px/frame retreat: tank center=${(tank.y - tank.height/2).toFixed(1)}, surfaceY=${surfaceY}, gap=${gap.toFixed(1)}px`);

        expect(gap).toBeLessThan(40);
    });

    it('tank lands after terrain fully settles (no longer moving)', () => {
        const terrain = makeTerrain();
        // Terrain moves for 30 frames then stops — simulates terrain finishing collapse
        let surfaceY = 215;
        buildColumn(terrain, 399, surfaceY);
        buildColumn(terrain, 400, surfaceY);
        buildColumn(terrain, 401, surfaceY);

        const tank = makeTank(390, 210);
        tank.vx = 0; tank.vy = 0;
        setGravityCenter(400, 500, 0.15);

        for (let i = 0; i < 100; i++) {
            tank.applyGravity(terrain);
            if (i < 30 && surfaceY < 350) {
                terrain.setSolid(399, surfaceY, false);
                terrain.setSolid(400, surfaceY, false);
                terrain.setSolid(401, surfaceY, false);
                surfaceY++;
                buildColumn(terrain, 399, surfaceY);
                buildColumn(terrain, 400, surfaceY);
                buildColumn(terrain, 401, surfaceY);
            }
        }

        const gap = surfaceY - (tank.y - tank.height / 2);
        console.log(`After settle: tank center=${(tank.y - tank.height/2).toFixed(1)}, surfaceY=${surfaceY}, gap=${gap.toFixed(1)}px, vy=${tank.vy.toFixed(2)}`);

        // After terrain stops, tank must fully land (gap ≈ halfSize = 12)
        expect(gap).toBeLessThan(14);
        expect(tank.vy).toBeLessThan(0.5);
    });
});
