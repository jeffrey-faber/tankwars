import { getRandomColor } from './utils.js';

export class MatchSetup {
    constructor() {
        this.playerList = document.getElementById('playerList');
        this.addPlayerBtn = document.getElementById('addPlayerButton');
        this.timerToggle = document.getElementById('timerToggle');
        this.timerSeconds = document.getElementById('timerSeconds');
        this.deathTriggerSlider = document.getElementById('deathTriggerChance');
        this.deathTriggerDisplay = document.getElementById('deathTriggerValue');
        this.maxPlayers = 8;
        
        this.players = [];
        this.init();
    }

    init() {
        if (!this.playerList) return;

        this.addPlayerBtn.addEventListener('click', () => this.addPlayer());
        this.timerToggle.addEventListener('change', (e) => {
            this.timerSeconds.disabled = !e.target.checked;
        });

        if (this.deathTriggerSlider) {
            // Set initial value
            this.deathTriggerDisplay.textContent = this.deathTriggerSlider.value + '%';
            
            this.deathTriggerSlider.addEventListener('input', () => {
                this.deathTriggerDisplay.textContent = this.deathTriggerSlider.value + '%';
            });
        }

        // Add default players
        this.addPlayer('Player 1', 'human');
        for (let i = 2; i <= 4; i++) {
            this.addPlayer(`Player ${i}`, 'bot-medium');
        }
    }

    addPlayer(name = '', type = 'human') {
        if (this.players.length >= this.maxPlayers) return;

        const playerIndex = this.players.length + 1;
        const playerName = name || `Player ${playerIndex}`;
        const playerColor = getRandomColor();
        
        const playerObj = {
            id: Date.now() + Math.random(),
            name: playerName,
            type: type,
            color: playerColor
        };

        this.players.push(playerObj);
        this.renderPlayerRow(playerObj);
    }

    removePlayer(id) {
        if (this.players.length <= 2) {
            alert('A match requires at least 2 players.');
            return;
        }
        this.players = this.players.filter(p => p.id !== id);
        this.renderAllPlayers();
    }

    renderPlayerRow(player) {
        const row = document.createElement('div');
        row.className = 'player-row';
        row.dataset.id = player.id;
        
        row.innerHTML = `
            <div class="color-swatch" style="background-color: ${player.color}"></div>
            <input type="text" class="player-name-input" value="${player.name}" placeholder="Name">
            <select class="player-type-select">
                <option value="human" ${player.type === 'human' ? 'selected' : ''}>Human</option>
                <option value="bot-easy" ${player.type === 'bot-easy' ? 'selected' : ''}>Bot (Easy)</option>
                <option value="bot-medium" ${player.type === 'bot-medium' ? 'selected' : ''}>Bot (Medium)</option>
                <option value="bot-hard" ${player.type === 'bot-hard' ? 'selected' : ''}>Bot (Hard)</option>
                <option value="bot-stupid" ${player.type === 'bot-stupid' ? 'selected' : ''}>Bot (Mr. Stupid)</option>
                <option value="bot-lobber" ${player.type === 'bot-lobber' ? 'selected' : ''}>Bot (Lobber)</option>
                <option value="bot-sniper" ${player.type === 'bot-sniper' ? 'selected' : ''}>Bot (Sniper)</option>
                <option value="bot-mastermind" ${player.type === 'bot-mastermind' ? 'selected' : ''}>Bot (Mastermind)</option>
                <option value="bot-random" ${player.type === 'bot-random' ? 'selected' : ''}>Bot (Random)</option>
            </select>
            <button class="remove-player-btn">×</button>
        `;

        // Event listeners for dynamic updates
        row.querySelector('.player-name-input').addEventListener('input', (e) => {
            player.name = e.target.value;
        });

        row.querySelector('.player-type-select').addEventListener('change', (e) => {
            player.type = e.target.value;
        });

        row.querySelector('.remove-player-btn').addEventListener('click', () => {
            this.removePlayer(player.id);
        });

        this.playerList.appendChild(row);
    }

    renderAllPlayers() {
        this.playerList.innerHTML = '';
        this.players.forEach(p => this.renderPlayerRow(p));
    }

    getConfig() {
        return {
            players: this.players,
            totalGames: parseInt(document.getElementById('matchGames').value),
            winCondition: document.getElementById('winCondition').value,
            startingCash: parseInt(document.getElementById('startingCash').value),
            deathTriggerChance: parseInt(this.deathTriggerSlider.value) / 100,
            windIntensity: document.getElementById('windIntensity').value,
            mapStyle: document.getElementById('mapStyle').value,
            turnTimer: {
                enabled: this.timerToggle.checked,
                seconds: parseInt(this.timerSeconds.value)
            }
        };
    }
}
