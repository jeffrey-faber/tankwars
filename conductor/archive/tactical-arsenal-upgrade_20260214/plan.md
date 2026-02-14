# Implementation Plan: Tactical Arsenal Expansion & AI Upgrade

## Phase 1: Weapon Rebalancing & Utility Overhaul
Implementing the new weapon tiers, resizing explosions, and updating the utility item logic (Shield/Parachute).

- [x] Task: Update Weapon Definitions. (55f8de3)
    - [x] Update `js/tank.js` `fire()` method:
        - [x] Reduce "default" weapon radius to 15.
        - [x] Implement "heavy" weapon (Radius 30, Damage 60).
        - [x] Rename "nuke" to "mega_nuke" and update stats (Radius 150, Damage 200).
        - [x] Implement "cluster_bomb" initial projectile logic.
    - [x] Update `js/store.js`:
        - [x] Add "heavy" weapon to store inventory (Pack of 5, Cost 50).
        - [x] Add "cluster_bomb" to store inventory (Pack of 3, Cost 150).
        - [x] Update "mega_nuke" entry (Single Use, Cost 500).
        - [x] Update "shield" cost to 100.
        - [x] Update "parachute" cost to 50.
- [x] Task: Fix Lingering Projectile. (79e7062)
    - [x] Update `js/tank.js` to ensure `state.projectile.x` and `y` are nullified *immediately* upon impact before the explosion animation begins.
- [x] Task: Implement Cluster Bomb Logic. (94253b9)
    - [x] Create `js/clusterBomb.test.js` to test splitting logic.
    - [x] Update `js/tank.js` to handle "cluster_bomb" specific physics:
        - [x] Detect apex of trajectory (dy changes from negative to positive).
        - [x] Spawn 5 sub-munitions with spread velocities.
- [x] Task: Update Utility Item Logic. (94253b9)
    - [x] Update `js/store.js` `purchaseItem` method:
        - [x] Allow re-purchasing Shield/Parachute to refill durability/active status.
        - [x] Enforce max capacity of 1 for these items.
    - [x] Update `js/tank.js`:
        - [x] Ensure `parachuteDurability` is correctly refilled.
        - [x] Ensure `shielded` status is correctly restored.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Weapon Rebalancing & Utility Overhaul' (Protocol in workflow.md)

## Phase 2: AI Enhancements (Mastermind & Sniper)
Upgrading the AI to intelligently use the new arsenal based on tactical analysis.

- [x] Task: Implement Clump Detection. (52290df)
    - [x] Create `js/aiTactics.test.js`.
    - [x] Add `detectClumping(target, allTanks)` helper to `js/aiControllers.js`.
    - [x] Returns true if >= 2 enemies are within 100px of the target.
- [x] Task: Implement Efficiency Calculation. (e7c1cdd)
    - [x] Add `calculateWeaponEfficiency(weapon, target, hitProbability)` to `MastermindAI`.
    - [x] Logic: Only select expensive weapons if `(PotentialDamage * HitProbability) / Cost` exceeds a threshold.
- [x] Task: Update Mastermind AI Logic. (e7c1cdd)
    - [x] Refactor `chooseWeapon` in `js/aiControllers.js`:
        - [x] Prioritize "cluster_bomb" or "mega_nuke" if Clump Detection is true.
        - [x] Use Efficiency Calculation for single targets.
    - [x] Implement Cluster Bomb targeting:
        - [x] Adjust power/angle to aim for the *apex* above the target, rather than a direct hit.
- [x] Task: Conductor - User Manual Verification 'Phase 2: AI Enhancements (Mastermind & Sniper)' (Protocol in workflow.md)
