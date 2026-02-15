# Implementation Plan: Arena Border Behaviors

This plan implements the "Edge Behavior" match setting, allowing projectiles to reflect, teleport, or impact based on the active round rule.

## Phase 1: Setup and State Management [checkpoint: c70c78d]
- [x] Task: Update `gameContext.js` state to include `edgeBehavior` and `edgeBehaviors` (constants). 76d187b
- [x] Task: Implement `selectRandomEdgeBehavior()` helper in `js/utils.js`. d1486b6
- [x] Task: Conductor - User Manual Verification 'Phase 1: Setup and State Management' (Protocol in workflow.md)

## Phase 2: Match Setup UI [checkpoint: 92de7c2]
- [x] Task: Add "Edge Behavior" select menu to `index.html` (Match Setup Overlay). c8d7bf3
- [x] Task: Update `js/matchSetup.js` to capture the new setting and pass it to `initGameFromConfig`. 6644350
- [x] Task: Update `js/main.js` (`initGameFromConfig`) to store the chosen behavior in the global state. 034bda3
- [x] Task: Conductor - User Manual Verification 'Phase 2: Match Setup UI' (Protocol in workflow.md)

## Phase 3: Round Logic & HUD [checkpoint: d3abd21]
- [x] Task: Update `resetRound` in `js/main.js` to handle "Random" selection at the start of each round. e93a4d6
- [x] Task: Update `drawHUD` in `js/gameContext.js` to display the active Edge Rule. ba09268
- [x] Task: Conductor - User Manual Verification 'Phase 3: Round Logic & HUD' (Protocol in workflow.md)

## Phase 4: Physics Engine Implementation
- [ ] Task: Implement TDD for **Reflect** logic:
    - [ ] Write tests for side-wall and top-wall reflection in a new `js/edgePhysics.test.js`.
    - [ ] Update `Projectile.update` (or equivalent loop in `js/tank.js`) to handle reflections.
- [ ] Task: Implement TDD for **Teleport** logic:
    - [ ] Write tests for wrap-around behavior in `js/edgePhysics.test.js`.
    - [ ] Update projectile logic to handle X-coordinate teleportation.
- [ ] Task: Refine **Impact** (Standard) logic to ensure it respects the new toggle system.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Physics Engine Implementation' (Protocol in workflow.md)

## Phase 5: AI & Final Polish
- [ ] Task: Update AI simulation in `js/aiControllers.js` to be "Edge Aware" (so Mastermind can use bounces/wraps for shots).
- [ ] Task: Final system-wide verification of all edge behaviors in various terrain types.
- [ ] Task: Conductor - User Manual Verification 'Phase 5: AI & Final Polish' (Protocol in workflow.md)
