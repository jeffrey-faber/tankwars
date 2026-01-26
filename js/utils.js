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
            y: points[pointIndex].y
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

// Create an explosion effect (requires a draw callback to re-render the game)
export function createExplosion(x, y, radius, ctx, canvas, drawCallback) {
    const drawExplosion = (currentRadius) => {
        ctx.beginPath();
        ctx.arc(x, y, currentRadius, 0, 2 * Math.PI);
        ctx.fillStyle = 'orange';
        ctx.fill();
    };

    let currentRadius = 0;
    const animateExplosion = () => {
        if (currentRadius < radius) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawCallback(); // re-render the game state
            drawExplosion(currentRadius);
            currentRadius += 2;
            requestAnimationFrame(animateExplosion);
        }
    };
    animateExplosion();
}
