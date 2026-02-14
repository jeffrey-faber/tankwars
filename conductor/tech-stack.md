# Technology Stack

This document outlines the core technologies and architectural patterns used in the Tank Wars project.

## Core Technologies
- **JavaScript (ES6+):** The primary programming language for game logic, physics, and state management.
- **Bitmask Terrain Engine:** A pixel-perfect 2D grid system for high-fidelity destructible environments and "sand" gravity physics.
- **HTML5 Canvas:** Utilized for all high-performance 2D rendering and visual effects.
- **CSS3:** Handles the layout, styling of UI overlays, and game menus.

## Architecture
- **Client-Side Only:** A static web application that runs entirely in the user's browser without the need for a dedicated backend.
- **Offscreen Canvas Caching:** Optimized rendering pipeline that caches terrain state to an offscreen buffer, supporting real-time destructive and constructive terrain manipulation (Earth Shapers).
- **Multi-Projectile Management:** Advanced state engine supporting a dynamic array of active projectiles with independent physics and sub-munition splitting logic (Cluster Bombs).
- **Velocity-Based Physics:** Realistic gravity system for tanks using vertical velocity and landing detection for physical impact calculation.
- **Settlement-Aware Game Loop:** Intelligent state machine that synchronizes turn transitions and AI activity with real-time physics, ensuring all movement and effects settle before the next action.
- **Modular OOP:** The game is structured into discrete, object-oriented modules (e.g., `Tank`, `BitmaskTerrain`, `Store`, `ScoreManager`, `LobbyManager`, `MatchSetup`) to promote maintainability and scalability.
- **Strategy Pattern for AI:** AI logic is encapsulated into specialized `AIController` subclasses (e.g., `MastermindAI`, `SniperAI`), enabling diverse behavioral archetypes without bloating the `Tank` class.
- **Automated Accuracy Benchmarking:** A specialized test suite (`js/aiAccuracy.test.js`) that simulates physics and terrain to verify AI convergence and behavioral constraints (e.g., direct vs lob shots) across 8+ scenarios.
- **Event-Driven State Management:** Utilizes standard DOM CustomEvents (e.g., `storeClosed`) to orchestrate complex UI flows and phase transitions without tight coupling between modules.
- **Persistent Session State:** Leverages `localStorage` for cross-refresh match persistence and user preference storage.
- **Global Game Orchestrator:** `main.js` serves as the central hub for the game loop, event handling, and cross-module communication.

## Development Environment
- **Direct Execution:** No build step or transpilation is required; the browser executes the source files directly.
- **Standard APIs:** Relies on standard web APIs (DOM, Canvas, LocalStorage) to ensure broad compatibility and minimal dependencies.

## Project Context
- **AI Showcase:** This project serves as a comprehensive test case for Generative AI capabilities. Every component, from code to creative assets, is an opportunity for AI agents to demonstrate advanced reasoning, creativity, and technical proficiency. Agents are encouraged to "show off" by implementing sophisticated solutions and polished details.
