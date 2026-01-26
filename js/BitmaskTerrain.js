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
        // ... (previous code)
    }

    findFloatingPixels() {
        const connected = new Uint8Array(this.width * this.height);
        const stack = [];

        // Start from all solid pixels at the bottom row (connected to ground)
        for (let x = 0; x < this.width; x++) {
            if (this.isSolid(x, this.height - 1)) {
                const idx = (this.height - 1) * this.width + x;
                connected[idx] = 1;
                stack.push({ x, y: this.height - 1 });
            }
        }

        // Flood fill to find all pixels connected to ground
        while (stack.length > 0) {
            const { x, y } = stack.pop();

            // Check 4 neighbors
            const neighbors = [
                { nx: x + 1, ny: y },
                { nx: x - 1, ny: y },
                { nx: x, ny: y + 1 },
                { nx: x, ny: y - 1 }
            ];

            for (const { nx, ny } of neighbors) {
                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                    const idx = ny * this.width + nx;
                    if (this.isSolid(nx, ny) && !connected[idx]) {
                        connected[idx] = 1;
                        stack.push({ x: nx, y: ny });
                    }
                }
            }
        }

        // All solid pixels NOT marked as connected are floating
        const floating = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const idx = y * this.width + x;
                if (this.isSolid(x, y) && !connected[idx]) {
                    floating.push({ x, y });
                }
            }
        }
        return floating;
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
