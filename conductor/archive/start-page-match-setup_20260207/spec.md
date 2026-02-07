# Specification: Match Setup & Start Page Revamp

## Overview
This track focuses on overhauling the initial game setup experience. Instead of a simple "Number of Players" input, users will have a dynamic interface to construct a custom roster of Human and AI players. Additionally, a new "Match Settings" configuration will allow players to define the parameters of a multi-game session, including win conditions, economy, and environmental variables.

## Functional Requirements

### 1. Player Roster Management
- **Add/Remove Players:**
    - A dynamic list interface.
    - An "Add Player" button appends a new player row (up to a max limit, e.g., 8).
    - Each row has a "Remove" button to delete that player.
    - Default state: 4 Players pre-configured.
- **Player Configuration:**
    - **Name:** Editable text field.
    - **Type/Difficulty:** Dropdown options: 'Human', 'Bot (Easy)', 'Bot (Medium)', 'Bot (Hard)'.
    - **Color:** (Optional) Color picker or auto-assigned distinct colors.

### 2. Match Configuration Settings
- **Match Structure:**
    - **Number of Games:** Input field (Default: 5).
    - **Win Condition:** Dropdown:
        - "Cumulative Score" (Highest total score wins).
        - "Most Wins" (Player who wins the most individual rounds).
- **Economy:**
    - **Starting Cash:** Input field (Default: 100).
    - **Round Bonus:** Cash awarded per round survival (Default: configurable).
- **Environment & Physics:**
    - **Wind Intensity:** Dropdown (None, Low, Normal, High, Random).
    - **Map Generation:** Dropdown options for terrain style (e.g., Hills, Valley, Random).
- **Gameplay Options:**
    - **Turn Timer:** Toggle (On/Off) + Time limit input (Default: Off).
    - **Sudden Death:** Disabled toggle/placeholder labeled "Coming Soon".

### 3. Match Workflow
- **Initialization:** A prominent "Start Match" button validates the configuration (e.g., min 2 players) and initializes the game with these settings.
- **Round Transitions:** The game state must persist these settings across the multiple rounds of the match.
- **Post-Match Loop:** Once the final game of the match is complete and a match winner is declared, the user should be redirected back to this Match Setup page to allow for a new session.

## Non-Functional Requirements
- **UI/UX:** The setup screen should be visually consistent with the "Lobby" and "Store" redesigns (e.g., full-screen overlay style).
- **Validation:** Prevent starting a match with < 2 players.

## Acceptance Criteria
- [ ] User can add up to 8 players and remove them from the list.
- [ ] User can set a player as Human or specific Bot difficulty levels.
- [ ] User can configure "Number of Games" and choose between "Cumulative Score" or "Most Wins".
- [ ] User can set starting cash, wind intensity, and turn timer (default off).
- [ ] "Sudden Death" option is visible but disabled ("Coming Soon").
- [ ] Clicking "Start Match" correctly initializes the game with the custom roster and settings.
- [ ] After the final game of a match concludes, the game returns to the setup page.

## Out of Scope
- Implementation of the actual "Sudden Death" mechanics (UI placeholder only).
- Networked multiplayer setup.
