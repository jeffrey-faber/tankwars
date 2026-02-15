# Tank Wars

## Project Overview

**Tank Wars** is a web-based, multiplayer artillery game inspired by classics like "Scorched Earth" or "Worms". Players control tanks on a destructible 2D terrain, aiming to destroy opponents by adjusting the angle and power of their shots. The game features turn-based gameplay, wind mechanics, various weapons, and AI opponents.

> **Note on Testing:** Some AI accuracy tests in `js/aiAccuracy.test.js` may fail. These are benchmark tests for ongoing improvements to AI targeting logic and do not necessarily indicate a regression in core game functionality.

### Key Technologies

*   **Frontend:** HTML5 Canvas for rendering, vanilla JavaScript (ES6+) for logic, and CSS for UI styling.
*   **No Build System:** The project runs directly in the browser without a build step (no Webpack, Babel, etc.).
*   **Architecture:**
    *   **Game Loop:** Uses `requestAnimationFrame` for the main rendering loop in `js/main.js`.
    *   **Entities:** Object-oriented design with classes for `Tank` (`js/tank.js`) and `Terrain` (`js/terrain.js`).
    *   **State Management:** Global state variables in `js/main.js` and a `Store` class (`js/store.js`) for inventory/shop management.

## File Structure

*   `index.html`: The entry point. Initializes the canvas, UI forms (player setup), and loads all JavaScript modules.
*   `js/`
    *   `main.js`: Orchestrates the game initialization, main loop, input handling, and game state (current player, round reset, etc.).
    *   `tank.js`: Defines the `Tank` class. Handles drawing, physics (gravity), firing logic, collision detection, and AI behaviors (`aiLevel8`, `aiLevelMaxLob`).
    *   `terrain.js`: Generates random terrain maps (`premadeMaps`) and handles destructibility (`removeTerrain`) when projectiles explode.
    *   `store.js`: Manages the in-game shop where players can spend currency on weapons and items.
    *   `utils.js`: Helper functions (e.g., random color generation, URL parameter parsing).
*   `css/style.css`: Styles for the game UI (HUD, forms, overlays).

## Game Mechanics

*   **Turn-Based:** Players take turns firing.
*   **Physics:** Simple 2D physics including gravity for projectiles and falling tanks. Wind affects projectile trajectory.
*   **AI:** Includes sophisticated AI implementations that simulate shots to calculate optimal angle/power (`aiLevelMaxLob`).
*   **Destructible Terrain:** Explosions remove chunks of the terrain polygon, and tanks fall if the ground beneath them is destroyed.

## Usage

### Running the Game

Since this is a static site, you can run it by simply serving the root directory.

1.  **Open `index.html`** directly in a web browser.
    *   *OR*
2.  **Use a local server** (recommended for better module handling and asset loading):
    ```bash
    # Python 3
    python -m http.server 8000
    
    # Node.js (http-server)
    npx http-server .
    ```
    Then navigate to `http://localhost:8000`.

### Controls

*   **Arrow Left/Right:** Adjust Tank Angle
*   **Arrow Up/Down:** Adjust Fire Power
*   **Space:** Fire Weapon
*   **S:** Open/Close Shop
*   **1-9:** Quick Select Inventory Items
*   **/:** Skip Turn (debug/cheat)

## Development Conventions

*   **Vanilla JS:** Code is written in standard ES6+ JavaScript. No transpilers or frameworks are used.
*   **Global Scope:** Be aware that `main.js` defines several global variables (`ctx`, `canvas`, `tanks`, `terrain`) that are accessed by other classes.
*   **Direct DOM Manipulation:** UI updates happen via direct `document.getElementById` calls.
*   **Canvas API:** All game rendering is done via the HTML5 Canvas 2D Context.
