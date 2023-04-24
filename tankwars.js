const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let isGameOver = false;
let projectile = {
    x: null,
    y: null
};

const urlParams = getUrlParams();
const numPlayers = parseInt(urlParams.players) || 2;
const canvasWidth = parseInt(urlParams.width) || 800;
const canvasHeight = parseInt(urlParams.height) || 400;
const wind = (Math.random() * 2 - 1) / 10;
const gravity = .1;

let projectileFlying = false;
let needsRedraw = true;
let aiReadyToFire = true;
let turnCounter = 0;




canvas.width = canvasWidth;
canvas.height = canvasHeight;

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
    }

    draw() {
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
        if (projectileFlying) return;
        projectileFlying = true;
			turnCounter++;
        const angle = this.angle;
        const power = this.power;
        let x = this.x + this.width / 2 + 15 * Math.cos(angle);
        let y = this.y - this.height - 15 * Math.sin(angle);
        let vx = power * Math.cos(angle) * 0.2;
        let vy = -power * Math.sin(angle) * 0.2;

        const maxTurnTime = 10000; // Maximum turn time in milliseconds
        let turnStartTime = Date.now();

        const moveProjectile = () => {
            x += vx;
            y += vy;
            vy += gravity; // gravity
            vx += wind; // wind

            projectile.x = x;
            projectile.y = y;

            // Redraw the frame and update the projectile's position
            draw();

            let hit = this.checkCollisions(x, y, terrain, tanks, canvas);

            if (Date.now() - turnStartTime >= maxTurnTime) {
                hit = true;
            }

            if (!hit) {
                  setTimeout(() => requestAnimationFrame(moveProjectile), 5);
            } else {
                if (y >= 0 && y <= canvas.height) {
                    terrain.removeTerrain(x, y, 15);
                    createExplosion(x, y, 15);
                    needsRedraw = true;
                }
                currentPlayer = (currentPlayer + 1) % tanks.length;
                projectile.x = x;
                projectile.y = y;
                projectileFlying = false;
            }
        };

        moveProjectile();
		
	

		const currentTurn = turnCounter;
		const playerAtFireStart = currentPlayer;

		const forceEndTurn = () => {
			//console.log('Current Player : Player At Start',currentPlayer, playerAtFireStart);
			if (currentPlayer !== playerAtFireStart) {
				//console.log('Not forcing end turn:', turnCounter !== currentTurn, currentPlayer !== playerAtFireStart, !this.isAI);
				return;
			}

			projectileFlying = false;
			needsRedraw = true;
			currentPlayer = (currentPlayer + 1) % tanks.length;
			//console.log('forced end turn');
		};

		if (this.isAI) {
			setTimeout(() => forceEndTurn(), 5000);
		}

    }

    checkCollisions(x, y, terrain, tanks, canvas) {
        // Check for collision with terrain or out of bounds
        let hit = false;
        for (let i = 1; i < terrain.points.length; i++) {
            let p1 = terrain.points[i - 1];
            let p2 = terrain.points[i];

            if (x >= p1.x && x <= p2.x) {
                let groundY = p1.y + ((x - p1.x) * (p2.y - p1.y)) / (p2.x - p1.x);
                if (y >= groundY) {
                    hit = true;
                }
                break;
            }
        }

        // Check for collision with other tanks
        hit = this.checkTankCollision(x, y, tanks, 20) || hit;

        // Check for out of bounds
        if (x < 0 || x > canvas.width || y > canvas.height) {
            hit = true;
        }

        return hit;
    }

	checkTankCollision(x, y, tanks, radius) {
		let hit = false;
		tanks.forEach((otherTank, index) => {
			const tankCenterX = otherTank.x + otherTank.width / 2;
			const tankCenterY = otherTank.y - otherTank.height / 2;
			const dx = x - tankCenterX;
			const dy = y - tankCenterY;
			const distance = Math.sqrt(dx * dx + dy * dy);

			if (index !== currentPlayer && distance <= radius + otherTank.width / 2) {
				hit = true;
				createExplosion(x, y, 50);
				tanks.splice(index, 1); // Remove the hit tank
				if (tanks.length === 1) {
					isGameOver = true;
					setTimeout(() => {
						alert('Player ' + (currentPlayer + 1) + ' wins!');
					}, 1000);
				}
			}
		});
		return hit;
	}

    aiFire(tanks) {
        if (!aiReadyToFire) {
            return;
        }

        aiReadyToFire = false;

        let targetTank;
        do {
            targetTank = tanks[Math.floor(Math.random() * tanks.length)];
        } while (targetTank === this);

        switch (this.aiLevel) {
            case 1:
                this.aiLevel1();
                break;
            case 2:
                this.aiLevel2(targetTank);
                break;
            case 3:
                this.aiLevel3(targetTank);
                break;
            case 4:
                this.aiLevel4(targetTank);
                break;
            case 8:
                this.aiLevel8(targetTank, terrain);
                this.aiLevel8(targetTank, terrain);
                break;
            case 9:
                this.aiLevel9(targetTank, terrain);
                break;
            // Add more AI levels here
        }

        needsRedraw = true;
        setTimeout(() => {
            this.fire(tanks, terrain, projectile, wind, canvas);
            aiReadyToFire = true;
        }, 1000);
    }
	
	aiCalculations(targetTank) {
    const dx = targetTank.x + targetTank.width / 2 - (this.x + this.width / 2);
    const dy = targetTank.y - this.y - this.height + 5; // Add a small vertical offset (5 in this case)
    return { dx, dy };
}

	
	getMaxTerrainHeight(terrain, x1, x2) {
		let maxHeight = 0;
		for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
			const height = terrain.getHeightAt(x);
			if (height > maxHeight) {
				maxHeight = height;
			}
		}
		return maxHeight;
	}

	clearsTerrain(terrain, startX, startY, targetX, targetY, projectileRadius) {
		const numSteps = 100;
		const dx = (targetX - startX) / numSteps;
		const dy = (targetY - startY) / numSteps;
		const g = 0.1;
		const vx = dx / (1 / g);
		const vy = dy / (1 / g);

		for (let step = 0; step <= numSteps; step++) {
			const t = step / numSteps;
			const x = startX + vx * t;
			const y = startY + vy * t - 0.5 * g * (t * t);

			const terrainHeight = terrain.getHeightAt(x);
			if (terrainHeight !== null && y - projectileRadius <= terrainHeight) {
				return false;
			}
		}

		return true;
	}

	lineIntersects(line1, line2) {
		const det = (line1.x1 - line1.x2) * (line2.y1 - line2.y2) - (line1.y1 - line1.y2) * (line2.x1 - line2.x2);
		if (det === 0) {
			return false;
		}

		const t = ((line1.x1 - line2.x1) * (line2.y1 - line2.y2) - (line1.y1 - line2.y1) * (line2.x1 - line2.x2)) / det;
		const u = -((line1.x1 - line1.x2) * (line1.y1 - line2.y1) - (line1.y1 - line1.y2) * (line1.x1 - line2.x1)) / det;

		return t >= 0 && t <= 1 && u >= 0 && u <= 1;
	}

	getIntersectionPoint(line1, line2) {
		const det = (line1.x1 - line1.x2) * (line2.y1 - line2.y2) - (line1.y1 - line1.y2) * (line2.x1 - line2.x2);
		const x = ((line1.x1 * line1.y2 - line1.y1 * line1.x2) * (line2.x1 - line2.x2) - (line1.x1 - line1.x2) * (line2.x1 * line2.y2 - line2.y1 * line2.x2)) / det;
		const y = ((line1.x1 * line1.y2 - line1.y1 * line1.x2) * (line2.y1 - line2.y2) - (line1.y1 - line1.y2) * (line2.x1 * line2.y2 - line2.y1 * line2.x2)) / det;

		return { x, y };
	}

    aiLevel1() {
        this.angle = Math.random() * Math.PI / 2;
        this.power = Math.random() * 50;
    }

    aiLevel2(targetTank) {
		const calc = this.aiCalculations(targetTank);

        const angleError = (Math.random() * 20 - 10) * (Math.PI / 180);
        const powerError = Math.random() * 10 - 5;

        this.angle = Math.atan2(calc.dy, calc.dx) + angleError;
        this.power = Math.max(10, (calc.distance * 0.5) + powerError) / 3.3;
    }

    aiLevel3() {
		//random lobber
		const angleMin = Math.PI / 3; // 60 degrees
		const angleMax = (2 * Math.PI) / 3; // 120 degrees
		const angleRange = angleMax - angleMin;
		const angleRandomness = Math.random() * angleRange;

		const powerMin = 15;
		const powerMax = 45;
		const powerRange = powerMax - powerMin;
		const powerRandomness = Math.random() * powerRange;

		this.angle = angleMin + angleRandomness;
		this.power = powerMin + powerRandomness;
    }
	
	aiLevel4(targetTank) {
		//straight shot
		const g = gravity;
		const windFactor = wind;
		const calc = this.aiCalculations(targetTank);

		let bestAngle;
		let bestPower;
		let minError = Infinity;

		for (let angle = 0.1; angle < Math.PI; angle += 0.01) {
			for (let power = 10; power < 100; power += 1) {
				const vx = power * Math.cos(angle) - windFactor * wind;
				const vy = -power * Math.sin(angle);
				const t = (-vy - Math.sqrt(vy * vy - 2 * g * calc.dy)) / (-g);
				const x = vx * t;

				const error = Math.abs(x - calc.dx);

				if (error < minError) {
					minError = error;
					bestAngle = angle;
					bestPower = power;
				}
			}
		}

		// Add a small random error to make the AI not too perfect
		const angleError = ((Math.random() * 4 - 2) * (Math.PI / 180))/4;
		const powerError = (Math.random() * 4 - 2)/4;

		this.angle = bestAngle + angleError;
		this.power = bestPower + powerError;
	}
	
	aiLevel8(targetTank) {
		const g = gravity; // gravity
		const windFactor = wind*5.5;
		const calc = this.aiCalculations(targetTank);

		let bestAngle;
		let bestPower;
		let minError = Infinity;

		const angleMin = 30 * (Math.PI / 180); // 60 degrees
		const angleMax = 150 * (Math.PI / 180); // 120 degrees

		for (let power = 10; power <= 100; power += 1) {
			for (let angle = angleMin; angle <= angleMax; angle += (Math.PI / 180)) {
				// Calculate the initial velocities
				const vx = power * Math.cos(angle) - windFactor * wind;
				const vy = -power * Math.sin(angle);

				// Calculate the time of flight
				const t = calc.dx / vx;

				if (t > 0) {
					// Calculate the landing point
					const landingX = vx * t;
					const landingY = vy * t - 0.5 * g * t * t;

					// Calculate the error
					const error = Math.sqrt((landingX - calc.dx) ** 2 + (landingY - calc.dy) ** 2);

					if (error < minError) {
						minError = error;
						bestAngle = angle;
						bestPower = power;
					}
				}
			}
		}

		// Add a small random error to make the AI not too perfect
		const angleError = (Math.random() * 2 - 1) * (Math.PI / 180);
		const powerError = Math.random() * 2 - 1;

		this.angle = bestAngle + angleError;
		this.power = bestPower/2.96 + powerError;
		console.log(`Aiming at ${targetTank.name}. Angle ${this.angle} Power ${this.power}`);
	}


	
	aiLevel9(targetTank, terrain) {
		const g = gravity; // gravity
		const windFactor = wind;
		const calc = this.aiCalculations(targetTank);

		let bestAngle;
		let bestPower;
		let minError = Infinity;

			for (let power = 10; power <= 100; power += 0.5) {
				for (let angleDegrees = 5; angleDegrees <= 175; angleDegrees += 0.5) {
				const angle = angleDegrees * (Math.PI / 180);

				// Calculate the initial velocities
				const vx = power * Math.cos(angle) - windFactor * wind;
				const vy = -power * Math.sin(angle);

				// Calculate the time of flight
				const t = calc.dx / (power * Math.cos(angle) - windFactor * wind);

				if (t > 0) {
					// Check if the projectile clears the terrain
					const startX = this.x + this.width / 2;
					const startY = this.y - this.height;
					const targetX = startX + calc.dx;
					const targetY = startY + calc.dy;
					const projectileRadius = 2; // Assuming a radius of 2 for the projectile
					const clearsTerrain = this.clearsTerrain(terrain, startX, startY, targetX, targetY, projectileRadius);

					if (clearsTerrain) {
						// Calculate the error
						const error = Math.abs(vx * t - calc.dx);

						if (error < minError) {
							minError = error;
							bestAngle = angle;
							bestPower = power;
						}
					}
							if (minError === Infinity || !bestAngle || !bestPower) {
								console.log("No valid shot found.");
								console.log("calc.dx:", calc.dx);
								console.log("calc.dy:", calc.dy);
								console.log("gravity:", g);
								console.log("windFactor:", windFactor);
							}


				}
			}
		}

		// Add a small random error to make the AI not too perfect
		const angleError = (Math.random() * 4 - 2) * (Math.PI / 180);
		const powerError = Math.random() * 4 - 2;

		this.angle = bestAngle + angleError;
		this.power = bestPower + powerError;
	}

}

