export class BitmaskTerrain {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.data = new Uint8Array(width * height);
        this.freezeGravity = false;
        
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
        if (x < 0 || x >= this.width) {
            return false;
        }
        // Bedrock layer: The bottom row is always solid
        if (y >= this.height - 1) {
            return true;
        }
        if (y < 0) {
            return false;
        }
        return this.data[y * this.width + x] === 1;
    }

    setSolid(x, y, solid) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height - 1) {
            return; // Cannot modify bedrock or out of bounds
        }
        const idx = y * this.width + x;
        const current = this.data[idx];
        const newValue = solid ? 1 : 0;
        
        if (current !== newValue) {
            this.data[idx] = newValue;
            
            // Update visual pixel in ImageData buffer
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

        // Pre-fill bedrock visually
        for (let x = 0; x < this.width; x++) {
            const idx = (this.height - 1) * this.width + x;
            const pIdx = idx * 4;
            this.pixels[pIdx] = 30;     // Darker bedrock
            this.pixels[pIdx + 1] = 30; 
            this.pixels[pIdx + 2] = 30;  
            this.pixels[pIdx + 3] = 255; 
        }

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
                
                // Fill from groundY to the bedrock
                for (let y = groundY; y < this.height - 1; y++) {
                    if (y >= 0) {
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

    isPixelStable(x, y) {
        x = Math.floor(x);
        y = Math.floor(y);
        if (!this.isSolid(x, y)) return false;
        
        // A pixel is stable if there is solid terrain all the way to the bottom
        // (Simplified for performance: just check 5 pixels down or bedrock)
        for (let i = 1; i <= 5; i++) {
            if (y + i >= this.height - 1) return true; // Bedrock
            if (!this.isSolid(x, y + i)) return false; // Gap below
        }
        return true; // Likely part of a stable stack
    }

    explode(centerX, centerY, radius) {
        const r2 = radius * radius;
        const xMin = Math.max(0, Math.floor(centerX - radius));
        const xMax = Math.min(this.width - 1, Math.floor(centerX + radius));
        const yMin = Math.max(0, Math.floor(centerY - radius));
        const yMax = Math.min(this.height - 2, Math.floor(centerY + radius)); // Respect bedrock

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

    addTerrain(centerX, centerY, radius) {
        const r2 = radius * radius;
        const xMin = Math.max(0, Math.floor(centerX - radius));
        const xMax = Math.min(this.width - 1, Math.floor(centerX + radius));
        const yMin = Math.max(0, Math.floor(centerY - radius));
        const yMax = Math.min(this.height - 2, Math.floor(centerY + radius)); // Respect bedrock

        for (let y = yMin; y <= yMax; y++) {
            for (let x = xMin; x <= xMax; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                if (dx * dx + dy * dy <= r2) {
                    this.setSolid(x, y, true);
                }
            }
        }
    }

    shiftTerrain(centerX, centerY, radius, distance) {
        const r2 = radius * radius;
        const xMin = Math.max(0, Math.floor(centerX - radius));
        const xMax = Math.min(this.width - 1, Math.floor(centerX + radius));
        const yMin = Math.max(0, Math.floor(centerY - radius));
        const yMax = Math.min(this.height - 2, Math.floor(centerY + radius));

        const pixelsToMove = [];

        // 1. Collect solid pixels and clear them from the source
        for (let y = yMin; y <= yMax; y++) {
            for (let x = xMin; x <= xMax; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                if (dx * dx + dy * dy <= r2) {
                    if (this.isSolid(x, y)) {
                        pixelsToMove.push({ x, y });
                        this.setSolid(x, y, false);
                    }
                }
            }
        }

        // 2. Re-set them at the new displaced location
        pixelsToMove.forEach(p => {
            const newX = Math.floor(p.x + distance);
            if (newX >= 0 && newX < this.width) {
                this.setSolid(newX, p.y, true);
            }
        });

        this.updateCanvas();
    }

    shiftColumn(x, distance) {
        if (x < 0 || x >= this.width) return;
        if (Math.abs(distance) < 1) return;

        const pixels = [];
        for (let y = 0; y < this.height - 1; y++) {
            if (this.isSolid(x, y)) {
                pixels.push(y);
                this.setSolid(x, y, false);
            }
        }

        pixels.forEach(y => {
            const newY = Math.floor(y + distance);
            if (newY >= 0 && newY < this.height - 1) {
                this.setSolid(x, newY, true);
            }
        });
    }

    invertTerrain() {
        for (let i = 0; i < (this.height - 1) * this.width; i++) {
            const current = this.data[i];
            const newValue = current === 1 ? 0 : 1;
            this.data[i] = newValue;
            
            const pIdx = i * 4;
            if (newValue === 1) {
                this.pixels[pIdx] = 57;     
                this.pixels[pIdx + 1] = 255; 
                this.pixels[pIdx + 2] = 20;  
                this.pixels[pIdx + 3] = 255; 
            } else {
                this.pixels[pIdx + 3] = 0;   
            }
        }
        this.updateCanvas();
    }

    removeTerrainCone(centerX, centerY, radius, centralAngle, spread) {
        const r2 = radius * radius;
        const xMin = Math.max(0, Math.floor(centerX - radius));
        const xMax = Math.min(this.width - 1, Math.floor(centerX + radius));
        const yMin = Math.max(0, Math.floor(centerY - radius));
        const yMax = Math.min(this.height - 2, Math.floor(centerY + radius)); // Respect bedrock

        const halfSpread = spread / 2;

        for (let y = yMin; y <= yMax; y++) {
            for (let x = xMin; x <= xMax; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                const dist2 = dx * dx + dy * dy;
                
                if (dist2 <= r2) {
                    // Check angle
                    let angle = Math.atan2(-dy, dx); // Negative dy because Y is down
                    if (angle < 0) angle += Math.PI * 2;
                    
                    let diff = Math.abs(angle - centralAngle);
                    if (diff > Math.PI) diff = Math.PI * 2 - diff;

                    if (diff <= halfSpread) {
                        this.setSolid(x, y, false);
                    }
                }
            }
        }
    }

    updateCanvas() {
        this.ctx.putImageData(this.imageData, 0, 0);
    }

    createCracks(startX, startY, length, angle, depth = 0, solid = false) {
        // Increase max depth for more complex patterns
        if (depth > 8 || length < 3) return;
        
        const endX = startX + Math.cos(angle) * length;
        const endY = startY + Math.sin(angle) * length;
        
        // Rasterize line with some thickness based on depth
        const steps = Math.ceil(length);
        const thickness = depth < 3 ? 2 : 1; // Thicker at the start/core
        
        for (let i = 0; i <= steps; i++) {
            const px = Math.floor(startX + (endX - startX) * (i / steps));
            const py = Math.floor(startY + (endY - startY) * (i / steps));
            
            // Draw a small cross/block for thickness
            for (let tx = -thickness; tx <= thickness; tx++) {
                for (let ty = -thickness; ty <= thickness; ty++) {
                    // Respect bedrock
                    if (py + ty < this.height - 1) {
                        this.setSolid(px + tx, py + ty, solid);
                    }
                }
            }
        }

        // Branching logic: more branches at early stages
        const branches = depth < 2 ? 3 : 2;
        for (let b = 0; b < branches; b++) {
            const nextAngle = angle + (Math.random() * 1.2 - 0.6); // Wider spread
            const nextLength = length * (0.7 + Math.random() * 0.3);
            this.createCracks(endX, endY, nextLength, nextAngle, depth + 1, solid);
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

    updateGravity(wells = []) {
        if (this.freezeGravity) return false;
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
                    // 1. Check for Gravity Well Influence
                    let attracted = false;
                    for (const well of wells) {
                        const dx = well.x - x;
                        const dy = well.y - y;
                        const dist2 = dx*dx + dy*dy;
                        const r2 = well.radius * well.radius;
                        
                        if (dist2 < r2 && dist2 > 25) {
                            const adx = Math.sign(dx);
                            const ady = Math.sign(dy);
                            
                            // Try multiple paths towards the center (Fluid Flow)
                            const paths = [
                                { tx: x + adx, ty: y + ady }, // Direct diagonal
                                { tx: x + adx, ty: y },       // Horizontal shove
                                { tx: x, ty: y + ady }        // Vertical pull
                            ];

                            for (const path of paths) {
                                if (path.tx >= 0 && path.tx < this.width && path.ty >= 0 && path.ty < this.height - 1) {
                                    if (this.data[path.ty * this.width + path.tx] === 0) {
                                        this.setSolid(x, y, false);
                                        this.setSolid(path.tx, path.ty, true);
                                        moved = true;
                                        moveCount++;
                                        attracted = true;
                                        break;
                                    }
                                }
                            }

                            if (!attracted) {
                                // If already packed at center, just hold it there
                                attracted = true;
                            }
                            break; 
                        }
                    }
                    if (attracted) continue;

                    // 2. Fallback to standard downward gravity
                    // Check directly below - MUST BE EMPTY AIR AND NOT BEDROCK
                    if (y + 1 < this.height - 1) {
                        if (this.data[(y + 1) * this.width + x] === 0) {
                            this.setSolid(x, y, false);
                            this.setSolid(x, y + 1, true);
                            moved = true;
                            moveCount++;
                        } else {
                            // Check diagonals - random order to avoid bias
                            const checkLeftFirst = Math.random() > 0.5;
                            const leftOpen = x > 0 && this.data[(y + 1) * this.width + (x - 1)] === 0;
                            const rightOpen = x < this.width - 1 && this.data[(y + 1) * this.width + (x + 1)] === 0;
                            
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
        }
        if (moved) {
            // Only upload texture to GPU if something changed
            this.ctx.putImageData(this.imageData, 0, 0);
        }
        return moveCount;
    }

    draw(ctx) {
        // Blit the cached canvas
        ctx.drawImage(this.canvas, 0, 0);
    }
}
