# Specification: Mobile Mode & Landscape Touch Controls

## Overview
Implement a dedicated, ergonomic mobile mode for Tank Wars. This mode will be automatically triggered on touch-enabled devices and will provide a landscape-optimized interface with neon-styled virtual controls, replacing the need for a physical keyboard.

## Functional Requirements

### 1. Mobile Detection & Orientation
- **Trigger:** Enable mobile mode strictly when touch capability is detected (`matchMedia("(pointer: coarse)")`).
- **Orientation:** Enforce and attempt to lock the device into landscape mode using the Screen Orientation API.
- **Full Screen:** Provide a dedicated "Full Screen" toggle button to facilitate immersive gameplay and proper orientation locking.

### 2. On-Screen Controls (HUD Overlays)
- **Ergonomic Thumb Layout:**
    - **Left Side:** Vertical sliders for **Angle** and **Power** (Power range: 1-120).
    - **Right Side:** Large, neon-styled action buttons for **Fire**, **Open/Close Shop**, and **Skip Turn**.
- **Inventory Bar:** A persistent selection bar at the bottom center for switching weapons (equivalent to keys 1-9).
- **Fine-Tuning:** Include small "+" and "-" buttons adjacent to sliders for precise single-unit adjustments.
- **Visual Feedback:** HUD elements (Power/Angle readouts) should glow or pulse when their corresponding sliders are being manipulated.

### 3. Interaction Logic
- **Relative Dragging:** Support vertical dragging within designated side areas for relative value adjustments, in addition to direct slider manipulation.
- **Haptic Feedback:** Trigger short vibrations on value changes and button presses (where supported by the device).
- **Visibility:** Mobile controls must ONLY be visible when the game is in mobile mode.

## Non-Functional Requirements
- **Visual Style:** Adhere to the "Neon & Vibrant" retro-digital aesthetic defined in `product-guidelines.md`.
- **Performance:** Ensure touch event listeners are passive and performant to maintain 60 FPS.
- **Accessibility:** Large touch targets (minimum 44x44px) for all primary actions.

## Acceptance Criteria
- [ ] Mobile controls are hidden on desktop (non-touch) browsers.
- [ ] Mobile controls appear automatically on touch devices.
- [ ] The game attempts to lock to landscape mode upon entering full-screen/mobile mode.
- [ ] Power slider correctly scales from 1 to 120.
- [ ] All keyboard-mapped actions (Fire, Shop, Skip, Weapon Select) have functional touch equivalents.
- [ ] Sliders support both direct handle dragging and relative area dragging.

## Out of Scope
- Multi-touch gestures (e.g., pinch to zoom).
- Specific optimization for portrait mode (as landscape is required).