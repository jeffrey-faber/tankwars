# Plan: Store & Weapon Selection Overhaul

## Phase 1: Persistence & Game State Refactor
- [x] Task: Refactor `store.js` for session persistence
  - [x] Sub-task: Write tests for currency/inventory persisting between match resets
  - [x] Sub-task: Ensure `resetGame` logic does not clear player inventory/money
- [x] Task: Implement Lobby State in `gameContext.js`
  - [x] Sub-task: Add `gameState` ('LOBBY', 'PLAYING') to state management
  - [x] Sub-task: Write tests for state transitions
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Persistence & Game State Refactor' (Protocol in workflow.md)

## Phase 2: Lobby Store UI
- [ ] Task: Move Store UI to Lobby Phase
  - [ ] Sub-task: Update `main.js` to render the store only during 'LOBBY' state
  - [ ] Sub-task: Implement "Start Match" button to transition from Lobby to Game
- [ ] Task: Refactor Store buying logic for multiple quantities
  - [ ] Sub-task: Write tests for buying multiple items of the same type
  - [ ] Sub-task: Update UI to show quantity owned in the store
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Lobby Store UI' (Protocol in workflow.md)

## Phase 3: Icon-Based Selection & HUD
- [ ] Task: Implement Grid-Based Weapon Selection UI
  - [ ] Sub-task: Create CSS for neon grid icons
  - [ ] Sub-task: Update `draw` logic or DOM overlay to show weapon icons instead of text list
- [ ] Task: Implement Tooltips & Highlighting
  - [ ] Sub-task: Add hover event listeners for weapon stats display
  - [ ] Sub-task: Implement visual "selected" state for icons
- [ ] Task: Update HUD with Ammo Counters
  - [ ] Sub-task: Write tests for HUD ammo data binding
  - [ ] Sub-task: Display current weapon counts prominently on the screen
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Icon-Based Selection & HUD' (Protocol in workflow.md)

## Phase 4: Hotkeys & Final Polish
- [ ] Task: Implement Numeric Hotkeys (1-9)
  - [ ] Sub-task: Write tests for keydown events triggering weapon selection
  - [ ] Sub-task: Ensure hotkeys only work during active player turn
- [ ] Task: Visual Polish & Transitions
  - [ ] Sub-task: Add "Snappy" transitions between Lobby and Game states
  - [ ] Sub-task: Final pass on Neon aesthetic for all new UI components
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Hotkeys & Final Polish' (Protocol in workflow.md)
