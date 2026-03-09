import { getRandomColor } from './utils.js';
import { loadMatchSettings, clearMatchSettings } from './sessionPersistence.js';

export class MatchSetup {
    constructor() {
        this.playerList = document.getElementById('playerList');
        this.addPlayerBtn = document.getElementById('addPlayerButton');
        this.resetSettingsBtn = document.getElementById('resetSettingsButton');
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
        
        if (this.resetSettingsBtn) {
            this.resetSettingsBtn.addEventListener('click', () => {
                if (confirm('Reset all settings to defaults?')) {
                    clearMatchSettings();
                    window.location.reload();
                }
            });
        }

        this.timerToggle.addEventListener('change', (e) => {
            this.timerSeconds.disabled = !e.target.checked;
        });

        if (this.deathTriggerSlider) {
            this.deathTriggerSlider.addEventListener('input', () => {
                this.deathTriggerDisplay.textContent = this.deathTriggerSlider.value + '%';
            });
        }

        // Try to load saved settings
        const savedSettings = loadMatchSettings();
        if (savedSettings) {
            this.applyConfig(savedSettings);
        } else {
            // Add default players
            this.addPlayer('Player 1', 'human');
            for (let i = 2; i <= 4; i++) {
                this.addPlayer(`Player ${i}`, 'bot-medium');
            }
        }
    }

    applyConfig(config) {
        // Apply basic settings
        if (config.totalGames) document.getElementById('matchGames').value = config.totalGames;
        if (config.winCondition) document.getElementById('winCondition').value = config.winCondition;
        if (config.startingCash !== undefined) document.getElementById('startingCash').value = config.startingCash;
        if (config.windIntensity) document.getElementById('windIntensity').value = config.windIntensity;
        if (config.mapStyle) document.getElementById('mapStyle').value = config.mapStyle;
        if (config.edgeBehavior) document.getElementById('edgeBehavior').value = config.edgeBehavior;
        
        if (config.deathTriggerChance !== undefined) {
            const val = Math.round(config.deathTriggerChance * 100);
            this.deathTriggerSlider.value = val;
            this.deathTriggerDisplay.textContent = val + '%';
        }

        if (config.turnTimer) {
            this.timerToggle.checked = config.turnTimer.enabled;
            this.timerSeconds.value = config.turnTimer.seconds;
            this.timerSeconds.disabled = !config.turnTimer.enabled;
        }

        // Apply players
        if (config.players && config.players.length > 0) {
            this.players = config.players;
            this.renderAllPlayers();
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
                <option value="bot-commander" ${player.type === 'bot-commander' ? 'selected' : ''}>Bot (Bitwise Commander - 80s Ed)</option>
                <option value="bot-mastermind" ${player.type === 'bot-mastermind' ? 'selected' : ''}>Bot (Mastermind)</option>
                <option value="bot-nemesis" ${player.type === 'bot-nemesis' ? 'selected' : ''}>Bot (Nemesis)</option>
                <option value="bot-ghost" ${player.type === 'bot-ghost' ? 'selected' : ''}>Bot (The Ghost)</option>
                <option value="bot-singularity" ${player.type === 'bot-singularity' ? 'selected' : ''}>Bot (Singularity - UNFAIR)</option>
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
            edgeBehavior: document.getElementById('edgeBehavior').value,
            turnTimer: {
                enabled: this.timerToggle.checked,
                seconds: parseInt(this.timerSeconds.value)
            }
        };
    }
}
