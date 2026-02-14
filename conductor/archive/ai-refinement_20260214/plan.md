# Implementation Plan: AI Refinement

## Phase 1: Investigation & Test Enhancements [checkpoint: 636aa10]
Diagnose the root causes of the AI issues using focused test cases.

- [x] Task: Create Diagnostic Tests. (636aa10)
    - [x] Create `js/aiDebug.test.js` to log and assert shot parameters for specific scenarios (e.g., Mastermind vs nearby target, Sniper vs distant target).
    - [x] Reproduce the "Sniper Overshoot" and "Mastermind Max Power" behaviors in isolation.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Investigation & Test Enhancements' (Protocol in workflow.md)

## Phase 2: Logic Refinement [checkpoint: 636aa10]
Adjust the AI controller logic to fix the identified issues.

- [x] Task: Tune Mastermind Power & Items. (636aa10)
    - [x] Update `MastermindAI.calculateShot` to penalize excessive power in the score function if a lower power achieves a similar hit probability.
    - [x] Update `MastermindAI.chooseWeapon` to lower the "clump threshold" or increase the "value" of using items against single high-health targets.
- [x] Task: Fix Sniper Overshooting. (636aa10)
    - [x] Update `findBestShot` or `SniperAI` logic to prioritize "hitting the target" above "flat trajectory" when the error margin is significant.
    - [x] Ensure the "flattest" preference doesn't blindly select the highest power if it results in a miss.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Logic Refinement' (Protocol in workflow.md)
