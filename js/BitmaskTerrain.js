export class BitmaskTerrain {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.data = new Uint8Array(width * height);
        
        // Create an offscreen canvas to cache the visual state
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx = this.canvas.getContext('2d');
        
        // Initialize as fully transparent
        this.ctx.clearRect(0, 0, width, height);
        
        // Keep a reference to the ImageData for fast pixel manipulation
        this.imageData = this.ctx.createImageData(width, height);
        this.pixels = this.imageData.data;
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
        const idx = y * this.width + x;
        const current = this.data[idx];
        const newValue = solid ? 1 : 0;
        
        if (current !== newValue) {
            this.data[idx] = newValue;
            
            // Update visual pixel immediately
            const pIdx = idx * 4;
            if (solid) {
                this.pixels[pIdx] = 57;     // R
                this.pixels[pIdx + 1] = 255; // G
                this.pixels[pIdx + 2] = 20;  // B
                this.pixels[pIdx + 3] = 255; // A
            } else {
                this.pixels[pIdx + 3] = 0;   // Transparent
            }
        }
    }

    bakeHeightmap(points) {
        // Clear terrain first
        this.data.fill(0);
        this.pixels.fill(0);

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
        // Force update of the offscreen canvas
        this.ctx.putImageData(this.imageData, 0, 0);
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

        let changed = false;
        for (let y = yMin; y <= yMax; y++) {
            for (let x = xMin; x <= xMax; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                if (dx * dx + dy * dy <= r2) {
                    if (this.isSolid(x, y)) {
                        this.setSolid(x, y, false);
                        changed = true;
                    }
                }
            }
        }
        if (changed) {
            this.ctx.putImageData(this.imageData, 0, 0);
        }
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

    updateGravity() {
        let moved = false;
        let moveCount = 0;
        // Iterate from bottom to top (excluding bottom-most row)
        for (let y = this.height - 2; y >= 0; y--) {
            // Randomize x direction to prevent bias
            const xStart = Math.random() > 0.5 ? 0 : this.width - 1;
            const xDir = xStart === 0 ? 1 : -1;
            
            for (let i = 0; i < this.width; i++) {
                const x = xStart + (i * xDir);
                
                if (this.isSolid(x, y)) {
                    // Check directly below
                    if (!this.isSolid(x, y + 1)) {
                        this.setSolid(x, y, false);
                        this.setSolid(x, y + 1, true);
                        moved = true;
                        moveCount++;
                    } else {
                        // Check diagonals - random order to avoid bias
                        const checkLeftFirst = Math.random() > 0.5;
                        const leftOpen = x > 0 && !this.isSolid(x - 1, y + 1);
                        const rightOpen = x < this.width - 1 && !this.isSolid(x + 1, y + 1);
                        
                        if (checkLeftFirst) {
                            if (leftOpen) {
                                this.setSolid(x, y, false);
                                this.setSolid(x - 1, y + 1, true);
                                moved = true;
                                moveCount++;
                            } else if (rightOpen) {
                                this.setSolid(x, y, false);
                                this.setSolid(x + 1, y + 1, true);
                                moved = true;
                                moveCount++;
                            }
                        } else {
                            if (rightOpen) {
                                this.setSolid(x, y, false);
                                this.setSolid(x + 1, y + 1, true);
                                moved = true;
                                moveCount++;
                            } else if (leftOpen) {
                                this.setSolid(x, y, false);
                                this.setSolid(x - 1, y + 1, true);
                                moved = true;
                                moveCount++;
                            }
                        }
                    }
                }
            }
        }
        if (moved) {
            // Only upload texture to GPU if something changed
            this.ctx.putImageData(this.imageData, 0, 0);
            if (Math.random() < 0.01) console.log(`Gravity moved ${moveCount} pixels`);
        }
        return moved;
    }

    draw(ctx) {
        // Blit the cached canvas
        ctx.drawImage(this.canvas, 0, 0);
    }
}