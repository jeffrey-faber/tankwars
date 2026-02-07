
import { describe, it, expect, beforeEach } from 'vitest';
import { LobbyManager } from './lobbyManager.js';

describe('LobbyManager', () => {
    let tanks;
    let lobbyManager;

    beforeEach(() => {
        tanks = [
            { name: 'P1', isAI: false },
            { name: 'P2', isAI: false },
            { name: 'AI1', isAI: true },
            { name: 'P3', isAI: false }
        ];
        lobbyManager = new LobbyManager(tanks);
    });

    it('should start with the first human player', () => {
        lobbyManager.start();
        expect(lobbyManager.getCurrentPlayerIndex()).toBe(0);
        expect(lobbyManager.isDone()).toBe(false);
    });

    it('should advance to the next human player', () => {
        lobbyManager.start();
        lobbyManager.next();
        expect(lobbyManager.getCurrentPlayerIndex()).toBe(1);
    });

    it('should skip AI players', () => {
        lobbyManager.start(); // P1
        lobbyManager.next();  // P2
        lobbyManager.next();  // Should skip AI1 (index 2) and go to P3 (index 3)
        expect(lobbyManager.getCurrentPlayerIndex()).toBe(3);
    });

    it('should be done when all human players have finished', () => {
        lobbyManager.start(); // P1
        lobbyManager.next();  // P2
        lobbyManager.next();  // P3
        lobbyManager.next();  // Done
        expect(lobbyManager.isDone()).toBe(true);
    });

    it('should return null if no human players', () => {
        const aiTanks = [{ name: 'AI1', isAI: true }];
        const aiLobby = new LobbyManager(aiTanks);
        aiLobby.start();
        expect(aiLobby.isDone()).toBe(true);
    });
});
