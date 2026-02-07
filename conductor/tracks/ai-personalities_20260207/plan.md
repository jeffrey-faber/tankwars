# Implementation Plan: AI Personalities & Behavioral Enhancements

## Phase 1: AI Architecture Refactor [checkpoint: 8b6b14b]
Refactoring the `Tank` class to delegate AI logic to specialized controller classes.

- [~] Task: Create AI Controller Interface. Define a base `AIController` class with methods for `calculateShot(target, wind, gravity)` and `shop(store)`.
- [ ] Task: Implement Standard Controllers. Create `StandardAI` (for Easy/Med/Hard) using the existing math-based logic with adjustable error rates.
- [ ] Task: Implement Personality Controllers. Create `StupidAI`, `LobberAI`, `SniperAI`, and `MastermindAI` classes with their unique firing strategies.
- [ ] Task: Integrate with Tank Class. Update `js/tank.js` to instantiate the correct controller based on the tank's `aiLevel` or `personality` type.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: AI Architecture Refactor' (Protocol in workflow.md)

## Phase 2: Combat Logic & Learning
Implementing the specific firing behaviors and the "zeroing in" mechanic.

- [x] Task: Implement "Mr. Stupid" Logic. Add high randomness and potential for self-harm (e.g., negative power/angle offsets).
- [x] Task: Implement "Lobber" & "Sniper" Logic. Constrain their firing angles (Lobber: 60-85°, Sniper: 0-20°) and optimize power for those trajectories.
- [x] Task: Implement "Mastermind" Simulation. Create a physics-based shot simulator that iterates to find the perfect angle/power, refining its solution based on the previous shot's error.
- [x] Task: Implement Target Memory. Update `Tank.js` to store the last target and shot result, allowing the AI to reduce error for consecutive shots at the same target.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Combat Logic & Learning' (Protocol in workflow.md)

## Phase 3: Shopping Intelligence
customizing store behavior for each personality.

- [ ] Task: Update Store Logic. Modify `js/store.js` or the AI controllers to handle shopping.
- [ ] Task: Personality Shopping Lists.
    - **Sniper:** Prioritize 'Laser'.
    - **Lobber:** Prioritize 'Nuke'.
    - **Mastermind:** Balance Health/Shields/Weapons based on current state.
    - **Stupid:** Random purchases.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Shopping Intelligence' (Protocol in workflow.md)

## Phase 4: UI Integration
Connecting the new AI types to the Match Setup screen.

- [x] Task: Update Setup Dropdown. Modify `js/matchSetup.js` to populate the player type dropdown with the new personality options.
- [x] Task: Default Naming Logic. Update the player adding logic to auto-generate names based on the selected type (e.g., "Sniper 1").
- [x] Task: "Random" Bot Logic. Implement the logic to resolve "Bot: Random" into a specific personality when the match initializes.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: UI Integration' (Protocol in workflow.md)
