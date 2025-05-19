# Savant Energy Scenes Standalone Card

A custom Lovelace card for Home Assistant that provides an interface for managing Savant Energy scenes.

## Features

- View and manage Savant Energy scenes
- Create new scenes with custom names
- Edit existing scenes by toggling individual breakers/relays
- Delete unwanted scenes
- Simple and intuitive user interface

## Installation

### HACS (Recommended)

1. Make sure you have [HACS](https://hacs.xyz/) installed
2. In HACS, go to "Integrations" or "Frontend" (depending on your HACS version)
3. Click the three dots menu (⋮) in the top right and select "Custom repositories"
4. Add this repository: [https://github.com/bballdavis/Hass-Savant-Scene-Card](https://github.com/bballdavis/Hass-Savant-Scene-Card) as a "Lovelace" (or "Frontend") repository
5. Go to HACS → Frontend
6. Click the "+" button
7. Search for "Savant Energy Scenes Card"
8. Click "Install"
9. Refresh your browser

### Manual Installation

1. Download `savant-energy-scenes-card.js` from this repository
2. Copy the file to your `config/www` directory
3. Add the following to your `configuration.yaml` file:
   ```yaml
   lovelace:
     resources:
       - url: /local/savant-energy-scenes-card.js
         type: module
   ```
4. Restart Home Assistant

## Usage

Add the card to your dashboard:

1. Edit your dashboard
2. Click the "Add Card" button
3. Search for "Savant Energy Scenes Card"
4. Click on the card to add it

Or add it manually to your Lovelace configuration:

```yaml
type: custom:savant-energy-scenes-standalone-card
```

## Requirements

- Savant Energy integration must be installed and configured in Home Assistant
- Savant Energy devices must be properly set up and connected to Home Assistant

## Support

For issues, feature requests, or contributions, please use the GitHub repository.

## Code Overview

This section provides an overview of the main classes and functions implemented in this repository, describing their purpose and usage for developers who wish to understand or extend the card.

### JavaScript Classes & Functions

#### `SavantEnergyApi`
A utility class that handles all REST API calls to the Home Assistant backend for Savant Energy scenes. It is instantiated with the Home Assistant `hass` object and provides the following methods:

- **fetchScenes()**: Fetches all Savant Energy scenes from the backend. Returns an array of scene objects with `id` and `name`.
- **fetchBreakers(sceneId)**: Fetches the breaker (relay) states for a specific scene. Returns an object with `entities` (array of entity IDs) and `relayStates` (mapping of entity IDs to boolean states).
- **createScene(name, relayStates)**: Creates a new scene with the given name and relay states. Returns the backend response.
- **updateScene(sceneId, name, relayStates)**: Updates an existing scene's name and/or relay states. Returns the backend response.
- **deleteScene(sceneId)**: Deletes a scene by its ID. Returns the backend response.

#### `SavantEnergyScenesCard`
The main custom card class, registered as `savant-energy-scenes-standalone-card`. Handles the UI and user interactions for managing Savant Energy scenes. Key features and methods:

- **Scene Management**: Displays a list of scenes, allows selection, creation, editing, and deletion.
- **Relay Control**: Lets users toggle individual breakers/relays for a scene.
- **View Switching**: Supports switching between scene list and editor views.
- **Error Handling & Toasts**: Displays error messages and notifications to the user.
- **Lifecycle Methods**: Implements Home Assistant card lifecycle, including `set hass`, rendering, and configuration.

#### `SavantEnergyScenesCardEditor`
A simple configuration editor for the card, registered as `savant-energy-scenes-standalone-card-editor`. Currently, this card does not require configuration options, and the editor displays a static message.

#### Styling
- The card's CSS is included via `savant-energy-card-style.js`.

### Build Script
- **build.js**: Concatenates all card modules in the `dev/` directory into a single distributable file (`savant-energy-scenes-card.js`) for use in Home Assistant or HACS. It strips ES6 import statements from non-API files for compatibility.

---

For details on the REST API endpoints and Home Assistant service calls, see [INTEGRATION_API.md](./INTEGRATION_API.md).
