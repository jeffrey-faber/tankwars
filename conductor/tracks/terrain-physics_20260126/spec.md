# Specification: Enhanced Terrain Physics & Destruction

## 1. Overview
The current terrain system is a simple heightmap that only supports surface-level deformation. This track aims to overhaul the terrain engine to support "true" destruction, where explosions create holes and overhangs, and disconnected terrain falls realistically. This serves as a technical showcase for complex physics and generative algorithms.

## 2. Functional Requirements

### 2.1 Advanced Terrain Data Structure
- **Pixel-Perfect Terrain:** Transition from a 1D heightmap to a 2D grid/bitmap (or optimized spatial structure like a quadtree or run-length encoding) to represent "earth" vs "air" at a pixel level.
- **Support for Holes:** The system must strictly allow for floating islands, caves, and overhangs.

### 2.2 Realistic Destruction
- **Craters & Tunnels:** Explosions must carve out circular (or arbitrary) shapes from the terrain bitmap, leaving the surrounding material intact.
- **Debris Generation:** Destroyed pixels should optionally spawn visual debris particles.

### 2.3 Physics-Simulated Falling (The "Crumble")
- **Gravity Check:** After an explosion, the system must detect connected components of terrain that are floating (unsupported).
- **Simulated Fall:** These floating chunks must fall downward over time (simulated over several frames) until they collide with solid ground.
- **Sand-Like Settling:** Upon landing, the terrain should settle naturally, potentially forming piles rather than maintaining rigid blocks.

### 2.4 Tank-Terrain Interaction
- **Burial Mechanic:** If falling terrain lands on a tank, the tank is "buried."
- **Digging Out:** Buried tanks cannot move but can fire their weapon to destroy the terrain covering them.
- **Fall Damage:** Tanks falling with terrain or onto new terrain take appropriate fall damage.

## 3. Non-Functional Requirements
- **Performance:** The destruction and settling algorithms must run efficiently (targeting 60 FPS) on the HTML5 Canvas, even with significant terrain updates.
- **Visual Polish:** The falling effect should look "juicy" and satisfying, utilizing the "Neon & Vibrant" aesthetic defined in the Product Guidelines.

## 4. Acceptance Criteria
- [ ] Explosions create true holes/tunnels without instantly lowering the surface above.
- [ ] Floating terrain chunks fall and settle realistically over time.
- [ ] Tanks can be buried by falling terrain and must fire to free themselves.
- [ ] The game remains performant during massive chain reactions of falling terrain.

## 5. Out of Scope
- Fluid dynamics (water/lava).
- Complex rigid body physics for debris (simple falling/stacking is sufficient).
