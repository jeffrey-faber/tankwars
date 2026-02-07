# Specification: Lobby & Store Revamp

## Overview
This track aims to replace the current minimalist shop with a more robust, sequential "Lobby Phase". This phase will facilitate a better hot-seat experience by allowing each human player to manage their inventory in private, while providing a clear overview of the game's competitive standing through an enhanced scoreboard.

## Functional Requirements

### 1. Sequential Lobby Phase
- Implement a transition phase between rounds (or at game start) called the "Lobby".
- The game will cycle through all human players sequentially.
- For each player, a "Ready" screen will prompt them to enter the store (e.g., "Player 1: Press any key to enter the Store").
- Players exit their store turn by clicking a "Done" or "Finish Shopping" button.
- AI players will skip this interactive phase (their shopping logic remains automated).

### 2. Full-Screen Store UI
- Replace the existing HUD-based store with a full-screen overlay.
- **Categorization:** Use tabs to organize items (e.g., Weapons, Specials, Utility).
- **Grid Layout:** Display items within each category in a clear grid with larger icons and legible price tags.
- **Item Details:** Clicking or hovering over an item should show a description of its effects.

### 3. Enhanced Lobby Scoreboard
- A persistent or transition screen in the lobby showing a table of all players.
- **Data Columns:**
    - Player Name/Color.
    - Total Score (Cumulative).
    - Current Currency (Balance).
    - Wins/Kills (Match stats).
    - Loadout Value (Sum of item costs in inventory).

## Non-Functional Requirements
- **Responsive Layout:** The full-screen UI should adapt to different browser window sizes.
- **TDD Adherence:** Core logic for the state machine (Lobby -> Player Store -> Next Player) must be unit tested.

## Acceptance Criteria
- [ ] The game enters a "Lobby" state after player setup or between rounds.
- [ ] Each human player is prompted to enter the store one by one.
- [ ] The store UI occupies the full screen and uses a tabbed grid layout.
- [ ] The scoreboard correctly calculates and displays Total Score, Money, Wins/Kills, and Loadout Value.
- [ ] Clicking "Finish" for the last player starts the match.

## Out of Scope
- Real-time multiplayer (this is strictly for local hot-seat).
- Cosmetic item skins.
