import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveMatchSettings, loadMatchSettings } from './sessionPersistence.js';

describe('Session Persistence Utility', () => {
    beforeEach(() => {
        // Mock localStorage
        const localStorageMock = (() => {
            let store = {};
            return {
                getItem: (key) => store[key] || null,
                setItem: (key, value) => { store[key] = value.toString(); },
                clear: () => { store = {}; }
            };
        })();
        vi.stubGlobal('localStorage', localStorageMock);
    });

    it('should save match settings to localStorage', () => {
        const settings = {
            totalGames: 10,
            winCondition: 'wins',
            startingCash: 500,
            playerRosterConfig: [{ name: 'Player 1', type: 'human' }]
        };
        saveMatchSettings(settings);
        const saved = JSON.parse(localStorage.getItem('tankwars_match_settings'));
        expect(saved).toEqual(settings);
    });

    it('should load match settings from localStorage', () => {
        const settings = {
            totalGames: 3,
            winCondition: 'score',
            startingCash: 200,
            playerRosterConfig: [{ name: 'Bot 1', type: 'bot-easy' }]
        };
        localStorage.setItem('tankwars_match_settings', JSON.stringify(settings));
        const loaded = loadMatchSettings();
        expect(loaded).toEqual(settings);
    });

    it('should return null if no settings are found', () => {
        const loaded = loadMatchSettings();
        expect(loaded).toBeNull();
    });
});