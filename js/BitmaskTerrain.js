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

    checkCollision(x, y) {
        return this.isSolid(Math.floor(x), Math.floor(y));
    }

    setSolid(x, y, solid) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return;
        }
        this.data[y * this.width + x] = solid ? 1 : 0;
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
