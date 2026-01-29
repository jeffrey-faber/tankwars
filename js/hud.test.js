import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state, drawHUD } from './gameContext.js';

describe('HUD', () => {
    beforeEach(() => {
        state.tanks = [{ 
            name: 'Player 1', 
            angle: 0, 
            power: 50, 
            score: 0, 
            currency: 100, 
            health: 100, 
            selectedWeapon: 'default',
            inventory: []
        }];
        state.currentPlayer = 0;
        state.wind = 0;
        state.ctx = {
            fillText: vi.fn(),
            font: '',
            fillStyle: ''
        };
    });

    it('should display weapon name without count for default weapon', () => {
        drawHUD();
        expect(state.ctx.fillText).toHaveBeenCalledWith('Weapon: default', 10, 160);
    });

    it('should display weapon name with count for special weapons', () => {
        state.tanks[0].selectedWeapon = 'nuke';
        state.tanks[0].inventory = [{ id: 'nuke' }, { id: 'nuke' }];
        
        drawHUD();
        expect(state.ctx.fillText).toHaveBeenCalledWith('Weapon: nuke (2)', 10, 160);
    });
});
