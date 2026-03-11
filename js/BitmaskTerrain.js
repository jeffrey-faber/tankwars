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

    bakeOrbitMap(centerX, centerY, radius) {
        this.data.fill(0);
        this.pixels.fill(0);

        // Bedrock row
        for (let x = 0; x < this.width; x++) {
            const idx = (this.height - 1) * this.width + x;
            const pIdx = idx * 4;
            this.pixels[pIdx] = 30;
            this.pixels[pIdx + 1] = 30;
            this.pixels[pIdx + 2] = 30;
            this.pixels[pIdx + 3] = 255;
        }

        // Fill circular planet
        const r2 = radius * radius;
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                if (dx * dx + dy * dy <= r2) {
                    this.setSolid(x, y, true);
                }
            }
        }
        this.updateCanvas();
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

    updateGravity(wells = [], globalWell = null) {
        if (this.freezeGravity) return 0;
        
        let moved = false;
        let moveCount = 0;
        const width = this.width;
        const height = this.height;

        // Pre-calculate well bounding boxes
        const activeWells = wells.map(w => ({
            x: w.x, y: w.y, r2: w.radius * w.radius,
            minX: Math.max(0, w.x - w.radius),
            maxX: Math.min(width - 1, w.x + w.radius),
            minY: Math.max(0, w.y - w.radius),
            maxY: Math.min(height - 2, w.y + w.radius)
        }));

        // OPTIMIZATION: Only process rows that have potential movement
        for (let y = height - 2; y >= 0; y--) {
            const yOffset = y * width;
            const yNextOffset = (y + 1) * width;

            // Skip rows that can't possibly have anything to do.
            // Standard gravity and globalWell always process all rows.
            // Local-wells-only: skip rows not near any well.
            let rowMightMove = true;
            if (activeWells.length > 0 && globalWell === null) {
                rowMightMove = false;
                for (const well of activeWells) {
                    if (y >= well.minY && y <= well.maxY) {
                        rowMightMove = true;
                        break;
                    }
                }
            }
            if (!rowMightMove) continue;
            
            // If no wells, we only move if there is air below. 
            // We'll do a quick sample check or just proceed.
            
            const xStart = Math.random() > 0.5 ? 0 : width - 1;
            const xStep = xStart === 0 ? 1 : -1;

            for (let i = 0; i < width; i++) {
                const x = xStart + (i * xStep);
                
                if (this.data[yOffset + x] === 1) {
                    // Optimization: A solid pixel with 4 solid neighbors and no well influence cannot move.
                    // But checking 4 neighbors is expensive. Let's stick to the core logic.
                    
                    let attracted = false;

                    // 1. Local Wells
                    for (const well of activeWells) {
                        if (x >= well.minX && x <= well.maxX && y >= well.minY && y <= well.maxY) {
                            const dx = well.x - x;
                            const dy = well.y - y;
                            const dist2 = dx*dx + dy*dy;
                            if (dist2 < well.r2 && dist2 > 25) {
                                const adx = Math.sign(dx);
                                const ady = Math.sign(dy);
                                const targetIdx = (y + ady) * width + (x + adx);
                                if (this.data[targetIdx] === 0) {
                                    this.setSolid(x, y, false);
                                    this.setSolid(x + adx, y + ady, true);
                                    moved = true;
                                    moveCount++;
                                }
                                attracted = true; 
                                break;
                            }
                        }
                    }
                    if (attracted) continue;

                    // 2. Global Core
                    if (globalWell) {
                        const dx = globalWell.x - x;
                        const dy = globalWell.y - y;
                        const dist2 = dx * dx + dy * dy;
                        if (dist2 > 25) {
                            // Distance-based probability gate: close pixels always move,
                            // far pixels move less often — creates fluid gradual collapse
                            // and greatly reduces CPU load from distant terrain
                            const moveProbability = Math.min(1.0, 70000 / dist2); // ~265px = always
                            if (Math.random() < moveProbability) {
                                const adx = Math.sign(dx);
                                const ady = Math.sign(dy);

                                // Build paths that strictly move toward core.
                                // For axis-aligned pixels (adx=0 or ady=0), the naive
                                // paths collapse to the same cell — causing 1-pixel streaks
                                // along the cardinal axes. Add perpendicular jitter instead
                                // so pixels spread into a circle, not a cross.
                                const paths = [];
                                if (adx !== 0 && ady !== 0) {
                                    // True diagonal — three distinct paths toward core
                                    const swap = Math.random() > 0.5;
                                    paths.push({ tx: x + adx, ty: y + ady });
                                    paths.push({ tx: x + (swap ? adx : 0), ty: y + (swap ? 0 : ady) });
                                    paths.push({ tx: x + (swap ? 0 : adx), ty: y + (swap ? ady : 0) });
                                } else if (adx !== 0) {
                                    // On horizontal axis — add vertical jitter toward core
                                    const py = Math.random() > 0.5 ? 1 : -1;
                                    paths.push({ tx: x + adx, ty: y + py });
                                    paths.push({ tx: x + adx, ty: y });
                                    paths.push({ tx: x + adx, ty: y - py });
                                } else {
                                    // On vertical axis — add horizontal jitter toward core
                                    const px = Math.random() > 0.5 ? 1 : -1;
                                    paths.push({ tx: x + px,  ty: y + ady });
                                    paths.push({ tx: x,       ty: y + ady });
                                    paths.push({ tx: x - px,  ty: y + ady });
                                }

                                for (const path of paths) {
                                    if (path.tx >= 0 && path.tx < width && path.ty >= 0 && path.ty < height - 1) {
                                        if (this.data[path.ty * width + path.tx] === 0) {
                                            this.setSolid(x, y, false);
                                            this.setSolid(path.tx, path.ty, true);
                                            moved = true;
                                            moveCount++;
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                        continue;
                    }

                    // 3. Standard Gravity
                    if (y + 1 < height - 1) {
                        if (this.data[yNextOffset + x] === 0) {
                            this.setSolid(x, y, false);
                            this.setSolid(x, y + 1, true);
                            moved = true;
                            moveCount++;
                        } else {
                            const leftOpen = x > 0 && this.data[yNextOffset + x - 1] === 0;
                            const rightOpen = x < width - 1 && this.data[yNextOffset + x + 1] === 0;
                            if (leftOpen || rightOpen) {
                                const moveRight = (leftOpen && rightOpen) ? (Math.random() > 0.5) : rightOpen;
                                const adx = moveRight ? 1 : -1;
                                this.setSolid(x, y, false);
                                this.setSolid(x + adx, y + 1, true);
                                moved = true;
                                moveCount++;
                            }
                        }
                    }
                }
            }
        }
        
        if (moved) this.updateCanvas();
        return moveCount;
    }

    draw(ctx) {
        // Blit the cached canvas
        ctx.drawImage(this.canvas, 0, 0);
    }
}
