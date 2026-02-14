# Specification: AI Shot Calculation & Item Usage Refinement

## Overview
This track addresses reported issues with `MastermindAI` (excessive power, rare item usage) and `SniperAI` (chronic overshooting). The goal is to fine-tune their logic to ensure they perform according to their design specifications: Masterminds should be precise and tactical, while Snipers should be deadly accurate with high-velocity shots.

## Functional Requirements

### 1. MastermindAI Refinement
- **Power Optimization:** Analyze and adjust the `findBestShot` parameters to prevent the AI from defaulting to max power unnecessarily, especially in the early game.
- **Item Usage Frequency:** Review `chooseWeapon` and `shop` logic to lower the thresholds or increase the probability of using special items, making the Mastermind more aggressive with its arsenal.
- **Trajectory Selection:** Ensure the dual-trajectory simulation correctly penalizes "risky" high-power shots when a lower-power, safer arc is available.

### 2. SniperAI Refinement
- **Overshoot Correction:** Investigate the "flattest" trajectory preference. It's likely biasing towards the highest possible power (100) even when a slightly lower power would result in a direct hit. Adjust the scoring to favor hits over raw flatness if the error margin is too high.
- **Precision Tuning:** Tighten the `findBestShot` error thresholds for the Sniper to prioritize accuracy over strict trajectory adherence.

## Acceptance Criteria
- [ ] MastermindAI selects reasonable power levels for initial shots (e.g., ~50-70 instead of 100).
- [ ] MastermindAI frequently uses available special items (Mega Nuke, Cluster Bomb) when appropriate.
- [ ] SniperAI consistently hits targets with direct shots, rather than overshooting.
- [ ] Both AIs demonstrate improved win rates in the `aiAccuracy.test.js` benchmark.
