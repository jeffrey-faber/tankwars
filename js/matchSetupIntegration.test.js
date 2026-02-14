import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MatchSetup } from './matchSetup.js';

describe('Match Setup Integration', () => {
    let mockElements = {};

    beforeEach(() => {
        mockElements = {
            'playerList': { innerHTML: '', appendChild: vi.fn() },
            'addPlayerButton': { addEventListener: vi.fn() },
            'timerToggle': { addEventListener: vi.fn(), checked: false },
            'timerSeconds': { value: '30', disabled: false },
            'deathTriggerChance': { value: '15', addEventListener: vi.fn() },
            'deathTriggerValue': { textContent: '' },
            'matchGames': { value: '5' },
            'winCondition': { value: 'score' },
            'startingCash': { value: '100' },
            'windIntensity': { value: 'normal' },
            'mapStyle': { value: 'random' }
        };

        global.document = {
            getElementById: vi.fn((id) => mockElements[id]),
            createElement: vi.fn(() => ({
                className: '',
                dataset: {},
                innerHTML: '',
                querySelector: vi.fn((sel) => ({ addEventListener: vi.fn() })),
                appendChild: vi.fn()
            }))
        };
    });

    it('should include deathTriggerChance in the config', () => {
        const setup = new MatchSetup();
        const config = setup.getConfig();
        expect(config.deathTriggerChance).toBe(0.15);
    });

    it('should update display when slider moves', () => {
        const setup = new MatchSetup();
        const slider = mockElements['deathTriggerChance'];
        const display = mockElements['deathTriggerValue'];
        
        // Get the listener
        const listener = slider.addEventListener.mock.calls.find(c => c[0] === 'input')[1];
        
        slider.value = '50';
        listener({ target: { value: '50' } });
        
        expect(display.textContent).toBe('50%');
    });
});