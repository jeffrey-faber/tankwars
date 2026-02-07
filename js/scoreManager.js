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

    static generateScoreboardHTML(tanks) {
        const stats = this.getAllStats(tanks);
        let html = `
            <h2>LEADERBOARD</h2>
            <table class="scoreboard-table">
                <thead>
                    <tr>
                        <th>Player</th>
                        <th>Score</th>
                        <th>Wins</th>
                        <th>Kills</th>
                        <th>Coins</th>
                        <th>Loadout Value</th>
                    </tr>
                </thead>
                <tbody>
        `;

        stats.forEach(player => {
            html += `
                <tr>
                    <td>
                        <div class="player-name-cell">
                            <div class="color-swatch" style="background-color: ${player.color}"></div>
                            ${player.name}
                        </div>
                    </td>
                    <td>${player.score}</td>
                    <td>${player.wins}</td>
                    <td>${player.kills}</td>
                    <td>${player.currency}</td>
                    <td>${player.loadoutValue}</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;
        return html;
    }
}
