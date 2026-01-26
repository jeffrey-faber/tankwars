# Implementation Plan - Enhanced Terrain Physics & Destruction

## Phase 1: Core Terrain Engine Refactor [checkpoint: 75a0ee0]
- [x] Task: Create new `BitmaskTerrain` class structure (TDD) [712698b]
  - [x] Sub-task: Write tests for initializing a 2D grid/canvas-based terrain
  - [x] Sub-task: Implement `BitmaskTerrain` class with `init(width, height)`
- [x] Task: Implement basic rendering for 2D terrain [712698b]
  - [x] Sub-task: Write tests for drawing the terrain state to a canvas context
  - [x] Sub-task: Implement `draw(ctx)` to render the pixel data
- [x] Task: Implement `checkCollision(x, y)` [712698b]
  - [x] Sub-task: Write tests verifying collision against solid pixels vs air
  - [x] Sub-task: Implement collision lookup
- [x] Task: Conductor - User Manual Verification 'Core Terrain Engine Refactor' (Protocol in workflow.md) [75a0ee0]

## Phase 2: Destructive Deformations
- [ ] Task: Implement `explode(x, y, radius)`
  - [ ] Sub-task: Write tests ensuring pixels within radius are cleared
  - [ ] Sub-task: Implement circle subtraction logic on the bitmask/grid
- [ ] Task: Integrate new terrain with `main.js`
  - [ ] Sub-task: Replace old `Terrain` instance with `BitmaskTerrain`
  - [ ] Sub-task: Update game loop to render the new terrain
- [ ] Task: Conductor - User Manual Verification 'Destructive Deformations' (Protocol in workflow.md)

## Phase 3: Gravity & "Crumble" Physics
- [ ] Task: Implement floating chunk detection
  - [ ] Sub-task: Write tests for identifying unconnected pixels/blobs
  - [ ] Sub-task: Implement Connected Component Labeling or similar algorithm
- [ ] Task: Implement `updateGravity()` for terrain
  - [ ] Sub-task: Write tests verifying floating pixels move down
  - [ ] Sub-task: Implement falling logic (move pixels down Y axis until collision)
- [ ] Task: Visual Polish - "Sand" settling behavior
  - [ ] Sub-task: Implement simple logic where pixels slide diagonally if blocked directly below
- [ ] Task: Conductor - User Manual Verification 'Gravity & "Crumble" Physics' (Protocol in workflow.md)

## Phase 4: Tank Interaction (Burial)
- [ ] Task: Update Tank positioning logic
  - [ ] Sub-task: Write tests for Tank responding to new terrain collisions
  - [ ] Sub-task: Refactor Tank gravity to work with pixel lookups
- [ ] Task: Implement "Buried" state
  - [ ] Sub-task: Write tests for detecting when pixels are "above" the tank
  - [ ] Sub-task: Add `isBuried` flag and restrict movement
- [ ] Task: Conductor - User Manual Verification 'Tank Interaction (Burial)' (Protocol in workflow.md)