class Terrain {
    constructor(mapProps = this.pickRandomMap()) {
		
		console.log(mapProps);
		
        this.points = [];
        let previousY = Math.floor(Math.random() * mapProps.variance + mapProps.baseHeight);

        for (let i = 0; i <= canvas.width; i += mapProps.smoothness) {
            let y = Math.floor(Math.random() * mapProps.variance +mapProps.baseHeight);
            y = (previousY + y) / 2; // Use the average of the previous and current height
            this.points.push({
                x: i,
                y: y
            });
            previousY = y;
        }
    }
	
	premadeMaps = [
	{variance: 0, smoothness: 100, baseHeight:400, desc: 'Flat'},
	{variance: 800, smoothness: 10, baseHeight:1, desc: 'Extreme'},
	{variance: 400, smoothness: 50, baseHeight:200, desc: 'Middle'},
	{variance: 500, smoothness: 20, baseHeight:20, desc: 'High'},
	{variance: 200, smoothness: 40, baseHeight:20, desc: 'Hight Flat'},
	{variance: 200, smoothness: 40, baseHeight:380, desc: 'Low Flat'},
	];
	
    pickRandomMap() {
	  const randomIndex = Math.floor(Math.random() * this.premadeMaps.length);
	  return this.premadeMaps[randomIndex];
	}	
	getHeightAt(x) {
		const x1 = Math.floor(x / 10) * 10;
		const x2 = x1 + 10;

		if (x1 < 0 || x2 >= this.points.length * 10) {
			return null;
		}

		const p1 = this.points[x1 / 10];
		const p2 = this.points[x2 / 10];

		const t = (x - x1) / (x2 - x1);
		const y = p1.y + t * (p2.y - p1.y);

		return y;
	}

