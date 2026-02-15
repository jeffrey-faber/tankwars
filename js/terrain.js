export class Terrain {
    constructor(width, height, mapProps = null) {
        this.width = width;
        this.height = height;
        if (typeof mapProps === 'string') {
            mapProps = this.pickMapByStyle(mapProps);
        }
        if (!mapProps) mapProps = this.pickRandomMap();
        console.log('Generating terrain with:', mapProps);
        this.points = [];
        const detail = mapProps.detail || mapProps.smoothness || 10;
        let previousY = Math.floor(Math.random() * mapProps.variance + mapProps.baseHeight);

        for (let i = 0; i <= this.width; i += detail) {
            let y = Math.floor(Math.random() * mapProps.variance + mapProps.baseHeight);
            
            // Special logic for valley: make it deeper in the middle
            if (mapProps.desc === 'valley') {
                const center = this.width / 2;
                const distFromCenter = Math.abs(i - center);
                const depth = (1 - (distFromCenter / center)) * 200;
                y += depth;
            }

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
        { variance: 150, smoothness: 80, baseHeight: 300, desc: 'hills', detail: 15 },
        { variance: 300, smoothness: 20, baseHeight: 100, desc: 'rugged', detail: 5 },
        { variance: 200, smoothness: 100, baseHeight: 200, desc: 'valley', detail: 20 },
    ];

    pickRandomMap() {
        const randomIndex = Math.floor(Math.random() * this.premadeMaps.length);
        return this.premadeMaps[randomIndex];
    }

    pickMapByStyle(style) {
        if (style === 'random') return this.pickRandomMap();
        if (style === 'bedrock') return { variance: 0, smoothness: 100, baseHeight: this.height - 1, desc: 'bedrock', detail: 20 };
        return this.premadeMaps.find(m => m.desc === style) || this.pickRandomMap();
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
        const leftIndex = this.points.findIndex(p => p.x >= x - radius);
        const rightIndex = this.points.findIndex(p => p.x >= x + radius);

        if (leftIndex === -1 || rightIndex === -1) return;

        const craterPoints = [];
        for (let i = leftIndex; i < rightIndex; i++) {
            const point = this.points[i];
            const distance = Math.abs(point.x - x);
            const depth = Math.sqrt(radius * radius - distance * distance);
            craterPoints.push({ x: point.x, y: Math.min(this.height, point.y + depth) });
        }

        this.points.splice(leftIndex, rightIndex - leftIndex, ...craterPoints);
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
