# Implementation Plan: Fall Damage & Earth Shaper Weapons

## Phase 1: Fall Damage System
Implementing physical consequences for tank falls with safety thresholds.

- [x] Task: Define Fall Damage Logic.
    - [x] Add `safeFallHeight` and `fallDamageMultiplier` to game constants.
    - [x] Implement `lastSolidY` tracking in `Tank` class to measure fall distance.
- [x] Task: Implement Fall Damage Calculation.
    - [x] Create unit tests for damage thresholds.
    - [x] Implement health reduction in `applyGravity`.
    - [x] Add check for `isInitialSpawn` to prevent damage at game start.
- [ ] Task: Visual Impact Effects.
    - [ ] Add camera shake or particle effect on high-damage landings.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Fall Damage System' (Protocol in workflow.md)

## Phase 2: Basic Earth Shaper Weapons & Utility
Implementing Dirt Ball and Shovel weapons along with store integration.

- [ ] Task: Implement Dirt Ball Weapon.
    - [ ] Create unit tests for terrain generation at impact.
    - [ ] Implement projectile logic that calls `terrain.addTerrain(x, y, radius)`.
    - [ ] Implement "Encase" logic for direct tank hits.
- [ ] Task: Implement Shovel Shot.
    - [ ] Create unit tests for circle/cone terrain removal.
    - [ ] Implement weapon variants for Shovel (Circle and Cone modes).
- [ ] Task: Store Integration.
    - [ ] Add Dirt Ball and Shovel to `Store` items.
    - [ ] Update HUD to display new weapon types.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Basic Earth Shaper Weapons & Utility' (Protocol in workflow.md)

## Phase 3: Earthquake Weapon
Implementing complex fractal destruction and delayed physics.

- [ ] Task: Fractal Crack Algorithm.
    - [ ] Implement recursive function to generate thin lines of "cracks" through connected pixels.
    - [ ] Optimize algorithm to prevent UI blocking.
- [ ] Task: Earthquake Sequence Logic.
    - [ ] Implement `freezeTerrainPhysics` toggle.
    - [ ] Create sequence: Freeze -> Generate Cracks -> Unfreeze & Trigger Fall.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Earthquake Weapon' (Protocol in workflow.md)

## Phase 4: Parachute System
Implementing the defensive parachute utility.

- [ ] Task: Implement Parachute Item.
    - [ ] Add `parachuteDurability` property to `Tank` (200% of max HP).
    - [ ] Implement automatic deployment logic when falling > threshold.
- [ ] Task: Fall Mitigation.
    - [ ] Update damage logic to subtract from `parachuteDurability` before tank health.
    - [ ] Add visual "Parachute" sprite/animation during deployment.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Parachute System' (Protocol in workflow.md)

## Phase 5: AI Adaptation
Teaching AI personalities to use the new arsenal effectively.

- [ ] Task: Sniper AI Shovel Logic.
    - [ ] Implement terrain-raycast to detect blocked shots.
    - [ ] Teach Sniper to switch to Shovel when line-of-sight is blocked by thin terrain.
- [ ] Task: General AI Utility Logic.
    - [ ] Teach Mastermind/Standard to buy/use Parachute if maps are vertical.
    - [ ] Teach Lobber/Stupid to use Dirt Ball for chaos or encasing.
- [ ] Task: Conductor - User Manual Verification 'Phase 5: AI Adaptation' (Protocol in workflow.md)