	removeTerrain(x, y, radius) {
		let newPoints = [];

		radius = radius * 3.5;
		for (let i = 0; i < this.points.length; i++) {
			let point = this.points[i];
			let distance = Math.sqrt((point.x - x) * (point.x - x) + (point.y - y) * (point.y - y));

			if (distance > radius) {
				newPoints.push(point);
			} else {
				// Calculate the depth of terrain removal
				let depth = Math.max(0, radius - distance);

				// Remove a larger portion of the terrain based on the depth
				newPoints.push({
					x: point.x,
					y: point.y + depth * 1.5
				});
			}
		}

		this.points = newPoints;
	}
	

   draw() {
        ctx.fillStyle = 'green';
        for (let i = 1; i < this.points.length; i++) {
            let p1 = this.points[i - 1];
            let p2 = this.points[i];
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

let terrain = new Terrain();

const tankPositions = getRandomTankPositions(numPlayers);
const aiPlayers = urlParams.ai ? urlParams.ai.split(',').map(p => parseInt(p)) : [];

const tanks = [];
for (let i = 0; i < numPlayers; i++) {
    const isAI = aiPlayers.includes(i + 1);
    const aiLevel = isAI ? 8 : 0; // For now, just set AI level to 1
    tanks.push(new Tank(tankPositions[i].x, tankPositions[i].y, isAI, aiLevel, `Player ${i+1}`));
}

let currentPlayer = 0;

function createExplosion(x, y, radius) {
    const drawExplosion = (radius) => {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = 'orange';
        ctx.fill();
    };

    let currentRadius = 0;
    const animateExplosion = () => {
    if (currentRadius < radius) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        draw();
        drawExplosion(currentRadius);
        currentRadius += 2;
        requestAnimationFrame(animateExplosion);
    } else {
		needsRedraw = true;
	}
};

    animateExplosion();
}

function draw() {
    if (!isGameOver) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        terrain.draw();
        tanks.forEach(tank => tank.draw());
        drawHUD();

        if (projectile.x !== null && projectile.y !== null) {
            ctx.beginPath();
            ctx.arc(projectile.x, projectile.y, 3, 0, 2 * Math.PI);
            ctx.fillStyle = 'black';
            ctx.fill();
        }
        
        if (tanks[currentPlayer].isAI && !projectileFlying) {
			   let targetTank;
				do {
					targetTank = tanks[Math.floor(Math.random() * tanks.length)];
				} while (targetTank === tanks[currentPlayer]);
				tanks[currentPlayer].aiFire(tanks);
        }
	if (needsRedraw) {
		needsRedraw = false;
		requestAnimationFrame(draw);
	}
    }
}


function drawHUD() {
    let tank = tanks[currentPlayer];
	if(!tank)
		return;
    ctx.font = '16px Arial';
    ctx.fillStyle = 'black';
    ctx.fillText(tank.name, 10, 20);
    ctx.fillText('Angle: ' + (tank.angle * (180 / Math.PI)).toFixed(1) + '°', 10, 40);
    ctx.fillText('Power: ' + tank.power.toFixed(1), 10, 60);
    ctx.fillText('Wind: ' + (wind * 100).toFixed(1), 10, 80);
}



function getUrlParams() {
    const queryString = window.location.search.slice(1);
    return queryString.split('&').reduce((acc, param) => {
        const [key, value] = param.split('=');
        acc[key] = decodeURIComponent(value);
        return acc;
    }, {});
}

function getRandomTankPositions(numPlayers) {
    const minDistance = 100;
    const positions = [];

    while (positions.length < numPlayers) {
        const pointIndex = Math.floor(Math.random() * (terrain.points.length - 2)) + 1;
        const newPosition = {
            x: terrain.points[pointIndex].x,
            y: terrain.points[pointIndex].y
        };

        let isValidPosition = true;
        for (let i = 0; i < positions.length; i++) {
            if (Math.abs(newPosition.x - positions[i].x) < minDistance) {
                isValidPosition = false;
                break;
            }
        }

        if (isValidPosition) {
            positions.push(newPosition);
        }
    }

    // Sort positions by X coordinate (left to right)
    positions.sort((a, b) => a.x - b.x);

    return positions;
}

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}


function gameLoop() {
    if (needsRedraw) {
        draw();
    }
    requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', (event) => {
    let tank = tanks[currentPlayer];
	
	
	if (event.key === '/') {
			console.log('force Skip');
			projectileFlying = false;
			needsRedraw = true;
			currentPlayer = (currentPlayer + 1) % tanks.length;
			aiReadyToFire = true;
        }


    if (!tank.isAI) {
		needsRedraw = true;
        if (event.key === 'ArrowLeft') {
            tank.angle += Math.PI / 180;
        } else if (event.key === 'ArrowRight') {
            tank.angle -= Math.PI / 180;
        } else if (event.key === 'ArrowUp') {
            tank.power += 1;
        } else if (event.key === 'ArrowDown') {
            tank.power -= 1;
        } else if (event.key === ' ') {
            event.preventDefault();
            tank.fire(tanks, terrain, projectile, wind, canvas);
        }
    }
});


gameLoop();
