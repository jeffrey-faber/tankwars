# Specification: AI Personalities & Behavioral Enhancements

## Overview
This track focuses on overhauling the AI to introduce distinct personalities ("Mr. Stupid", "Lobber", "Sniper", "Mastermind") alongside standard difficulty tiers. Each personality will have unique firing strategies, shopping preferences, and learning curves.

## Functional Requirements

### 1. New AI Personalities
- **Mr. Stupid:**
    - **Combat:** High random error. Frequent self-damage (friendly fire enabled). Often ignores wind.
    - **Shopping:** Buys random items or nothing.
- **Lobber:**
    - **Combat:** Prefers high-angle shots (60°-85°). Effective against terrain cover.
    - **Shopping:** Prioritizes explosive weapons (Nukes) to maximize splash damage.
- **Sniper:**
    - **Combat:** Prefers low-angle, high-velocity shots. Aims for direct hits.
    - **Shopping:** Prioritizes Lasers and accuracy-enhancing items.
- **Mastermind:**
    - **Combat:** Uses advanced "test shot" simulations. Accuracy drastically improves with each consecutive shot at the same target (near 100% by the 3rd shot). Accounts for wind and gravity perfectly.
    - **Shopping:** Tactical purchasing (Shields when low HP, strong weapons for finishing blows).

### 2. Standard AI Enhancements
- **Learning Curve:** All non-stupid AI (Easy, Medium, Hard) will "zero in" on a target. If a shot misses, the next shot at the same target will have reduced error variance.
- **Simulation Models:**
    - **Mastermind:** Uses physics simulation based on previous shot outcomes.
    - **Standard (Easy/Med/Hard):** Uses internal math formulas with varying error rates.

### 3. Match Setup Integration
- **Roster Configuration:**
    - The "Type/Difficulty" dropdown will be expanded to include:
        - `Human`
        - `Bot: Mr. Stupid`
        - `Bot: Easy`
        - `Bot: Medium`
        - `Bot: Hard`
        - `Bot: Lobber`
        - `Bot: Sniper`
        - `Bot: Mastermind`
        - `Bot: Random` (Randomly assigns one of the above personalities).
- **Naming Convention:** Default names for bots will reflect their personality (e.g., "Mr. Stupid 1", "Sniper 2").

## Non-Functional Requirements
- **Code Structure:** Refactor `Tank.js` to use a Strategy Pattern or modular AI controllers for easier personality management.
- **Performance:** Ensure advanced simulations (Mastermind) do not cause frame drops.

## Acceptance Criteria
- [ ] Match Setup dropdown includes all new AI types.
- [ ] Selecting "Bot: Random" correctly assigns a random personality at match start.
- [ ] "Mr. Stupid" visibly plays poorly (misses, self-hits).
- [ ] "Mastermind" visibly improves accuracy over 3 turns against a stationary target.
- [ ] "Sniper" and "Lobber" exhibit their preferred firing angles.
- [ ] Bots purchase items relevant to their personality in the store.
