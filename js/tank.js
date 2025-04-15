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
        this.currency = 100; // Starting currency
        this.alive = true;
        
        // Health system
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.shielded = false;
        
        // Inventory and selected weapon
        this.inventory = [];
        this.selectedWeapon = 'default';
        
        this.aiParams = {
            // Initial half–range for search (in radians and power units)
            angleRange: 5 * Math.PI / 180,  // ±5° by default
            powerRange: 2.5,               // ±2.5 power units by default
            // Increments for iterating candidate values
            angleIncrement: 1 * Math.PI / 180, // 1° steps
            powerIncrement: 0.5,
            // Minimum and maximum allowed search ranges (so they don't shrink or grow too far)
            minAngleRange: 2 * Math.PI / 180,
            maxAngleRange: 15 * Math.PI / 180,
            minPowerRange: 1,
            maxPowerRange: 10
        };
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y - this.height, this.width, this.height);
        
        // Draw the barrel with weapon-specific color
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y - this.height);
        
        // Different barrel look based on selected weapon
        const barrelLength = 15;
        let barrelEndX = this.x + this.width / 2 + barrelLength * Math.cos(this.angle);
        let barrelEndY = this.y - this.height - barrelLength * Math.sin(this.angle);
        
        ctx.lineTo(barrelEndX, barrelEndY);
        
        // Set barrel color based on selected weapon
        if (this.selectedWeapon === 'default') {
            ctx.strokeStyle = 'black';
        } else if (this.selectedWeapon === 'nuke') {
            ctx.strokeStyle = 'red';
        } else if (this.selectedWeapon === 'laser') {
            ctx.strokeStyle = '#00ff00';
        } else {
            ctx.strokeStyle = 'black';
        }
        
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.lineWidth = 1;
        
        // Draw shield if active
        if (this.shielded) {
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y - this.height / 2, 15, 0, Math.PI * 2);
            ctx.strokeStyle = '#00f7ff';
            ctx.stroke();
        }
        
        // Draw health bar
        const healthBarWidth = this.width;
        const healthPercent = Math.max(0, this.health / this.maxHealth);
        ctx.fillStyle = this.health < 30 ? 'red' : this.health < 60 ? 'yellow' : 'green';
        ctx.fillRect(this.x, this.y - this.height - 7, healthBarWidth * healthPercent, 3);
        
        // Draw weapon name
        ctx.font = '8px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText(this.selectedWeapon, this.x, this.y - this.height - 10);
    }

    fire(tanks, terrain, projectile, wind, canvas) {
        if (projectile.flying) return;
        
        // Set projectile properties based on selected weapon
        let explosionRadius = 15;
        let damage = 100; // Default damage for a direct hit
        let projectileColor = 'black';
        let extraDistance = 0;
        
        // Apply weapon effects
        if (this.selectedWeapon === 'nuke') {
            explosionRadius = 50;
            damage = 150;
            projectileColor = 'red';
            extraDistance = 10; // Extra distance for nukes
        } else if (this.selectedWeapon === 'laser') {
            vx *= 2; // Faster projectile
            vy *= 2;
            projectileColor = '#00ff00';
            extraDistance = 5;
        }
        
        const angle = this.angle;
        const power = this.power;
        
        // Calculate projectile starting position - move it significantly further away 
        // from the tank to prevent self-collision
        const barrelLength = 30 + extraDistance; // Much longer barrel length
        let x = this.x + this.width / 2 + barrelLength * Math.cos(angle);
        let y = this.y - this.height - barrelLength * Math.sin(angle);
        
        let vx = power * Math.cos(angle) * 0.2;
        let vy = -power * Math.sin(angle) * 0.2;
        
        // Store weapon info in projectile
        projectile.flying = true;
        projectile.type = this.selectedWeapon;
        projectile.damage = damage;
        projectile.explosionRadius = explosionRadius;
        projectile.color = projectileColor;
        projectile.sourcePlayerId = tanks.indexOf(this); // Track which player fired
        projectile.sourceTank = this; // Store reference to firing tank
        
        // Set initial position of projectile - making sure it's away from the tank
        projectile.x = x;
        projectile.y = y;
        
        // Immediate redraw to show projectile
        draw();
        
        // Safe distance for initial position
        const safeStartingDistance = explosionRadius + 20;
        
        // Calculate distance from tank center to projectile
        const tankCenterX = this.x + this.width/2;
        const tankCenterY = this.y - this.height/2;
        const distanceFromTankCenterToProjectile = Math.sqrt(
            (x - tankCenterX)**2 + (y - tankCenterY)**2
        );
        
        // Only start checking collisions after projectile is safely away
        const immunityTime = 200; // ms of immunity to prevent immediate explosions
        const maxTurnTime = 10000; // Maximum projectile life
        const turnStartTime = Date.now();
        
        // Make sure to start the projectile safely
        if (distanceFromTankCenterToProjectile < safeStartingDistance) {
            // Add a safety offset to ensure distance
            const safetyFactor = safeStartingDistance / distanceFromTankCenterToProjectile;
            x = tankCenterX + (x - tankCenterX) * safetyFactor;
            y = tankCenterY + (y - tankCenterY) * safetyFactor;
            projectile.x = x;
            projectile.y = y;
        }
        
        setTimeout(() => {
            const moveProjectile = () => {
                // Update projectile position
                x += vx;
                y += vy;
                vy += 0.1; // gravity
                vx += wind;
                projectile.x = x;
                projectile.y = y;
                
                // Redraw
                draw();
                
                // Calculate time since firing
                const elapsedTime = Date.now() - turnStartTime;
                
                // Determine if we should check for collisions with firing tank
                const excludeSourcePlayer = elapsedTime < immunityTime;
                
                let hit = false;
                
                // Only check collisions after the immunity period
                if (elapsedTime < immunityTime) {
                    // During immunity, only check for terrain and out of bounds
                    hit = this.checkTerrainAndBounds(x, y, terrain, canvas);
                } else {
                    // After immunity period, check for all collisions
                    hit = this.checkCollisions(x, y, terrain, tanks, canvas, projectile, excludeSourcePlayer);
                }
                
                // End turn if max time elapsed
                if (elapsedTime >= maxTurnTime) hit = true;
                
                if (!hit) {
                    setTimeout(() => requestAnimationFrame(moveProjectile), 5);
                } else {
                    if (y >= 0 && y <= canvas.height) {
                        // Create appropriate explosion based on weapon type
                        terrain.removeTerrain(x, y, projectile.explosionRadius);
                        createExplosion(x, y, projectile.explosionRadius, ctx, canvas, draw);
                    }
                    currentPlayer = getNextAliveTankIndex(currentPlayer);
                    projectile.flying = false;
                    
                    // Reset selected weapon to default after use (except for default)
                    if (this.selectedWeapon !== 'default') {
                        // Remove the item from inventory
                        const index = this.inventory.findIndex(item => item.id === this.selectedWeapon);
                        if (index !== -1) {
                            this.inventory.splice(index, 1);
                        }
                        this.selectedWeapon = 'default';
                    }
                }
            };
            
            moveProjectile();
        }, 10);
    }
    
    // New method to check terrain and bounds only (not tanks)
    checkTerrainAndBounds(x, y, terrain, canvas) {
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
        
        // Check out-of-bounds
        if (x < 0 || x > canvas.width || y > canvas.height) hit = true;
        
        return hit;
    }

    checkCollisions(x, y, terrain, tanks, canvas, projectile, excludeSourcePlayer = false) {
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
        hit = this.checkTankCollision(x, y, tanks, projectile.explosionRadius, projectile.damage, excludeSourcePlayer, projectile.sourcePlayerId) || hit;
        // Check out-of-bounds
        if (x < 0 || x > canvas.width || y > canvas.height) hit = true;
        return hit;
    }

    checkTankCollision(x, y, tanks, radius, damage, excludeSourcePlayer = false, sourcePlayerId = -1) {
        let hit = false;
        tanks.forEach((otherTank, tankIndex) => {
            if (!otherTank.alive) return; // Skip already destroyed tanks
            
            // Skip source player if excludeSourcePlayer is true
            if (excludeSourcePlayer && tankIndex === sourcePlayerId) return;
            
            const tankCenterX = otherTank.x + otherTank.width / 2;
            const tankCenterY = otherTank.y - otherTank.height / 2;
            const dx = x - tankCenterX;
            const dy = y - tankCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Check if within explosion radius
            if (distance <= radius + otherTank.width / 2) {
                hit = true;
                
                // Calculate damage based on distance (more damage if closer)
                const distanceFactor = 1 - (distance / (radius + otherTank.width / 2));
                const effectiveDamage = Math.floor(damage * distanceFactor);
                
                // Create explosion effect
                createExplosion(x, y, radius, ctx, canvas, draw);
                
                // Apply damage
                if (otherTank.shielded) {
                    // Shield blocks the hit
                    otherTank.shielded = false;
                    // Award partial points
                    if (otherTank !== this) {
                        this.score += 0.5;
                        this.currency += 5;
                    }
                } else {
                    // Apply damage directly to health
                    otherTank.health -= effectiveDamage;
                    
                    // If health drops to 0, mark as dead
                    if (otherTank.health <= 0) {
                        otherTank.health = 0;
                        otherTank.alive = false;
                        
                        // Award shooter points and currency for a kill
                        if (otherTank !== this) {
                            this.score += 1;
                            this.currency += 20;
                        }
                    }
                }
            }
        });

        // Check game-over: if only one tank is alive, end the game
        const aliveTanks = tanks.filter(tank => tank.alive);
        if (aliveTanks.length === 1) {
            isGameOver = true;
            showGameOverOverlay(aliveTanks[0].name + ' wins!');
        }

        return hit;
    }
    
    useItem(itemId) {
        const index = this.inventory.findIndex(item => item.id === itemId);
        if (index === -1) return false;
        
        const item = this.inventory[index];
        
        if (item.effect.type === 'weapon') {
            // Select the weapon
            this.selectedWeapon = item.id;
            return true;
        } else if (item.effect.type === 'defense' && item.id === 'shield') {
            // Activate shield
            this.shielded = true;
            // Remove from inventory after use
            this.inventory.splice(index, 1);
            return true;
        }
        
        return false;
    }
    
    // Fall damage when tank position is updated
    applyGravity(terrain) {
        // Get terrain height at current position
        const tankCenterX = this.x + this.width / 2;
        let groundHeight = null;
        
        // Find ground height at tank position
        for (let i = 1; i < terrain.points.length; i++) {
            let p1 = terrain.points[i - 1];
            let p2 = terrain.points[i];
            if (tankCenterX >= p1.x && tankCenterX <= p2.x) {
                groundHeight = p1.y + ((tankCenterX - p1.x) * (p2.y - p1.y)) / (p2.x - p1.x);
                break;
            }
        }
        
        // If ground height found, check if tank is above it
        if (groundHeight !== null) {
            // Ensure ground height doesn't exceed canvas height
            groundHeight = Math.min(groundHeight, canvas.height - this.height - 5);
            
            const fallDistance = groundHeight - this.y;
            
            // Only fall if above ground
            if (fallDistance > 0) {
                // Calculate fall damage based on distance
                const fallDamage = Math.max(0, Math.floor((fallDistance - 20) / 10));
                
                // Apply fall damage
                if (fallDamage > 0 && !this.shielded) {
                    this.health -= fallDamage;
                    if (this.health <= 0) {
                        this.health = 0;
                        this.alive = false;
                    }
                }
                
                // Update position to ground level
                this.y = groundHeight;
            }
        } else {
            // Handle edge case - if tank is off the terrain edges, place it at the bottom boundary
            if (this.x < 0 || this.x > canvas.width) {
                this.y = Math.min(this.y, canvas.height - this.height - 5);
            }
        }
        
        // Absolute bottom boundary check
        if (this.y > canvas.height - this.height) {
            this.y = canvas.height - this.height - 5;
        }
    }

    aiFire(tanks, terrain, projectile, wind, canvas) {
        if (!this.alive) return;
        if (!aiReadyToFire) return;
        aiReadyToFire = false;
        
        // AI selects a weapon if available
        if (this.inventory && this.inventory.length > 0 && Math.random() < 0.7) {
            const randomItem = this.inventory[Math.floor(Math.random() * this.inventory.length)];
            this.useItem(randomItem.id);
        }
        
        let targetTank;
        do {
            targetTank = tanks[Math.floor(Math.random() * tanks.length)];
        } while (targetTank === this || !targetTank.alive);
        
        // Example: using aiLevel8 for this AI
        if (this.aiLevel === 8) {
            this.aiLevelMaxLob(targetTank, terrain);
        }
        setTimeout(() => {
            this.fire(tanks, terrain, projectile, wind, canvas);
            aiReadyToFire = true;
        }, 1000);
    }

    // Enhanced AI method (aiLevel8)
    aiLevel8(targetTank, terrain) {
        const g = 0.1;
        const windFactor = wind * 5.5;
        const dx = targetTank.x + targetTank.width / 2 - (this.x + this.width / 2);
        const dy = targetTank.y - this.y - this.height + 5;
        let bestAngle, bestPower, minError = Infinity;
        
        // Wider angle search range
        const angleMin = 20 * (Math.PI / 180);  // Lower minimum angle
        const angleMax = 160 * (Math.PI / 180); // Higher maximum angle
        
        // More granular power search with higher minimum power
        for (let power = 40; power <= 100; power += 1) {
            // More granular angle steps for better precision
            for (let angle = angleMin; angle <= angleMax; angle += (Math.PI / 360)) {
                // Better wind compensation
                const vx = power * Math.cos(angle) * 0.2 - windFactor * wind;
                const vy = -power * Math.sin(angle) * 0.2;
                
                // Skip if not moving in target direction
                if ((dx > 0 && vx <= 0) || (dx < 0 && vx >= 0)) continue;
                
                const t = Math.abs(dx / vx);
                if (t > 0) {
                    // More accurate landing prediction
                    const landingX = vx * t;
                    const landingY = vy * t + 0.5 * g * t * t; // Note: gravity is positive here
                    const error = Math.sqrt((landingX - dx) ** 2 + (landingY - dy) ** 2);
                    
                    if (error < minError) {
                        minError = error;
                        bestAngle = angle;
                        bestPower = power;
                    }
                }
            }
        }
        
        // If no solution found, use a reasonable default
        if (bestAngle === undefined) {
            bestAngle = Math.PI / 4; // 45 degrees
            bestPower = 70;          // Medium-high power
        }
        
        // Add smaller error to make AI more accurate
        const angleError = (Math.random() * 1 - 0.5) * (Math.PI / 180);
        const powerError = Math.random() * 2 - 1;
        
        this.angle = bestAngle + angleError;
        // Ensure AI power is in a reasonable range
        this.power = Math.max(40, Math.min(100, bestPower + powerError));
        
        // Use special weapons occasionally
        if (this.inventory && this.inventory.length > 0) {
            // Higher chance to use special weapons when the error is low (good shot)
            const useSpecialWeapon = minError < 20 && Math.random() < 0.8;
            if (useSpecialWeapon) {
                // Find weapons in inventory
                const weapons = this.inventory.filter(item => 
                    item.effect.type === 'weapon' || 
                    (item.effect.type === 'defense' && targetTank.health > 50)
                );
                
                if (weapons.length > 0) {
                    // Pick a random weapon
                    const weapon = weapons[Math.floor(Math.random() * weapons.length)];
                    this.useItem(weapon.id);
                }
            }
        }
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
        // Ensure power is always reasonable
        this.power = Math.max(30, Math.min(100, bestPower));
    }

    aiLevelMaxLob(targetTank, terrain) {
        const dt = 0.05;
        const maxSimTime = 10;
        const g = gravity;
        const physicsScale = 0.2;
        
        // Use a larger offset for safer firing
        const barrelLength = 30;
        const startX = this.x + this.width / 2 + barrelLength * Math.cos(this.angle);
        const startY = this.y - this.height - barrelLength * Math.sin(this.angle);

        // Desired displacement from start position
        const calc = {
            dx: targetTank.x + targetTank.width / 2 - startX,
            dy: targetTank.y - startY
        };

        let bestAngle = null;
        let bestPower = null;
        let minError = Infinity;
        
        // Use more focused and higher power ranges
        let angleMin, angleMax, powerMin, powerMax;
        if (this.lastBestAngle !== undefined && this.lastBestPower !== undefined) {
            // If we have a previous good shot, narrow our search around it
            angleMin = Math.max(Math.PI/6, this.lastBestAngle - this.aiParams.angleRange);
            angleMax = Math.min(5*Math.PI/6, this.lastBestAngle + this.aiParams.angleRange);
            powerMin = Math.max(40, this.lastBestPower - this.aiParams.powerRange);
            powerMax = Math.min(100, this.lastBestPower + this.aiParams.powerRange);
        } else {
            // Otherwise, adjust search ranges for better initial shots
            // Try more aggressive angles first
            const distanceToTarget = Math.sqrt(calc.dx * calc.dx + calc.dy * calc.dy);
            
            if (distanceToTarget < canvas.width * 0.3) {
                // For close targets, use steeper angles
                angleMin = Math.PI / 2.5; // About 72 degrees
                angleMax = Math.PI / 1.5; // About 120 degrees
            } else {
                // For distant targets, use lower trajectory
                angleMin = Math.PI / 4;   // 45 degrees
                angleMax = Math.PI / 2.2; // About 82 degrees
            }
            
            // Use higher power for farther targets
            powerMin = 40 + (distanceToTarget / canvas.width) * 30; // 40-70 based on distance
            powerMax = 100;
        }

        // Use finer increments for better precision
        const angleIncrement = Math.PI / 360; // 0.5 degree steps
        const powerIncrement = 0.5;
        
        // Iterate with finer increments
        for (let power = powerMin; power <= powerMax; power += powerIncrement) {
            for (let angle = angleMin; angle <= angleMax; angle += angleIncrement) {
                // Multiple simulation passes with different wind scenarios
                let minWindError = Infinity;
                const windScenarios = [0, wind, wind * 2]; // Try with different wind factors
                
                for (const windFactor of windScenarios) {
                    let x = startX, y = startY;
                    let vx = power * Math.cos(angle) * physicsScale;
                    let vy = -power * Math.sin(angle) * physicsScale;
                    let t = 0;
    
                    // Simulate the projectile's flight
                    while (t < maxSimTime && y < canvas.height) {
                        x += vx * dt;
                        y += vy * dt;
                        vy += g * dt;
                        vx += windFactor * dt;
                        t += dt;
                        
                        // Early exit if heading away from target
                        if ((calc.dx > 0 && vx < 0) || (calc.dx < 0 && vx > 0)) {
                            break;
                        }
                    }
    
                    // Compute error for this wind scenario
                    const error = Math.sqrt(
                        Math.pow(x - (startX + calc.dx), 2) + 
                        Math.pow(y - (startY + calc.dy), 2)
                    );
                    
                    minWindError = Math.min(minWindError, error);
                }
                
                // Use the best error across all wind scenarios
                if (minWindError < minError) {
                    minError = minWindError;
                    bestAngle = angle;
                    bestPower = power;
                }
            }
        }

        // If no good shot was found, use a reasonable fallback
        if (bestAngle === null || bestPower === null) {
            return this.aiLevel8(targetTank, terrain);
        }

        // Store these values for subsequent shots
        this.lastBestAngle = bestAngle;
        this.lastBestPower = bestPower;

        // Adjust search range based on error quality
        const errorThreshold = 15;
        if (minError < errorThreshold) {
            // Good shot - narrow the search range
            this.aiParams.angleRange = Math.max(this.aiParams.minAngleRange, this.aiParams.angleRange * 0.7);
            this.aiParams.powerRange = Math.max(this.aiParams.minPowerRange, this.aiParams.powerRange * 0.7);
        } else {
            // Poor shot - widen the search
            this.aiParams.angleRange = Math.min(this.aiParams.maxAngleRange, this.aiParams.angleRange * 1.3);
            this.aiParams.powerRange = Math.min(this.aiParams.maxPowerRange, this.aiParams.powerRange * 1.3);
        }

        // Set final parameters with minimal randomness for challenge
        this.angle = bestAngle + (Math.random() * 0.01 - 0.005); // Tiny random adjustment
        this.power = Math.max(40, Math.min(100, bestPower));
        
        // AI strategic weapon selection
        if (this.inventory && this.inventory.length > 0) {
            // Use special weapons for good shots, especially at longer ranges
            const targetDistance = Math.sqrt(calc.dx * calc.dx + calc.dy * calc.dy);
            const isGoodShot = minError < errorThreshold;
            const useSpecialWeapon = isGoodShot && Math.random() < 0.7;
            
            if (useSpecialWeapon) {
                // Choose appropriate weapon based on distance
                let preferredWeaponType = null;
                
                if (targetDistance > canvas.width * 0.6) {
                    // Long range - use nuke for splash damage
                    preferredWeaponType = 'nuke';
                } else if (targetDistance < canvas.width * 0.3) {
                    // Short range - use laser for precision
                    preferredWeaponType = 'laser';
                }
                
                // Find weapons matching preferred type, or any weapon if no preference
                const weapons = this.inventory.filter(item => 
                    item.effect.type === 'weapon' && 
                    (!preferredWeaponType || item.id === preferredWeaponType)
                );
                
                // If shields available and health getting low, use shield instead
                if (this.health < 40 && Math.random() < 0.8) {
                    const shields = this.inventory.filter(item => item.id === 'shield');
                    if (shields.length > 0) {
                        this.useItem('shield');
                        return;
                    }
                }
                
                // Use preferred weapon if available
                if (weapons.length > 0) {
                    const weapon = weapons[Math.floor(Math.random() * weapons.length)];
                    this.useItem(weapon.id);
                }
            }
        }
    }

    aiCalculations(targetTank) {
        const dx = targetTank.x + targetTank.width / 2 - (this.x + this.width / 2);
        const dy = targetTank.y - this.y - this.height + 5; // adjust the offset as needed
        return { dx, dy };
    }
}