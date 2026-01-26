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

    bakeHeightmap(points) {
        // Clear terrain first
        this.data.fill(0);

        for (let i = 1; i < points.length; i++) {
            const p1 = points[i - 1];
            const p2 = points[i];
            
            // Linear interpolation between points
            const startX = Math.floor(p1.x);
            const endX = Math.floor(p2.x);
            
            for (let x = startX; x <= endX; x++) {
                if (x < 0 || x >= this.width) continue;
                
                const t = (x - p1.x) / (p2.x - p1.x);
                const groundY = Math.floor(p1.y + t * (p2.y - p1.y));
                
                // Fill from groundY to the bottom of the canvas
                for (let y = groundY; y < this.height; y++) {
                    if (y >= 0 && y < this.height) {
                        this.setSolid(x, y, true);
                    }
                }
            }
        }
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
        const imageData = ctx.createImageData(this.width, this.height);
        const data = imageData.data;

        for (let i = 0; i < this.data.length; i++) {
            const isSolid = this.data[i] === 1;
            const idx = i * 4;
            if (isSolid) {
                // Neon green color
                data[idx] = 57;     // R
                data[idx + 1] = 255; // G
                data[idx + 2] = 20;  // B
                data[idx + 3] = 255; // A
            } else {
                // Transparent
                data[idx + 3] = 0;
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }
}
