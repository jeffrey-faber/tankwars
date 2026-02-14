# Specification: Chaotic Death Triggers & Settled Victory

## Overview
This track introduces a new tactical layer where killing an opponent can be dangerous. Tanks will now always explode upon destruction, with a configurable chance to trigger a powerful "Last Stand" item from their inventory. Additionally, the victory condition will be delayed to ensure all chain reactions and physics have settled.

## Functional Requirements

### 1. Death Explosions
- **Guaranteed Impact:** Every tank death triggers a "Standard Death Explosion" (Radius: 30, Damage: 50).
- **Item-Based Override:** 
    - If a tank has qualifying items in its inventory, there is a configurable percentage chance that one random item will trigger **instead** of the standard explosion.
    - Eligible items: `nuke`, `dirtball`, `earthquake_s`, `earthquake_m`, `earthquake_l`.
    - Items activate at the tank's center coordinates (Static Impact).
    - The triggered item is consumed from the tank's inventory.

### 2. Match Setup Integration
- **New Setting:** "Death Trigger Chance" (Slider or Input, 0% to 100%).
- This setting persists in the game state and governs the likelihood of an item-based override occurring upon death.

### 3. Settled Victory Condition
- **Physics Wait:** The game will no longer declare a winner immediately when only one tank remains.
- **Settlement Checks:** Victory is only evaluated when:
    1. No projectiles are in the air.
    2. No terrain physics are active (gravity settled).
    3. No timed sequences are running (e.g., Earthquake freeze/crack duration).
- **Draw Handling:** If the final chain reaction destroys all remaining tanks, the game will declare a "Draw" or "Mutual Destruction."

## Non-Functional Requirements
- **Recursion Safety:** Ensure that death explosions triggering other deaths (chain reactions) does not cause a stack overflow or infinite loop.
- **UI Feedback:** Clear messaging when a match results in a draw.

## Acceptance Criteria
- Tanks consistently explode on death.
- Confirmed "Last Stand" triggers for Nukes and Earthquakes when the chance roll succeeds.
- Match results are accurately determined only after all movement and item effects stop.
- "Death Trigger Chance" setting correctly modulates the frequency of item triggers.
