import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MatchSetup } from './matchSetup.js';
import * as persistence from './sessionPersistence.js';

describe('MatchSetup Persistence', () => {
    let mockElements = {};

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Mock DOM Elements
        mockElements = {
            'playerList': { innerHTML: '', appendChild: vi.fn() },
            'addPlayerButton': { addEventListener: vi.fn() },
            'resetSettingsButton': { addEventListener: vi.fn() },
            'timerToggle': { addEventListener: vi.fn(), checked: false },
            'timerSeconds': { value: '30', disabled: false },
            'deathTriggerChance': { value: '10', addEventListener: vi.fn() },
            'deathTriggerValue': { textContent: '10%' },
            'matchGames': { value: '5' },
            'winCondition': { value: 'score' },
            'startingCash': { value: '100' },
            'windIntensity': { value: 'normal' },
            'mapStyle': { value: 'random' },
            'edgeBehavior': { value: 'impact' }
        };

        global.document.getElementById = vi.fn((id) => mockElements[id]);
        global.document.createElement = vi.fn(() => ({
            className: '',
            dataset: {},
            innerHTML: '',
            querySelector: vi.fn((sel) => ({ addEventListener: vi.fn() })),
            appendChild: vi.fn()
        }));
        
        // Mock localStorage
        storage = {};
        global.localStorage.getItem = vi.fn((key) => storage[key] || null);
        global.localStorage.setItem = vi.fn((key, val) => { storage[key] = val; });
        global.localStorage.removeItem = vi.fn((key) => { delete storage[key]; });
        
        // Mock window.location.reload
        global.window.location.reload = vi.fn();
        global.confirm = vi.fn(() => true);
    });

    let storage = {};

    it('should load settings from persistence on init', () => {
        const savedConfig = {
            totalGames: 10,
            winCondition: 'wins',
            startingCash: 500,
            windIntensity: 'high',
            mapStyle: 'rugged',
            edgeBehavior: 'teleport',
            deathTriggerChance: 0.25,
            turnTimer: { enabled: true, seconds: 45 },
            players: [
                { id: 1, name: 'Saved Player', type: 'human', color: 'red' },
                { id: 2, name: 'Saved Bot', type: 'bot-hard', color: 'blue' }
            ]
        };
        
        storage['tankwars_match_settings'] = JSON.stringify(savedConfig);
        
        const setup = new MatchSetup();
        
        expect(mockElements['matchGames'].value).toBe(10);
        expect(mockElements['winCondition'].value).toBe('wins');
        expect(mockElements['startingCash'].value).toBe(500);
        expect(mockElements['windIntensity'].value).toBe('high');
        expect(mockElements['mapStyle'].value).toBe('rugged');
        expect(mockElements['edgeBehavior'].value).toBe('teleport');
        expect(mockElements['deathTriggerChance'].value).toBe(25);
        expect(mockElements['timerToggle'].checked).toBe(true);
        expect(mockElements['timerSeconds'].value).toBe(45);
        expect(setup.players.length).toBe(2);
        expect(setup.players[0].name).toBe('Saved Player');
    });

    it('should reset settings when reset button is clicked', () => {
        const setup = new MatchSetup();
        const resetBtn = mockElements['resetSettingsButton'];
        
        // Find click listener
        const clickHandler = resetBtn.addEventListener.mock.calls.find(c => c[0] === 'click')[1];
        
        clickHandler();
        
        expect(global.localStorage.removeItem).toHaveBeenCalledWith('tankwars_match_settings');
        expect(global.window.location.reload).toHaveBeenCalled();
    });
});
