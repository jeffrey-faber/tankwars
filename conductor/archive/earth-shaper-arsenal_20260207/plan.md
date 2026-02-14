# Implementation Plan: Fall Damage & Earth Shaper Weapons

## Phase 1: Fall Damage System [checkpoint: 4f05501]
Implementing physical consequences for tank falls with safety thresholds.

- [x] Task: Define Fall Damage Logic.
    - [x] Add `safeFallHeight` and `fallDamageMultiplier` to game constants.
    - [x] Implement `lastSolidY` tracking in `Tank` class to measure fall distance.
- [x] Task: Implement Fall Damage Calculation.
    - [x] Create unit tests for damage thresholds.
    - [x] Implement health reduction in `applyGravity`.
    - [x] Add check for `isInitialSpawn` to prevent damage at game start.
- [x] Task: Visual Impact Effects.
    - [x] Add camera shake or particle effect on high-damage landings.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Fall Damage System' (Protocol in workflow.md)

## Phase 2: Basic Earth Shaper Weapons & Utility [checkpoint: pending]
Implementing Dirt Ball and Shovel weapons along with store integration.

- [x] Task: Implement Dirt Ball Weapon.
    - [x] Create unit tests for terrain generation at impact.
    - [x] Implement projectile logic that calls `terrain.addTerrain(x, y, radius)`.
    - [x] Implement "Encase" logic for direct tank hits.
- [x] Task: Implement Shovel Shot.
    - [x] Create unit tests for circle/cone terrain removal.
    - [x] Implement weapon variants for Shovel (Circle and Cone modes).
- [x] Task: Store Integration.
    - [x] Add Dirt Ball and Shovel to `Store` items.
    - [x] Update HUD to display new weapon types.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Basic Earth Shaper Weapons & Utility' (Protocol in workflow.md)

## Phase 3: Earthquake Weapon [checkpoint: pending]
Implementing complex fractal destruction and delayed physics.

- [x] Task: Fractal Crack Algorithm.
    - [x] Implement recursive function to generate thin lines of "cracks" through connected pixels.
    - [x] Optimize algorithm to prevent UI blocking.
- [x] Task: Earthquake Sequence Logic.
    - [x] Implement `freezeTerrainPhysics` toggle.
    - [x] Create sequence: Freeze -> Generate Cracks -> Unfreeze & Trigger Fall.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Earthquake Weapon' (Protocol in workflow.md)

## Phase 4: Parachute System [checkpoint: pending]
Implementing the defensive parachute utility.

- [x] Task: Implement Parachute Item.
    - [x] Add `parachuteDurability` property to `Tank` (200% of max HP).
    - [x] Implement automatic deployment logic when falling > threshold.
- [x] Task: Fall Mitigation.
    - [x] Update damage logic to subtract from `parachuteDurability` before tank health.
    - [x] Add visual "Parachute" sprite/animation during deployment.
- [x] Task: Conductor - User Manual Verification 'Phase 4: Parachute System' (Protocol in workflow.md)

## Phase 5: AI Adaptation [checkpoint: pending]
Teaching AI personalities to use the new arsenal effectively.

- [x] Task: Sniper AI Shovel Logic.
    - [x] Implement terrain-raycast to detect blocked shots.
    - [x] Teach Sniper to switch to Shovel when line-of-sight is blocked by thin terrain.
- [x] Task: General AI Utility Logic.
    - [x] Teach Mastermind/Standard to buy/use Parachute if maps are vertical.
    - [x] Teach Lobber/Stupid to use Dirt Ball for chaos or encasing.
- [x] Task: Conductor - User Manual Verification 'Phase 5: AI Adaptation' (Protocol in workflow.md)