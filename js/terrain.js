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
        let newPoints = [];
        const baseRemovalFactor = .5;
        // Scale radius for effect
        radius = radius * 3.5;

        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];
            const distance = Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2);

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

                // If the slope is steep, assume it's a skinny spike and increase removal depth
                if (slope > 20) { // Threshold value; adjust as needed
                    depth *= 2.0;
                }

                newPoints.push({
                    x: point.x,
                    y: point.y + depth * baseRemovalFactor
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
