import { isTouchDevice } from './utils.js';
import { state } from './gameContext.js';

/**
 * Initializes mobile-specific features like the fullscreen toggle.
 */
export function initMobileMode() {
    if (!isTouchDevice()) return;

    // Create Full Screen button
    const fsButton = document.createElement('button');
    fsButton.id = 'fullScreenButton';
    fsButton.innerText = 'FULL SCREEN';
    fsButton.className = 'mobile-fs-btn';
    fsButton.onclick = toggleFullScreen;

    document.body.appendChild(fsButton);
    
    // Add a class to body for mobile-specific CSS
    document.body.classList.add('mobile-mode');

    initMobileSliders();
}

/**
 * Toggles fullscreen mode and attempts to lock orientation to landscape.
 */
export async function toggleFullScreen() {
    try {
        if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
            if (screen.orientation && screen.orientation.lock) {
                await screen.orientation.lock('landscape-primary').catch(err => {
                    console.warn('Orientation lock failed:', err);
                });
            }
        } else {
            if (document.exitFullscreen) {
                await document.exitFullscreen();
            }
        }
    } catch (err) {
        console.error(`Error attempting to toggle full-screen: ${err.message}`);
    }
}

/**
 * Updates the mobile HUD displays and slider handles based on the current tank's state.
 * @param {Object} tank - The current tank object.
 */
export function updateMobileHUD(tank) {
    if (!tank) return;

    const angleDisplay = document.getElementById('angleValueDisplay');
    const powerDisplay = document.getElementById('powerValueDisplay');
    const angleHandle = document.getElementById('angleHandle');
    const powerHandle = document.getElementById('powerHandle');

    if (angleDisplay) angleDisplay.innerText = `${Math.round(tank.angle)}°`;
    if (powerDisplay) powerDisplay.innerText = `${Math.round(tank.power)}`;

    // Update slider handles (Angle 0-180, Power 0-120)
    if (angleHandle) {
        const anglePercent = (tank.angle / 180) * 100;
        angleHandle.style.bottom = `${anglePercent}%`;
    }
    if (powerHandle) {
        const powerPercent = (tank.power / 120) * 100;
        powerHandle.style.bottom = `${powerPercent}%`;
    }
}

/**
 * Initializes slider drag and fine-tune button interactions.
 */
export function initMobileSliders() {
    const setupFineTune = (id, property, delta, min, max, displayId) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.onclick = () => {
            const tank = state.tanks[state.currentPlayer];
            if (!tank || tank.isAI) return;
            
            tank[property] = Math.max(min, Math.min(max, tank[property] + delta));
            updateMobileHUD(tank);
            pulseDisplay(displayId);
        };
    };

    setupFineTune('anglePlus', 'angle', 1, 0, 180, 'angleValueDisplay');
    setupFineTune('angleMinus', 'angle', -1, 0, 180, 'angleValueDisplay');
    setupFineTune('powerPlus', 'power', 1, 0, 120, 'powerValueDisplay');
    setupFineTune('powerMinus', 'power', -1, 0, 120, 'powerValueDisplay');
}

function pulseDisplay(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('pulsing');
    setTimeout(() => el.classList.remove('pulsing'), 200);
}
