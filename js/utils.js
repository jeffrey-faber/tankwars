// Parse URL parameters
export function getUrlParams() {
    const queryString = window.location.search.slice(1);
    return queryString.split('&').reduce((acc, param) => {
        const [key, value] = param.split('=');
        acc[key] = decodeURIComponent(value);
        return acc;
    }, {});
}

// Generate random tank positions based on the terrain
export function getRandomTankPositions(numPlayers, terrain) {
    const minDistance = 100;
    const positions = [];
    while (positions.length < numPlayers) {
        // Handle both old Terrain (points array) and new BitmaskTerrain
        const points = terrain.points || []; 
        // If it's BitmaskTerrain, we might need a different way to find positions.
        // For now, let's assume BitmaskTerrain has a points property if we baked it.
        
        const pointIndex = Math.floor(Math.random() * (points.length - 2)) + 1;
        const newPosition = {
            x: points[pointIndex].x,
            y: points[pointIndex].y - 100 // Start 100px higher in the air
        };
        let isValid = true;
        for (let pos of positions) {
            if (Math.abs(newPosition.x - pos.x) < minDistance) {
                isValid = false;
                break;
            }
        }
        if (isValid) positions.push(newPosition);
    }
    return positions.sort((a, b) => a.x - b.x);
}

// Generate a random hex color
export function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Create an explosion effect
export function createExplosion(x, y, radius, color = 'orange', duration = 500) {
    if (state.activeExplosions) {
        state.activeExplosions.push({
            x, y, radius, color,
            startTime: performance.now(),
            duration: duration
        });
    }
}

// Select a random edge behavior from the core options (Impact, Reflect, Teleport)
export function selectRandomEdgeBehavior() {
    const options = ['impact', 'reflect', 'teleport'];
    return options[Math.floor(Math.random() * options.length)];
}

/**
 * Calculates a new wind value based on the specified intensity.
 * @param {string} intensity - 'none', 'low', 'normal', 'high', or 'random'
 * @returns {number} The calculated wind value.
 */
export function calculateWind(intensity) {
    let actualIntensity = intensity;
    if (intensity === 'random') {
        const options = ['none', 'low', 'normal', 'high'];
        actualIntensity = options[Math.floor(Math.random() * options.length)];
    }

    switch (actualIntensity) {
        case 'none':
            return 0;
        case 'low':
            return (Math.random() * 2 - 1) * 0.005;
        case 'high':
            return (Math.random() * 2 - 1) * 0.04;
        case 'normal':
        default:
            return (Math.random() * 2 - 1) * 0.015;
    }
}

/**
 * Checks if the current device is a touch-enabled device.
 * @returns {boolean} True if the device supports touch.
 */
export function isTouchDevice() {
    return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
}
