# Implementation Plan: Match Setup & Start Page Revamp

## Phase 1: Foundation & Session Management
This phase focuses on updating the game's data model to support multi-game matches and persistence of the new configuration.

- [x] Task: Extend Game State Model. Update `js/gameContext.js` to include properties for match tracking: `totalGames`, `currentGameIndex`, `winCondition`, `startingCash`, and the full player roster config. 6b64c3c
- [ ] Task: Implement Session Persistence. Create a utility to serialize/deserialize the match configuration (e.g., to `localStorage` or URL parameters) to ensure the settings persist across page reloads or round resets.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Foundation & Session Management' (Protocol in workflow.md)

## Phase 2: Match Setup UI (HTML/CSS)
Creating the new interactive setup interface that replaces the legacy start form.

- [ ] Task: Setup Page Layout. Update `index.html` and `css/style.css` to create a modern, full-screen setup overlay consistent with the Lobby UI.
- [ ] Task: Dynamic Roster UI. Implement the HTML/CSS for the player list rows, including name inputs, type dropdowns, and removal buttons.
- [ ] Task: Match Settings Form. Build the interface for configuring match structure (games, win conditions), economy (starting cash), and environmental variables (wind, map).
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Match Setup UI' (Protocol in workflow.md)

## Phase 3: Roster & Configuration Logic
Implementing the JavaScript logic that drives the setup experience and initializes the match.

- [ ] Task: Player Roster Controller. Write the JS logic to manage adding/removing players and auto-assigning default names/colors.
- [ ] Task: Config Validation & Serialization. Implement logic to validate match settings (e.g., min 2 players) and prepare the data for match start.
- [ ] Task: Match Initialization. Update the initialization sequence in `js/main.js` to consume the new roster and settings instead of the legacy URL parameters.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Roster & Configuration Logic' (Protocol in workflow.md)

## Phase 4: Match Flow & Round Transitions
Updating the core game loop to handle multi-round matches and the final return to the setup page.

- [ ] Task: Multi-Round State Machine. Update the game loop and `resetRound` logic to track match progress, aggregate scores across rounds, and determine when a match is complete.
- [ ] Task: Match Result & Reset. Create a final "Match Summary" screen that declares the overall winner based on the chosen win condition and provides a button to return to the setup page.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Match Flow & Round Transitions' (Protocol in workflow.md)
