# Savant Energy Scenes Standalone Card: Integration API & Backend Service Requirements

This document outlines the expected backend integration points and service routines required for the Savant Energy Scenes Standalone Card to function as intended within Home Assistant.

## Overview

The frontend card allows users to:
- Create, edit, and delete "scenes" (named sets of relay/breaker states)
- Store and retrieve these scenes for use by a backend integration
- Persist scene data in a way that is accessible to the integration (e.g., as a JSON file or via Home Assistant storage)

## Expected Service Calls from the Card

### 1. `savant_energy.create_scene`
- **Purpose:** Create a new scene with a given name and relay/breaker states.
- **Called by:** Card when user clicks "Create" after entering a scene name.
- **Payload Example:**
  ```json
  {
    "name": "My Scene Name",
    "relay_states": {
      "Breaker 1": true,
      "Breaker 2": true,
      ...
    }
  }
  ```
- **Expected Action:**
  - Add a new scene to the persistent store (file, storage, etc.)
  - Each scene should have a unique ID, name, and a mapping of breaker/relay names to boolean states

### 2. `savant_energy.update_scene`
- **Purpose:** Update an existing scene's name and/or relay states.
- **Called by:** Card when user edits a scene and clicks "Save" in the editor view.
- **Payload Example:**
  ```json
  {
    "scene_id": "scene_my_scene_name",
    "name": "My Scene Name",
    "relay_states": {
      "Breaker 1": false,
      "Breaker 2": true
    }
  }
  ```
- **Expected Action:**
  - Update the specified scene in the persistent store

### 3. `savant_energy.delete_scene`
- **Purpose:** Delete a scene by ID.
- **Called by:** Card when user clicks the trash icon next to a scene.
- **Payload Example:**
  ```json
  {
    "scene_id": "scene_my_scene_name"
  }
  ```
- **Expected Action:**
  - Remove the specified scene from the persistent store

### 4. `savant_energy.save_scenes`
- **Purpose:** Save the entire list of scenes (for bulk update or backup).
- **Called by:** Card after creating a new scene (and optionally after other changes).
- **Payload Example:**
  ```json
  {
    "scenes": [
      {
        "id": "scene_my_scene_name",
        "entity_id": "button.savant_energy_scene_my_scene_name",
        "name": "My Scene Name"
      },
      ...
    ]
  }
  ```
- **Expected Action:**
  - Overwrite the persistent store with the provided scenes array

## Data Storage Format

- The integration should persist scenes in a JSON file (e.g., `savant_energy_scenes_data.json`) or Home Assistant storage.
- Example file structure:
  ```json
  {
    "scenes": [
      {
        "id": "scene_my_scene_name",
        "entity_id": "button.savant_energy_scene_my_scene_name",
        "name": "My Scene Name",
        "relay_states": {
          "Breaker 1": true,
          "Breaker 2": false
        }
      },
      ...
    ]
  }
  ```

## Integration Responsibilities

- Register the above services (`create_scene`, `update_scene`, `delete_scene`, `save_scenes`) under the `savant_energy` domain.
- Ensure all changes are persisted and available for use by the integration and the frontend card.
- Optionally, provide a service to read/load all scenes for use by other automations or the card (e.g., `savant_energy.load_scenes`).
- Ensure thread-safety and data integrity when reading/writing the scenes file.

## Example Service Registration (Python)

```python
hass.services.async_register(
    "savant_energy", "create_scene", handle_create_scene, schema=CREATE_SCENE_SCHEMA
)
hass.services.async_register(
    "savant_energy", "update_scene", handle_update_scene, schema=UPDATE_SCENE_SCHEMA
)
hass.services.async_register(
    "savant_energy", "delete_scene", handle_delete_scene, schema=DELETE_SCENE_SCHEMA
)
hass.services.async_register(
    "savant_energy", "save_scenes", handle_save_scenes, schema=SAVE_SCENES_SCHEMA
)
```

## Notes
- The frontend card expects these services to be available and to persist data immediately.
- The integration should handle all file I/O and data validation.
- Scene IDs should be unique and consistent (e.g., `scene_<scene_name>` with spaces replaced by underscores).

---

**If you need a sample Python implementation for any of these routines, let me know!**
