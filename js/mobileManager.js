import { isTouchDevice } from './utils.js';

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
