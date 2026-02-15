# Implementation Plan: Mobile Mode & Landscape Touch Controls

## Phase 1: Environment Detection & Orientation Management
Focuses on the core logic to identify mobile devices and enforce the landscape requirement.

- [ ] **Task: Implement Mobile Detection Utility**
    - [ ] Write tests in `js/utils.test.js` for a `isTouchDevice()` utility.
    - [ ] Implement `isTouchDevice()` in `js/utils.js` using `matchMedia("(pointer: coarse)")`.
- [ ] **Task: Create Orientation & Fullscreen Manager**
    - [ ] Create `js/mobileManager.js` to handle Screen Orientation API and Fullscreen API.
    - [ ] Implement logic to request landscape lock when entering fullscreen.
    - [ ] Add a "Full Screen" toggle button to the main UI that only appears on touch devices.
- [ ] **Task: Conductor - User Manual Verification 'Environment Detection & Orientation Management' (Protocol in workflow.md)**

## Phase 2: Mobile UI Overlays & Styling
Creation of the on-screen controls following the neon aesthetic.

- [ ] **Task: Scaffold Mobile HUD Structure**
    - [ ] Add HTML containers for mobile controls (sliders, action buttons, inventory bar) to `index.html`.
    - [ ] Style the containers in `css/style.css` with `display: none` by default.
    - [ ] Implement CSS media queries or class-based visibility (e.g., `.mobile-mode .mobile-ctrl`) to show them only when mobile mode is active.
- [ ] **Task: Create Neon Slider Components**
    - [ ] Implement vertical slider UI for Angle and Power.
    - [ ] Add "+" and "-" fine-tuning buttons.
    - [ ] Apply neon glow effects and styles consistent with `product-guidelines.md`.
- [ ] **Task: Create Mobile Action Buttons & Inventory Bar**
    - [ ] Implement large touch-friendly buttons for Fire, Shop, and Skip.
    - [ ] Create the bottom inventory selection bar.
- [ ] **Task: Conductor - User Manual Verification 'Mobile UI Overlays & Styling' (Protocol in workflow.md)**

## Phase 3: Touch Interaction Logic & Game Integration
Connecting the UI components to the game's state and handling touch inputs.

- [ ] **Task: Implement Slider & Drag Logic**
    - [ ] Write tests for updating tank power/angle via new mobile inputs.
    - [ ] Hook up sliders and fine-tuning buttons to update the current tank's `power` and `angle`.
    - [ ] Implement relative vertical dragging logic for side-screen areas.
- [ ] **Task: Hook Up Action Buttons & Inventory**
    - [ ] Map mobile 'Fire' button to existing fire logic in `main.js`.
    - [ ] Map 'Shop' button to `store.toggle()`.
    - [ ] Map 'Skip' button to the skip turn logic.
    - [ ] Map inventory bar items to weapon selection (equivalent to keys 1-9).
- [ ] **Task: Add Haptic Feedback & Visual Polish**
    - [ ] Integrate `navigator.vibrate()` on input actions.
    - [ ] Add glowing/pulsing animations to HUD labels when sliders are adjusted.
- [ ] **Task: Conductor - User Manual Verification 'Touch Interaction Logic & Game Integration' (Protocol in workflow.md)**

## Phase 4: Final Refinement & Robustness
Ensuring a seamless experience across devices.

- [ ] **Task: Verification of 1-120 Power Range**
    - [ ] Ensure the mobile power slider and game logic correctly handle the extended 120 power limit.
- [ ] **Task: Cross-Device Compatibility Check**
    - [ ] Verify controls are properly hidden on desktop.
    - [ ] Ensure landscape enforcement prompts or locks work as expected.
- [ ] **Task: Conductor - User Manual Verification 'Final Refinement & Robustness' (Protocol in workflow.md)**