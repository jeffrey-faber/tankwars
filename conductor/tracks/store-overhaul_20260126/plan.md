# Plan: Store & Weapon Selection Overhaul

## Phase 1: Persistence & Game State Refactor [checkpoint: 6a9e36f]
- [x] Task: Refactor `store.js` for session persistence
  - [x] Sub-task: Write tests for currency/inventory persisting between match resets
  - [x] Sub-task: Ensure `resetGame` logic does not clear player inventory/money
- [x] Task: Implement Lobby State in `gameContext.js`
  - [x] Sub-task: Add `gameState` ('LOBBY', 'PLAYING') to state management
  - [x] Sub-task: Write tests for state transitions
- [x] Task: Conductor - User Manual Verification 'Phase 1: Persistence & Game State Refactor' (Protocol in workflow.md)

## Phase 2: Lobby Store UI [checkpoint: 62059a4]
- [x] Task: Move Store UI to Lobby Phase
  - [x] Sub-task: Update `main.js` to render the store only during 'LOBBY' state
  - [x] Sub-task: Implement "Start Match" button to transition from Lobby to Game
- [x] Task: Refactor Store buying logic for multiple quantities
  - [x] Sub-task: Write tests for buying multiple items of the same type
  - [x] Sub-task: Update UI to show quantity owned in the store
- [x] Task: Conductor - User Manual Verification 'Phase 2: Lobby Store UI' (Protocol in workflow.md)

## Phase 3: Icon-Based Selection & HUD [checkpoint: ffa12e5]
- [x] Task: Implement Grid-Based Weapon Selection UI
  - [x] Sub-task: Create CSS for neon grid icons
  - [x] Sub-task: Update `draw` logic or DOM overlay to show weapon icons instead of text list
- [x] Task: Implement Tooltips & Highlighting
  - [x] Sub-task: Add hover event listeners for weapon stats display
  - [x] Sub-task: Implement visual "selected" state for icons
- [x] Task: Update HUD with Ammo Counters
  - [x] Sub-task: Write tests for HUD ammo data binding
  - [x] Sub-task: Display current weapon counts prominently on the screen
- [x] Task: Conductor - User Manual Verification 'Phase 3: Icon-Based Selection & HUD' (Protocol in workflow.md)

## Phase 4: Hotkeys & Final Polish [checkpoint: 69cafd6]
- [x] Task: Implement Numeric Hotkeys (1-9)
  - [x] Sub-task: Write tests for keydown events triggering weapon selection
  - [x] Sub-task: Ensure hotkeys only work during active player turn
- [x] Task: Visual Polish & Transitions
  - [x] Sub-task: Add "Snappy" transitions between Lobby and Game states
  - [x] Sub-task: Final pass on Neon aesthetic for all new UI components
- [x] Task: Conductor - User Manual Verification 'Phase 4: Hotkeys & Final Polish' (Protocol in workflow.md)
