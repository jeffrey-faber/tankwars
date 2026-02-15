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
        it('should update angle and power displays', () => {
            document.body.innerHTML = `
                <div id="angleValueDisplay"></div>
                <div id="powerValueDisplay"></div>
                <div id="angleHandle"></div>
                <div id="powerHandle"></div>
                <div class="slider-track vertical" style="height: 100px;"></div>
            `;
            const tank = { angle: 30, power: 80 };
            import('./mobileManager.js').then(m => {
                m.updateMobileHUD(tank);
                expect(document.getElementById('angleValueDisplay').innerText).toBe('30°');
                expect(document.getElementById('powerValueDisplay').innerText).toBe('80');
            });
        });
    });
});
