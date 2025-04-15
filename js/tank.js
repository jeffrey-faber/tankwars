class Tank {
    constructor(x, y, isAI = false, aiLevel = 0, name = '') {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 10;
        this.angle = Math.PI / 4;
        this.power = 50;
        this.color = getRandomColor();
        this.isAI = isAI;
        this.aiLevel = aiLevel;
        this.name = name;
        // New properties for score and currency
        this.score = 0;
        this.currency = 0;
        this.alive = true;
        this.aiParams = {
            // Initial half–range for search (in radians and power units)
            angleRange: 5 * Math.PI / 180,  // ±5° by default
            powerRange: 2.5,               // ±2.5 power units by default
            // Increments for iterating candidate values
            angleIncrement: 1 * Math.PI / 180, // 1° steps
            powerIncrement: 0.5,
            // Minimum and maximum allowed search ranges (so they don’t shrink or grow too far)
            minAngleRange: 2 * Math.PI / 180,
            maxAngleRange: 15 * Math.PI / 180,
            minPowerRange: 1,
            maxPowerRange: 10
        };
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y - this.height, this.width, this.height);
        // Draw the barrel
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y - this.height);
        ctx.lineTo(
            this.x + this.width / 2 + 15 * Math.cos(this.angle),
            this.y - this.height - 15 * Math.sin(this.angle)
        );
        ctx.stroke();
    }

    fire(tanks, terrain, projectile, wind, canvas) {
        if (projectile.flying) return;
        projectile.flying = true;
        const angle = this.angle;
        const power = this.power;
        let x = this.x + this.width / 2 + 15 * Math.cos(angle);
        let y = this.y - this.height - 15 * Math.sin(angle);
        let vx = power * Math.cos(angle) * 0.2;
        let vy = -power * Math.sin(angle) * 0.2;
        const maxTurnTime = 10000;
        let turnStartTime = Date.now();

        const moveProjectile = () => {
            x += vx;
            y += vy;
            vy += 0.1; // gravity
            vx += wind;
            projectile.x = x;
            projectile.y = y;
            draw(); // global draw function from main.js

            let hit = this.checkCollisions(x, y, terrain, tanks, canvas);
            if (Date.now() - turnStartTime >= maxTurnTime) hit = true;

            if (!hit) {
                setTimeout(() => requestAnimationFrame(moveProjectile), 5);
            } else {
                if (y >= 0 && y <= canvas.height) {
                    terrain.removeTerrain(x, y, 15);
                    createExplosion(x, y, 15, ctx, canvas, draw);
                }
                currentPlayer = (currentPlayer + 1) % tanks.length;
                projectile.x = x;
                projectile.y = y;
                projectile.flying = false;
            }
        };
        moveProjectile();
    }

    checkCollisions(x, y, terrain, tanks, canvas) {
        let hit = false;
        // Check collision with terrain
        for (let i = 1; i < terrain.points.length; i++) {
            let p1 = terrain.points[i - 1];
            let p2 = terrain.points[i];
            if (x >= p1.x && x <= p2.x) {
                let groundY = p1.y + ((x - p1.x) * (p2.y - p1.y)) / (p2.x - p1.x);
                if (y >= groundY) hit = true;
                break;
            }
        }
        // Check collision with tanks
        hit = this.checkTankCollision(x, y, tanks, 20) || hit;
        // Check out-of-bounds
        if (x < 0 || x > canvas.width || y > canvas.height) hit = true;
        return hit;
    }

    checkTankCollision(x, y, tanks, radius) {
        let hit = false;
        tanks.forEach((otherTank) => {
            if (!otherTank.alive) return; // Skip already destroyed tanks
            const tankCenterX = otherTank.x + otherTank.width / 2;
            const tankCenterY = otherTank.y - otherTank.height / 2;
            const dx = x - tankCenterX;
            const dy = y - tankCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (otherTank !== this && distance <= radius + otherTank.width / 2) {
                hit = true;
                createExplosion(x, y, 50, ctx, canvas, draw);
                // Award shooter points and currency
                this.score += 1;
                this.currency += 10;
                // Mark the hit tank as destroyed
                otherTank.alive = false;
            }
        });

        // Check game-over: if only one tank is alive, end the game
        const aliveTanks = tanks.filter(tank => tank.alive);
        if (aliveTanks.length === 1) {
            isGameOver = true;
            showGameOverOverlay(this.name + ' wins!');
        }

        return hit;
    }


    aiFire(tanks, terrain, projectile, wind, canvas) {
        if (!this.alive) return;
        if (!aiReadyToFire) return;
        aiReadyToFire = false;
        let targetTank;
        do {
            targetTank = tanks[Math.floor(Math.random() * tanks.length)];
        } while (targetTank === this);
        // Example: using aiLevel8 for this AI
        if (this.aiLevel === 8) {
            this.aiLevelMaxLob(targetTank, terrain);
        }
        setTimeout(() => {
            this.fire(tanks, terrain, projectile, wind, canvas);
            aiReadyToFire = true;
        }, 1000);
    }

    // Example AI method (aiLevel8)
    aiLevel8(targetTank, terrain) {
        const g = 0.1;
        const windFactor = wind * 5.5;
        const dx = targetTank.x + targetTank.width / 2 - (this.x + this.width / 2);
        const dy = targetTank.y - this.y - this.height + 5;
        let bestAngle, bestPower, minError = Infinity;
        const angleMin = 30 * (Math.PI / 180);
        const angleMax = 150 * (Math.PI / 180);
        for (let power = 10; power <= 100; power += 1) {
            for (let angle = angleMin; angle <= angleMax; angle += (Math.PI / 180)) {
                const vx = power * Math.cos(angle) - windFactor * wind;
                const vy = -power * Math.sin(angle);
                const t = dx / vx;
                if (t > 0) {
                    const landingX = vx * t;
                    const landingY = vy * t - 0.5 * g * t * t;
                    const error = Math.sqrt((landingX - dx) ** 2 + (landingY - dy) ** 2);
                    if (error < minError) {
                        minError = error;
                        bestAngle = angle;
                        bestPower = power;
                    }
                }
            }
        }
        const angleError = (Math.random() * 2 - 1) * (Math.PI / 180);
        const powerError = Math.random() * 2 - 1;
        this.angle = bestAngle + angleError;
        this.power = bestPower / 2.96 + powerError;
    }

    aiLevelMax(targetTank, terrain) {
        const g = gravity;
        const physicsScale = 0.2; // same scaling as in fire()
        const calc = this.aiCalculations(targetTank);
        let bestAngle = null;
        let bestPower = null;
        let minError = Infinity;

        // Try many power and angle combinations using fine increments
        for (let power = 10; power <= 100; power += 0.1) {
            for (
                let angle = 5 * Math.PI / 180;
                angle <= 175 * Math.PI / 180;
                angle += (0.1 * Math.PI / 180)
            ) {
                // Compute initial velocities using the same scaling
                const vx = power * Math.cos(angle) * physicsScale + wind; // wind is added as in fire()
                const vy = -power * Math.sin(angle) * physicsScale;
                if (vx <= 0) continue;
                const t = calc.dx / vx;
                if (t > 0) {
                    // Predict landing Y position, accounting for gravity
                    const predictedY = vy * t + 0.5 * g * t * t;
                    const error = Math.abs(vx * t - calc.dx) + Math.abs(predictedY - calc.dy);
                    if (error < minError) {
                        minError = error;
                        bestAngle = angle;
                        bestPower = power;
                    }
                }
            }
        }

        // Fallback if no valid shot was found
        if (bestAngle === null || bestPower === null) {
            return this.aiLevel8(targetTank, terrain);
        }

        // Apply a very small error to avoid 100% perfection
        const angleError = 0;
        const powerError = 0;
        this.angle = bestAngle + angleError;
        this.power = bestPower + powerError;
    }

    aiLevelMaxLob(targetTank, terrain) {
        const dt = 0.05;
        const maxSimTime = 10;
        const g = gravity;
        const physicsScale = 0.2;

        // Use the same starting offset as in fire()
        const startX = this.x + this.width / 2 + 15 * Math.cos(this.angle);
        const startY = this.y - this.height - 15 * Math.sin(this.angle);

        // Desired displacement from start position
        const calc = {
            dx: targetTank.x + targetTank.width / 2 - startX,
            dy: targetTank.y - startY
        };

        let bestAngle = null;
        let bestPower = null;
        let minError = Infinity;

        // Use stored AI parameters (if we have a last shot, narrow the search range around it)
        let angleMin, angleMax, powerMin, powerMax;
        if (this.lastBestAngle !== undefined && this.lastBestPower !== undefined) {
            angleMin = this.lastBestAngle - this.aiParams.angleRange;
            angleMax = this.lastBestAngle + this.aiParams.angleRange;
            powerMin = Math.max(10, this.lastBestPower - this.aiParams.powerRange);
            powerMax = Math.min(100, this.lastBestPower + this.aiParams.powerRange);
        } else {
            // Otherwise, use default high-arc search range (60°–120°)
            angleMin = Math.PI / 3;
            angleMax = 2 * Math.PI / 3;
            powerMin = 10;
            powerMax = 100;
        }

        // Iterate over candidate values using the aiParams increments
        for (let power = powerMin; power <= powerMax; power += this.aiParams.powerIncrement) {
            for (let angle = angleMin; angle <= angleMax; angle += this.aiParams.angleIncrement) {
                let x = startX, y = startY;
                let vx = power * Math.cos(angle) * physicsScale;
                let vy = -power * Math.sin(angle) * physicsScale;
                let t = 0;

                // Simulate the projectile's flight
                while (t < maxSimTime && y < canvas.height) {
                    x += vx * dt;
                    y += vy * dt;
                    vy += g * dt;
                    vx += wind * dt;
                    t += dt;
                }

                // Compute an error metric: difference between simulated landing point and target displacement
                const error = Math.abs(x - (startX + calc.dx)) + Math.abs(y - (startY + calc.dy));

                if (error < minError) {
                    minError = error;
                    bestAngle = angle;
                    bestPower = power;
                }
            }
        }

        // If no candidate shot was found, fall back to a lower-level AI method.
        if (bestAngle === null || bestPower === null) {
            return this.aiLevel8(targetTank, terrain);
        }

        // Store these values so the next shot can narrow around them
        this.lastBestAngle = bestAngle;
        this.lastBestPower = bestPower;

        // Adjust the search range more quickly:
        // If the error is small, narrow the range; if it’s high, widen it a bit.
        const errorThreshold = 10; // adjust this threshold as needed
        if (minError < errorThreshold) {
            this.aiParams.angleRange = Math.max(this.aiParams.minAngleRange, this.aiParams.angleRange * 0.8);
            this.aiParams.powerRange = Math.max(this.aiParams.minPowerRange, this.aiParams.powerRange * 0.8);
        } else {
            this.aiParams.angleRange = Math.min(this.aiParams.maxAngleRange, this.aiParams.angleRange * 1.1);
            this.aiParams.powerRange = Math.min(this.aiParams.maxPowerRange, this.aiParams.powerRange * 1.1);
        }

        // Set the shot parameters (you can add a minimal random error if you want)
        this.angle = bestAngle;
        this.power = bestPower;
    }


    aiCalculations(targetTank) {
        const dx = targetTank.x + targetTank.width / 2 - (this.x + this.width / 2);
        const dy = targetTank.y - this.y - this.height + 5; // adjust the offset as needed
        return { dx, dy };
    }
}
