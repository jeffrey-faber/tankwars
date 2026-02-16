import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initMobileMode, toggleFullScreen } from './mobileManager.js';
import * as utils from './utils.js';

vi.mock('./utils.js', () => ({
    isTouchDevice: vi.fn(),
}));

describe('mobileManager', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        vi.clearAllMocks();
        
        // Mock Fullscreen API
        document.documentElement.requestFullscreen = vi.fn().mockResolvedValue();
        document.exitFullscreen = vi.fn().mockResolvedValue();
        Object.defineProperty(document, 'fullscreenElement', {
            writable: true,
            value: null
        });

        // Mock Screen Orientation API
        if (!global.screen) global.screen = {};
        global.screen.orientation = {
            lock: vi.fn().mockResolvedValue(),
            unlock: vi.fn()
        };
    });

    describe('initMobileMode', () => {
        it('should add a full screen button if it is a touch device', () => {
            vi.mocked(utils.isTouchDevice).mockReturnValue(true);
            initMobileMode();
            const btn = document.getElementById('fullScreenButton');
            expect(btn).toBeTruthy();
            expect(btn.style.display).not.toBe('none');
        });

        it('should NOT add a full screen button if it is NOT a touch device', () => {
            vi.mocked(utils.isTouchDevice).mockReturnValue(false);
            initMobileMode();
            const btn = document.getElementById('fullScreenButton');
            expect(btn).toBeFalsy();
        });
    });

    describe('toggleFullScreen', () => {
        it('should request fullscreen and lock orientation to landscape-primary when entering fullscreen', async () => {
            await toggleFullScreen();
            expect(document.documentElement.requestFullscreen).toHaveBeenCalled();
            expect(global.screen.orientation.lock).toHaveBeenCalledWith('landscape-primary');
        });

        it('should exit fullscreen if already in fullscreen', async () => {
            document.fullscreenElement = document.documentElement;
            await toggleFullScreen();
            expect(document.exitFullscreen).toHaveBeenCalled();
        });
    });

    describe('updateMobileHUD', () => {
        it('should update angle and power displays', async () => {
            document.body.innerHTML = '';
            
            const createEl = (id) => {
                const el = document.createElement('div');
                el.id = id;
                document.body.appendChild(el);
                return el;
            };

            createEl('angleValueDisplay');
            createEl('powerValueDisplay');
            createEl('angleHandle');
            createEl('powerHandle');
            
            const tank = { angle: 30 * (Math.PI / 180), power: 80 };
            const m = await import('./mobileManager.js');
            m.updateMobileHUD(tank);
            
            expect(document.getElementById('angleValueDisplay').innerText).toBe('30°');
            expect(document.getElementById('powerValueDisplay').innerText).toBe('80');
            
            // Check handle positions
            const angleBottom = parseFloat(document.getElementById('angleHandle').style.bottom);
            expect(angleBottom).toBeCloseTo(16.666, 2);
            
            const powerBottom = parseFloat(document.getElementById('powerHandle').style.bottom);
            expect(powerBottom).toBeCloseTo(66.666, 2);
        });
    });

    describe('calculateSliderValue', () => {
        it('should calculate correct value based on touch position', async () => {
            const m = await import('./mobileManager.js');
            // Slider rect: top 100, bottom 300 (height 200). Touch Y: 200 (middle)
            // Expect 50% of range (0-100) = 50
            const rect = { top: 100, height: 200, bottom: 300 };
            const touchY = 200;
            const value = m.calculateSliderValue(touchY, rect, 0, 100);
            expect(value).toBe(50);
        });

        it('should clamp value to min', async () => {
            const m = await import('./mobileManager.js');
            const rect = { top: 100, height: 200, bottom: 300 };
            const touchY = 400; // Below bottom
            const value = m.calculateSliderValue(touchY, rect, 0, 100);
            expect(value).toBe(0);
        });

        it('should clamp value to max', async () => {
            const m = await import('./mobileManager.js');
            const rect = { top: 100, height: 200, bottom: 300 };
            const touchY = 50; // Above top
            const value = m.calculateSliderValue(touchY, rect, 0, 100);
            expect(value).toBe(100);
        });
    });
});
