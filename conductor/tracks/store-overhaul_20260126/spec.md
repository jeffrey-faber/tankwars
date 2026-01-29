# Specification: Store & Weapon Selection Overhaul

## 1. Overview
The current store and weapon selection systems are intrusive and clunky. This track overhauls the user experience by moving the shopping phase to a pre-match "Lobby" and providing a streamlined, icon-driven HUD for weapon selection and inventory management.

*Note: Persistent storage/Auto-save will be defined later when match structures are finalized, but current session persistence is required.*

## 2. Functional Requirements

### 2.1 Pre-Match Shop (Lobby)
- **Timing:** The Shop is only accessible between matches (in the lobby phase). It no longer appears during active gameplay.
- **Persistence:** Player currency and inventory persist across matches (in-memory) as long as the session is active. Losing a match does not reset inventory.
- **Bulk Buying:** Players can purchase multiple quantities of special weapons.

### 2.2 Icon-Based Weapon Selection UI
- **Grid Layout:** Replace text-based weapon selection with a clean grid of icons.
- **Visual Feedback:** 
    - Selected weapon is highlighted.
    - Tooltips on hover show weapon stats (Damage, Radius, Description).
- **HUD Integration:** The HUD displays the current inventory with ammo counters for each special weapon.

### 2.3 Controls & Accessibility
- **Hotkeys:** Numeric keys (1-9) can be used to quickly switch between available weapons during a turn.
- **Keyboard Navigation:** The Lobby Shop should be easily navigable via mouse or keyboard.

### 2.4 Visual Polish
- **Neon Aesthetic:** Icons and UI elements must adhere to the "Neon & Vibrant" project guidelines.
- **Snappy Transitions:** Switching between lobby/game should feel energetic and fast.

## 3. Non-Functional Requirements
- **Performance:** UI rendering must not impact the 60 FPS target of the game engine.
- **Modular Design:** Weapon data (icons, stats) should be easily extendable in `store.js`.

## 4. Acceptance Criteria
- [ ] Shopping is only possible in the lobby, not during battle.
- [ ] Inventory and money persist across multiple matches in a single session.
- [ ] Weapons are selectable via a grid of icons with tooltips.
- [ ] HUD accurately displays remaining ammo for special weapons.
- [ ] Numeric hotkeys (1-9) successfully switch weapons.

## 5. Out of Scope
- Persistent storage (LocalStorage or Database).
- Animating the icons themselves (static neon icons are sufficient).
