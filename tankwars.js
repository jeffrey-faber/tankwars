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
let projectileFlying = false;

canvas.width = canvasWidth;
canvas.height = canvasHeight;

class Tank {
    constructor(x, y, isAI = false, aiLevel = 0) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 10;
        this.angle = Math.PI / 4;
        this.power = 50;
        this.color = getRandomColor();
        this.isAI = isAI;
        this.aiLevel = aiLevel;
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
}

class Terrain {
    constructor() {
        this.points = [];
        for (let i = 0; i <= canvas.width; i += 10) {
            this.points.push({
                x: i,
                y: Math.floor(Math.random() * 100 + 200)
            });
        }
    }

	removeTerrain(x, y, radius) {
		let newPoints = [];

		radius = radius * 2;
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

let wind = (Math.random() * 2 - 1) / 4;
let terrain = new Terrain();

const tankPositions = getRandomTankPositions(numPlayers);
const aiPlayers = urlParams.ai ? urlParams.ai.split(',').map(p => parseInt(p)) : [];

const tanks = [];
for (let i = 0; i < numPlayers; i++) {
    const isAI = aiPlayers.includes(i + 1);
    const aiLevel = isAI ? 1 : 0; // For now, just set AI level to 1
    tanks.push(new Tank(tankPositions[i].x, tankPositions[i].y, isAI, aiLevel));
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
            aiFire(tanks[currentPlayer]);
        }

		
        requestAnimationFrame(draw);
    }

}

function gameLoop() {
         console.log('Loop');
        draw();

        // Check if the current player is AI, and if so, make the AI fire
     /*   if (tanks[currentPlayer].isAI) {
            setTimeout(() => {
                console.log('aiFire');
                aiFire(tanks[currentPlayer]);
                gameLoop(); // Call gameLoop recursively after AI fires
            }, 1000);
        }*/
}

function drawHUD() {
    let tank = tanks[currentPlayer];
    ctx.font = '16px Arial';
    ctx.fillStyle = 'black';
    ctx.fillText('Player ' + (currentPlayer + 1), 10, 20);
    ctx.fillText('Angle: ' + (tank.angle * (180 / Math.PI)).toFixed(1) + '°', 10, 40);
    ctx.fillText('Power: ' + tank.power.toFixed(1), 10, 60);
    ctx.fillText('Wind: ' + (wind * 100).toFixed(1), 10, 80);
}


function fire() {
	if(projectileFlying)
		return;
	projectileFlying = true;
    let tank = tanks[currentPlayer];
    let angle = tank.angle;
    let power = tank.power;
    let x = tank.x + tank.width / 2 + 15 * Math.cos(angle);
    let y = tank.y - tank.height - 15 * Math.sin(angle);
	let vx = power * Math.cos(angle) * 0.2;
	let vy = -power * Math.sin(angle) * 0.2;
    const moveProjectile = () => {
        x += vx;
        y += vy;
        vy += 0.1; // gravity
        vx += wind; // wind
		
		projectile.x = x;
		projectile.y = y;

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fillStyle = 'black';
        ctx.fill();

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

		tanks.forEach((otherTank, index) => {
			if (
				index !== currentPlayer &&
				x >= otherTank.x &&
				x <= otherTank.x + otherTank.width &&
				y >= otherTank.y - otherTank.height &&
				y <= otherTank.y
			) {
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

        // Check for out of bounds
		 if (x < 0 || x > canvas.width || y > canvas.height) {
			hit = true;
		}

		if (!hit) {
			requestAnimationFrame(moveProjectile);
		} else {
			if (y >= 0 && y <= canvas.height) {
				terrain.removeTerrain(x, y, 15);
				createExplosion(x, y, 15);
			}
            currentPlayer = (currentPlayer + 1) % tanks.length;
			projectile.x = x;
			projectile.y = y;
			projectileFlying = false;
        }
    };

    moveProjectile();
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

function aiFire(tank) {
    if (tank.aiLevel === 1) {
        // Randomly choose angle and power for AI level 1
        tank.angle = Math.random() * Math.PI / 2;
        tank.power = Math.random() * 100;
    }

    // You can add more AI levels with different logic here

    fire();
}

document.addEventListener('keydown', (event) => {
    let tank = tanks[currentPlayer];

    if (!tank.isAI) {
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
            fire();
        }
    }
});
gameLoop();
