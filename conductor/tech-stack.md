# Technology Stack

This document outlines the core technologies and architectural patterns used in the Tank Wars project.

## Core Technologies
- **JavaScript (ES6+):** The primary programming language for game logic, physics, and state management.
- **HTML5 Canvas:** Utilized for all high-performance 2D rendering and visual effects.
- **CSS3:** Handles the layout, styling of UI overlays, and game menus.

## Architecture
- **Client-Side Only:** A static web application that runs entirely in the user's browser without the need for a dedicated backend.
- **Modular OOP:** The game is structured into discrete, object-oriented modules (e.g., `Tank`, `Terrain`, `Store`) to promote maintainability and scalability.
- **Global Game Orchestrator:** `main.js` serves as the central hub for the game loop, event handling, and cross-module communication.

## Development Environment
- **Direct Execution:** No build step or transpilation is required; the browser executes the source files directly.
- **Standard APIs:** Relies on standard web APIs (DOM, Canvas, LocalStorage) to ensure broad compatibility and minimal dependencies.

## Project Context
- **AI Showcase:** This project serves as a comprehensive test case for Generative AI capabilities. Every component, from code to creative assets, is an opportunity for AI agents to demonstrate advanced reasoning, creativity, and technical proficiency. Agents are encouraged to "show off" by implementing sophisticated solutions and polished details.
