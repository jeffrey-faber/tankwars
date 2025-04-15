class Terrain {
    constructor(mapProps = this.pickRandomMap()) {
        console.log(mapProps);
        this.points = [];
        const detail = mapProps.detail || mapProps.smoothness || 10;
        let previousY = Math.floor(Math.random() * mapProps.variance + mapProps.baseHeight);

        for (let i = 0; i <= canvas.width; i += detail) {
            let y = Math.floor(Math.random() * mapProps.variance + mapProps.baseHeight);
            y = (previousY + y) / 2; // Smooth interpolation between previous and current value.
            this.points.push({ x: i, y });
            previousY = y;
        }
    }

    premadeMaps = [
        { variance: 0, smoothness: 100, baseHeight: 400, desc: 'Flat', detail: 20 },
        { variance: 500, smoothness: 20, baseHeight: 1, desc: 'Extreme', detail: 4 },
        { variance: 400, smoothness: 50, baseHeight: 200, desc: 'Middle', detail: 10 },
        { variance: 500, smoothness: 20, baseHeight: 20, desc: 'High', detail: 5 },
        { variance: 200, smoothness: 40, baseHeight: 20, desc: 'High Flat', detail: 10 },
        { variance: 200, smoothness: 40, baseHeight: 380, desc: 'Low Flat', detail: 10 },
    ];

    pickRandomMap() {
        const randomIndex = Math.floor(Math.random() * this.premadeMaps.length);
        return this.premadeMaps[randomIndex];
    }

    getHeightAt(x) {
        const x1 = Math.floor(x / 10) * 10;
        const x2 = x1 + 10;
        if (x1 < 0 || x2 >= this.points.length * 10) return null;
        const p1 = this.points[x1 / 10];
        const p2 = this.points[x2 / 10];
        const t = (x - x1) / (x2 - x1);
        return p1.y + t * (p2.y - p1.y);
    }

    removeTerrain(x, y, radius) {
        // Handle special case for nukes - ensure they create a bigger crater
        const isNuke = radius >= 40;
        
        let newPoints = [];
        // Reduced removal factor to make terrain changes less extreme
        const baseRemovalFactor = isNuke ? 0.8 : 0.6; 
        
        // Scale radius for effect, lowered scaling for more controlled explosions
        radius = radius * (isNuke ? 3.0 : 2.5);

        // Calculate center of crater with smaller offset for more controlled explosions
        const offsetX = Math.random() * 6 - 3;
        const offsetY = 3; 
        const craterX = x + offsetX;
        const craterY = y + offsetY;

        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];
            const distance = Math.sqrt((point.x - craterX) ** 2 + (point.y - craterY) ** 2);

            if (distance > radius) {
                newPoints.push(point);
            } else {
                let depth = Math.max(0, radius - distance);

                // Calculate slope by comparing with neighbors
                let slope = 0;
                if (i > 0) {
                    slope = Math.max(slope, Math.abs(point.y - this.points[i - 1].y));
                }
                if (i < this.points.length - 1) {
                    slope = Math.max(slope, Math.abs(point.y - this.points[i + 1].y));
                }

                // Better handling for thin spikes with more moderate multiplier
                if (slope > 20) {
                    depth *= 2.5; 
                }

                // More moderate extra depth in the center of the explosion
                const centerFactor = 1.0 - (distance / radius);
                depth += centerFactor * 5;

                // More moderate minimum effect
                depth = Math.max(depth, isNuke ? 15 : 8); 

                // Apply depth with less randomization
                const jitter = Math.random() * 3;
                
                // Calculate new y position
                let newY = point.y + depth * baseRemovalFactor + jitter;
                
                // Ensure terrain doesn't go below canvas height - 10 (leave some margin)
                newY = Math.min(newY, canvas.height - 10);
                
                newPoints.push({
                    x: point.x,
                    y: newY
                });
            }
        }
        this.points = newPoints;
    }



    draw(ctx, canvas) {
        ctx.fillStyle = 'green';
        for (let i = 1; i < this.points.length; i++) {
            const p1 = this.points[i - 1];
            const p2 = this.points[i];
            ctx.beginPath();
            ctx.moveTo(p1.x, canvas.height);
            ctx.lineTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p2.x, canvas.height);
            ctx.closePath();
            ctx.fill();
        }
    }
}
