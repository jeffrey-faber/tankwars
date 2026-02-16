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
    initMobileButtons();

    // Listen for game events
    window.addEventListener('turnStarted', (e) => {
        updateMobileHUD(e.detail.tank);
        setMobileControlsVisibility(true);
    });

    window.addEventListener('gameStarted', () => {
        setMobileControlsVisibility(true);
    });

    // Hide initially
    setMobileControlsVisibility(false);
}

/**
 * Shows or hides the mobile control overlays.
 */
export function setMobileControlsVisibility(visible) {
    const controls = document.getElementById('mobileControls');
    if (controls) {
        if (visible && state.gameState === 'PLAYING') {
            controls.classList.remove('hidden');
        } else {
            controls.classList.add('hidden');
        }
    }
}

/**
 * Initializes mobile action buttons.
 */
export function initMobileButtons() {
    const fireBtn = document.getElementById('mobileFireBtn');
    if (fireBtn) {
        fireBtn.onclick = () => {
            vibrate(50);
            window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space' }));
        };
    }
}

/**
 * Trigger haptic feedback if supported.
 */
export function vibrate(pattern) {
    if (navigator.vibrate) {
        navigator.vibrate(pattern);
    }
}

/**
 * Toggles fullscreen mode and attempts to lock orientation to landscape.
 */
export async function toggleFullScreen() {
    vibrate(20);
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

    // Angle is in Radians in-game, but we show Degrees 0-180
    const degrees = Math.round(tank.angle * (180 / Math.PI));
    if (angleDisplay) angleDisplay.innerText = `${degrees}°`;
    if (powerDisplay) powerDisplay.innerText = `${Math.round(tank.power)}`;

    // Update slider handles (Angle 0-180, Power 0-120)
    if (angleHandle) {
        const anglePercent = (degrees / 180) * 100;
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
            
            if (property === 'angle') {
                const currentDeg = tank.angle * (180 / Math.PI);
                const nextDeg = Math.max(min, Math.min(max, currentDeg + delta));
                tank.angle = nextDeg * (Math.PI / 180);
            } else {
                tank[property] = Math.max(min, Math.min(max, tank[property] + delta));
            }
            
            updateMobileHUD(tank);
            pulseDisplay(displayId);
        };
    };

    setupFineTune('anglePlus', 'angle', 1, 0, 180, 'angleValueDisplay');
    setupFineTune('angleMinus', 'angle', -1, 0, 180, 'angleValueDisplay');
    setupFineTune('powerPlus', 'power', 1, 0, 120, 'powerValueDisplay');
    setupFineTune('powerMinus', 'power', -1, 0, 120, 'powerValueDisplay');

    setupSliderDrag('angleSliderGroup', 'angle', 0, 180, 'angleValueDisplay');
    setupSliderDrag('powerSliderGroup', 'power', 0, 120, 'powerValueDisplay');

    // Enable relative dragging on the groups themselves (outside the track)
    setupRelativeDrag('angleSliderGroup', 'angle', 0.2, 180);
    setupRelativeDrag('powerSliderGroup', 'power', 0.2, 120);
}

/**
 * Attaches relative drag listeners to an element.
 */
function setupRelativeDrag(elementId, property, sensitivity, max) {
    const el = document.getElementById(elementId);
    if (!el) return;

    let startY = 0;
    let startValue = 0;
    let isDragging = false;

    const handleStart = (e) => {
        // Ignore if touching slider track or buttons
        if (e.target.closest('.slider-track') || e.target.closest('button')) return;
        
        const touch = e.touches[0];
        startY = touch.clientY;
        const tank = state.tanks[state.currentPlayer];
        if (tank && !tank.isAI) {
            // Get current value in degrees if angle
            startValue = property === 'angle' ? tank.angle * (180 / Math.PI) : tank[property];
            isDragging = true;
        }
    };

    const handleMove = (e) => {
        if (!isDragging) return;
        if (e.cancelable) e.preventDefault(); // Prevent scroll
        
        const touch = e.touches[0];
        const deltaY = startY - touch.clientY; // Drag up = positive
        const tank = state.tanks[state.currentPlayer];
        
        if (tank && !tank.isAI) {
            const newValue = Math.max(0, Math.min(max, startValue + (deltaY * sensitivity)));
            if (property === 'angle') {
                tank.angle = newValue * (Math.PI / 180);
            } else {
                tank[property] = newValue;
            }
            updateMobileHUD(tank);
        }
    };

    const handleEnd = () => {
        isDragging = false;
    };

    el.addEventListener('touchstart', handleStart, { passive: false });
    el.addEventListener('touchmove', handleMove, { passive: false });
    el.addEventListener('touchend', handleEnd);
    el.addEventListener('touchcancel', handleEnd);
}

/**
 * Attaches touch listeners for dragging on a slider.
 */
function setupSliderDrag(groupId, property, min, max, displayId) {
    const group = document.getElementById(groupId);
    if (!group) return;

    const track = group.querySelector('.slider-track');
    if (!track) return;

    const handleTouch = (e) => {
        // Prevent scrolling while interacting with slider
        if (e.cancelable) e.preventDefault();
        
        const touch = e.touches[0] || e; // Fallback for click event simulation
        const rect = track.getBoundingClientRect();
        
        const value = calculateSliderValue(touch.clientY, rect, min, max);

        const tank = state.tanks[state.currentPlayer];
        if (tank && !tank.isAI) {
            if (property === 'angle') {
                tank.angle = value * (Math.PI / 180);
            } else {
                tank[property] = value;
            }
            updateMobileHUD(tank);
            pulseDisplay(displayId);
            if (e.touches) vibrate(5); 
        }
    };

    track.addEventListener('touchstart', handleTouch, { passive: false });
    track.addEventListener('touchmove', handleTouch, { passive: false });
    track.addEventListener('click', handleTouch);
}

/**
 * Calculates value based on vertical position within a rect (bottom is 0%, top is 100%).
 * @param {number} clientY - The Y coordinate of the input event.
 * @param {Object} rect - BoundingClientRect-like object with top, bottom, height.
 * @param {number} min - Minimum value.
 * @param {number} max - Maximum value.
 * @returns {number} The calculated value.
 */
export function calculateSliderValue(clientY, rect, min, max) {
    // 0% at bottom, 100% at top
    // Position relative to bottom: (rect.bottom - clientY)
    const relativeY = rect.bottom - clientY;
    const percent = Math.max(0, Math.min(1, relativeY / rect.height));
    return min + (percent * (max - min));
}

function pulseDisplay(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('pulsing');
    setTimeout(() => el.classList.remove('pulsing'), 200);
}
