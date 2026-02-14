# Specification: Tactical Arsenal Expansion & AI Upgrade

## Overview
This track focuses on rebalancing the game's economy and weapon systems. It introduces new weapon tiers, adjusts explosion sizes, and implements "auto-use" utility items (Shields, Parachutes). Crucially, it overhauls the AI (specifically the Mastermind) to intelligently utilize these new tools based on tactical analysis and fixes a visual bug where projectiles linger after explosions.

## Functional Requirements

### 1. Weapon Rebalancing & New Tiers
- **Default Shot:** Radius reduced to **15px** (was 30px). Infinite ammo.
- **Heavy Shot:** New standard weapon. Radius **30px**, Damage **60**. Sold in packs of **5** for **50 credits**.
- **Cluster Bomb:** Fires a single projectile that splits into **5 sub-munitions** at the apex of its arc. Each sub-munition has Radius **20px** and Damage **30**. Sold in packs of **3** for **150 credits**.
- **Mega Nuke:** Renamed from "Nuke". Radius increased to **150px**, Damage **200**. Sold as **Single Use** for **500 credits**.

### 2. Utility Item Overhaul
- **Shield:** Now an "Auto-Active" item.
    - Max capacity: 1.
    - Buying a shield when one is active refills its durability (HP buffer).
    - Cost: **100 credits**.
- **Parachute:** Now an "Auto-Active" item.
    - Max capacity: 1.
    - Automatically deploys if falling > Safe Height.
    - Buying a parachute refills its durability.
    - Cost: **50 credits**.

### 3. AI Enhancements (Mastermind & Sniper)
- **Clump Detection:** AI scans for clusters of enemy tanks. If >= 2 enemies are within a 100px radius, priority for Area of Effect (AoE) weapons (Mega Nuke, Cluster Bomb) increases significantly.
- **Efficiency Calculation:**
    - AI calculates "Potential Damage" based on the weapon's radius and the target's current health.
    - Only uses expensive items (Mega Nuke) if the hit probability is high (>80%) and the target value justifies the cost (e.g., kill shot or multi-hit).
- **Cluster Targeting:** Logic to aim Cluster Bombs such that the apex of the trajectory is directly above the target cluster.

### 4. Projectile Lifecycle Fix
- Ensure projectiles are immediately set to null/hidden upon explosion impact to prevent lingering "cannonballs" on screen.

## Non-Functional Requirements
- **Economy Balance:** Ensure that while powerful items are expensive, they are attainable within a standard 5-round match.
- **Performance:** Ensure the sub-munition split of the Cluster Bomb does not cause significant frame drops.

## Acceptance Criteria
- Default shot radius is visibly smaller (15px).
- "Heavy Shot" and "Cluster Bomb" are available in the store with correct pricing and pack sizes.
- Shields and Parachutes behave as single-slot, auto-active items that refill on purchase.
- Mastermind AI demonstrates clear preference for AoE weapons against clustered targets in testing.
- Cluster Bomb correctly splits at the apex of its flight path.
- Projectiles disappear instantly upon impact.
