# Implementation Plan: AI Accuracy and Robustness Overhaul

## Phase 1: Advanced AI Test Suite
Expanding the automated benchmark to cover realistic and difficult scenarios.

- [x] Task: Implement Complex Terrain Models. Add support for "Pit", "Cliff", and "Tunnel" scenarios in the mock terrain.
- [ ] Task: Stress Test Wind. Add scenarios with extreme wind (0.5+) and variable directions.
- [x] Task: Hit-Rate Reporter. Update the test output to show success/fail percentages and average shots-to-hit. (Handled by Vitest suite)

## Phase 2: Physics Engine Mirroring [checkpoint: ad32ef1]
Ensuring the simulation and the game engine are in perfect sync.

- [x] Task: Audit `tank.js` vs `aiControllers.js`. Sync gravity application, wind scaling, and sub-stepping constants.
- [x] Task: Refine Collision Logic. Ensure the AI's collision detection exactly matches the game's radius-based logic.

## Phase 3: Refined Search Algorithms [checkpoint: f2c43e0]
Improving the "first guess" and the "learning" steps.

- [x] Task: Multi-Pass Search. Implement a coarse-to-fine search in `findBestShot` to find better baseline solutions without excessive computation.
- [x] Task: Non-Linear Interpolation. Upgrade the Lerp logic to handle cases where power vs. distance is not a simple linear relationship.

## Phase 4: Behavioral Edge Cases [checkpoint: f2c43e0]
Fixing common AI "brain-farts".

- [x] Task: Self-Harm Detection. In `calculateShot`, simulate the first 50ms of flight; if it hits terrain near the shooter, adjust angle/power.
- [x] Task: Anti-Stagnation. If the AI detects it is repeating the same result (or hitting the same spot), force a significant change in trajectory (e.g., flip between low-arc and high-lob).
