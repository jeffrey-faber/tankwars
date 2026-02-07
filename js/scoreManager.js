export class ScoreManager {
    static calculateLoadoutValue(tank) {
        if (!tank.inventory) return 0;
        return tank.inventory.reduce((total, item) => total + (item.price || 0), 0);
    }

    static getPlayerStats(tank) {
        return {
            name: tank.name,
            color: tank.color,
            score: tank.score || 0,
            currency: tank.currency || 0,
            wins: tank.wins || 0,
            kills: tank.kills || 0,
            loadoutValue: this.calculateLoadoutValue(tank)
        };
    }

    static getAllStats(tanks) {
        return tanks.map(tank => this.getPlayerStats(tank));
    }
}
