# Implementation Plan: Lobby & Store Revamp

## Phase 1: Foundation & State Management [checkpoint: 7a19d51]
This phase focuses on the core logic for the new Lobby state machine and data structures for the enhanced scoreboard.

- [x] Task: Extend Game State Machine. Update the main game logic to include a dedicated `LOBBY` state and a sub-state for `LOBBY_SHOPPING`.
- [x] Task: Implement Sequential Player Cycling. Create a controller to track whose turn it is in the lobby and handle transitions between players.
- [x] Task: Scoreboard Data Calculation. Implement utility functions to calculate "Loadout Value" and ensure total score/wins are correctly aggregated in the `Store` or a new `ScoreManager`.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Foundation & State Management' (Protocol in workflow.md)

## Phase 2: UI Infrastructure (Full-Screen Overlay) [checkpoint: 70fca7c]
Creating the HTML/CSS structure and basic show/hide logic for the new full-screen interface.

- [x] Task: Base Full-Screen Overlay. Add a container to `index.html` and styles to `style.css` for a modal-like overlay that covers the canvas.
- [x] Task: Scoreboard Component. Create the HTML template for the enhanced lobby scoreboard showing all player stats.
- [x] Task: Store Layout Skeleton. Implement the tabbed grid structure (HTML/CSS) within the full-screen overlay.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: UI Infrastructure (Full-Screen Overlay)' (Protocol in workflow.md)

## Phase 3: Store Logic & Item Grid [checkpoint: d8eab8c]
Connecting the UI to the existing `Store` class and implementing the categorized grid.

- [x] Task: Tab Navigation Logic. Implement the JavaScript to switch between categories (Weapons, Tools, etc.) in the Store UI.
- [x] Task: Dynamic Item Rendering. Write logic to populate the grid based on available items in the `Store` class, including icons, prices, and descriptions.
- [x] Task: Purchase Integration. Connect the "Buy" clicks in the new UI to the existing `store.buyItem()` logic and update the player's currency display in real-time.
- [x] Task: Finish Turn Logic. Implement the "Done" button that triggers the transition to the next player or starts the game.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Store Logic & Item Grid' (Protocol in workflow.md)

## Phase 4: Integration & Refinement
Wiring everything together and polishing the transition flows.

- [x] Task: Lobby Entry/Exit Flow. Ensure the game correctly transitions from "Setup" or "Round End" into the Lobby, and from the Lobby into the "Match".
- [x] Task: AI Skipping Logic. Ensure the sequential lobby cycle automatically passes over AI-controlled players.
- [x] Task: UI Polish & Responsiveness. Refine CSS to ensure the full-screen UI looks good at various resolutions and handle the "Ready" prompts between player turns.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Integration & Refinement' (Protocol in workflow.md)
