export class BitmaskTerrain {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.data = new Uint8Array(width * height);
    }

    isSolid(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return false;
        }
        return this.data[y * this.width + x] === 1;
    }

    setSolid(x, y, solid) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return;
        }
        this.data[y * this.width + x] = solid ? 1 : 0;
    }

    checkCollision(x, y) {
        return this.isSolid(Math.floor(x), Math.floor(y));
    }

    explode(centerX, centerY, radius) {
        const r2 = radius * radius;
        const xMin = Math.max(0, Math.floor(centerX - radius));
        const xMax = Math.min(this.width - 1, Math.floor(centerX + radius));
        const yMin = Math.max(0, Math.floor(centerY - radius));
        const yMax = Math.min(this.height - 1, Math.floor(centerY + radius));

        for (let y = yMin; y <= yMax; y++) {
            for (let x = xMin; x <= xMax; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                if (dx * dx + dy * dy <= r2) {
                    this.setSolid(x, y, false);
                }
            }
        }
    }

    draw(ctx) {
        ctx.fillStyle = 'green';
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.isSolid(x, y)) {
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        }
    }
}
