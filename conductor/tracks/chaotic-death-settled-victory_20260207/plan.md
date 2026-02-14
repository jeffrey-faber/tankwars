# Implementation Plan: Chaotic Death Triggers & Settled Victory

## Phase 1: Match Setup Integration [checkpoint: 86b1353]
Adding the "Death Trigger Chance" setting to the game configuration and state.

- [x] Task: Update Game State Schema.
    - [x] Add `deathTriggerChance` (0 to 1) to the global `state` in `js/gameContext.js`.
- [x] Task: Update Match Setup UI.
    - [x] Add a range slider or number input for "Death Trigger Chance" in `index.html`.
    - [x] Update `js/matchSetup.js` to read this value and include it in the exported match config.
- [x] Task: Update Game Initialization.
    - [x] Ensure `js/main.js` correctly applies the `deathTriggerChance` from the match config to the global state.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Match Setup Integration' (Protocol in workflow.md)

## Phase 2: Core Death Explosion Logic
Implementing the "Last Stand" behavior where tanks explode and potentially trigger items.

- [ ] Task: Implement Death Logic Refactor.
    - [ ] Update `js/tank.js` to handle death as a sequence rather than just setting `alive = false`.
    - [ ] Create unit tests in `js/Tank.test.js` for death triggers (standard vs. item override).
- [ ] Task: Implement Standard Death Explosion.
    - [ ] Call `applyExplosionDamage` at the tank's center upon death.
- [ ] Task: Implement Item-Based Override.
    - [ ] Logic to check inventory for `nuke`, `dirtball`, `earthquake_s`, `earthquake_m`, `earthquake_l`.
    - [ ] Probability check using `state.deathTriggerChance`.
    - [ ] Trigger the item effect at the tank's center and consume the item.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Core Death Explosion Logic' (Protocol in workflow.md)

## Phase 3: Settled Victory Condition
Delaying the win check until all projectiles, terrain movements, and sequences have finished.

- [ ] Task: Tracking Active Sequences.
    - [ ] Add a `isSettling` or `activeSequences` counter to `state` in `js/gameContext.js`.
    - [ ] Update Earthquake logic to increment/decrement this counter during its crack/freeze phase.
- [ ] Task: Refactor Victory Evaluation.
    - [ ] In `js/main.js` or wherever victory is checked, add conditions: `!state.projectile.flying`, `!state.terrain.freezeGravity`, and all tanks have finished falling.
- [ ] Task: Implement Draw Condition.
    - [ ] Check if `aliveTanks.length === 0` after settling.
    - [ ] Update `showGameOverOverlay` to handle "Draw" message.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Settled Victory Condition' (Protocol in workflow.md)
