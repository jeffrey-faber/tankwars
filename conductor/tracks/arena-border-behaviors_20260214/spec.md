# Specification: Arena Border Behaviors

## Overview
This feature introduces a new match setting, **"Border Behavior"**, which dictates what happens when a projectile hits the edges of the screen. This adds a tactical layer to the game, allowing for trick shots, wrap-around targeting, or immediate high-stakes impacts.

## Functional Requirements

### 1. Match Setup Integration
- Add an "Edge Behavior" dropdown or toggle to the **Match Setup** screen.
- **Options:** 
  - **Standard (Impact):** Projectiles explode on side walls, can arc out the top.
  - **Reflect:** Projectiles bounce off the left, right, and top edges with no velocity loss.
  - **Teleport:** Projectiles hitting one side wrap around to the same height on the opposite side.
  - **Random:** A behavior is randomly selected at the start of **every round**.

### 2. HUD Feedback
- Display the currently active Edge Behavior in the HUD (e.g., "Edge Rule: Reflect") so players can adjust their strategy each round.

### 3. Physics Logic
- **Reflect:** Calculate the reflection angle based on the normal of the screen edge.
- **Teleport:** Update the projectile's X coordinate to the opposite side when it crosses the boundary.
- **Impact (Standard):** Retain current logic (explode on sides, allow top exit).

## Non-Functional Requirements
- **Performance:** Physics calculations for reflection and wrap-around must remain smooth and not affect frame rate.

## Acceptance Criteria
- [ ] Edge Behavior setting is saved in the match config.
- [ ] HUD accurately displays the rule for the current round.
- [ ] Reflect: Projectiles bounce off sides and top correctly.
- [ ] Teleport: Projectiles wrap around sides seamlessly.
- [ ] Random: A new rule is picked and displayed at the start of every round.

## Out of Scope
- Bottom-of-screen behaviors (projectiles still explode on terrain or fall into the abyss).
- Changes to tank movement boundaries (tanks remain confined to the terrain).
