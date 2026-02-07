# Specification: Fall Damage & Earth Shaper Weapons

## Overview
This track introduces physical consequences for falling, a new class of terrain-manipulation weapons, and a defensive utility to mitigate impact damage.

## Functional Requirements

### 1. Fall Damage System
- **Threshold + Linear Model:** Tanks falling more than a defined "Safe Height" (e.g., 50px) will take damage proportional to the excess distance.
- **Initial Immunity:** Fall damage is disabled during the initial game start spawn to prevent random deaths from terrain generation.
- **Visual Feedback:** Health reduction and impact effects should trigger upon landing.

### 2. Earth Shaper Weapons
- **Dirt Ball:**
    - Creates a cluster of solid pixels at the impact point.
    - If a tank is hit directly, it is encased (buried) in the new terrain and must fire to clear a path out.
- **Earthquake:**
    - Momentarily freezes all terrain physics (prevents immediate falling).
    - Generates fractal-style "cracks" through connected solid terrain.
    - After the sequence ends, all detached or unstable terrain falls according to standard gravity rules.
- **Shovel Shot (Circle/Cone):**
    - Deals zero or negligible damage to tanks.
    - Removes terrain in a circular or conical shape (optimized for digging).

### 3. Utility: Parachute
- **Type:** Defensive Item.
- **Activation:** Automatic deployment when a fall exceeding the safe threshold is detected.
- **Durability:** Has a "Shield HP" equal to 200% of the tank's maximum health. It absorbs fall damage until its durability reaches zero.
- **Constraint:** Players can only carry one parachute at a time.

### 4. AI Adaptation
- AI personalities must be updated to value and use the new Earth Shaper arsenal.
- **Sniper:** Uses Shovel to clear blocked lines-of-sight.
- **Mastermind:** Strategically uses Parachutes and Earthquakes.
- **Lobber/Stupid:** Uses Dirt Ball for obstruction or chaos.

## Non-Functional Requirements
- **Performance:** Fractal crack generation for the Earthquake must be optimized to prevent browser lag on complex maps.
- **Physics Parity:** Newly created terrain (Dirt Ball) must integrate perfectly with the BitmaskTerrain system.

## Acceptance Criteria
- Tanks take damage only from falls exceeding the threshold after the match begins.
- Dirt Ball successfully creates solid terrain and traps tanks.
- Earthquake cracks propagate correctly and trigger delayed physics.
- Parachute correctly reduces durability instead of tank HP during falls.
- AI utilizes the new weapons appropriately according to their personality.
