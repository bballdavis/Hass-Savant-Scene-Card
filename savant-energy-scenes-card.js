// Savant Energy Scenes Standalone Card v1.1.0

// Register the card in the customCards array - important for Home Assistant to discover the card
console.info(
  "%c SAVANT-ENERGY-SCENES-STANDALONE-CARD %c v1.1.0 ",
  "color: white; background: #4CAF50; font-weight: 700;",
  "color: #4CAF50; background: white; font-weight: 700;"
);

class SavantEnergyScenesCard extends HTMLElement {  
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._config = {};
    this._entities = [];
    this._scenes = [];
    this._selectedScene = null;
    this._sceneName = "";
    this._relayStates = {};
    this._view = "scenes"; // 'scenes' or 'editor'
    this._isRendering = false;
    this._pendingRender = false;
    this._hasInitialRender = false; // Track initial render
      // Create an initial empty card
    this.shadowRoot.innerHTML = `
      <ha-card header="Savant Energy Scenes Standalone">
        <div class="card-content">Loading...</div>
      </ha-card>
    `;
  }
    // This is called by Lovelace when the configuration changes
  static getConfigElement() {
    return document.createElement("savant-energy-scenes-standalone-card-editor");
  }

  // This is called by Lovelace to get the card name for display in the Add Card UI
  static getStubConfig() {
    return {};
  }

  // This is called whenever Home Assistant state changes
  set hass(hass) {
    const firstUpdate = this._hass === null;
    this._hass = hass;
    
    // Get entities and scenes
    const entities = Object.values(hass.states)
      .filter(e => e.entity_id.startsWith("switch.") && 
              e.attributes.device_class === "switch" && 
              e.attributes.friendly_name && 
              (e.entity_id.includes("savant") || e.entity_id.includes("breaker")));
    const scenes = Object.values(hass.states)
      .filter(e => e.entity_id.startsWith("button.savant_energy_scene_"))
      .map(e => ({
        id: e.entity_id.replace("button.savant_energy_scene_", "scene_"),
        entity_id: e.entity_id,
        name: e.attributes.friendly_name,
      }));
      
    // Update entities and scenes
    this._entities = entities;
    this._scenes = scenes;
    
    // Initialize relay states if they're empty (for new scenes)
    if (Object.keys(this._relayStates).length === 0 && entities.length > 0) {
      entities.forEach(ent => this._relayStates[ent.entity_id] = true);
    }
        // Always render on first update, otherwise only when needed
    if (firstUpdate || !this._hasInitialRender) {
      console.log("Savant Energy Scenes Standalone: Initial render", 
          {entities: entities.length, scenes: scenes.length});
      this._safeRender();
    }
  }

  _safeRender() {
    if (this._isRendering) {
      this._pendingRender = true;
      return;
    }
    this._isRendering = true;
    try {
      this.render();
      this._hasInitialRender = true;
    } catch (error) {      console.error("Error rendering Savant Energy Scenes Standalone card:", error);
      // Fallback for render errors
      this.shadowRoot.innerHTML = `
        <ha-card header="Savant Energy Scenes Standalone">
          <div class="card-content">
            <p>Error rendering card. Check the browser console for details.</p>
          </div>
        </ha-card>
      `;
    }
    this._isRendering = false;
    if (this._pendingRender) {
      this._pendingRender = false;
      setTimeout(() => this._safeRender(), 10);
    }
  }

  _setView(view) {
    if (this._view !== view) {
      this._view = view;
      if (view === "editor") {
        // Default to first scene if available
        if (this._scenes.length > 0) {
          this._selectedScene = this._scenes[0].id;
          this._sceneName = this._scenes[0].name;
          // TODO: Load relay states for the selected scene if available
        } else {
          this._selectedScene = null;
          this._sceneName = "";
        }
      } else {
        this._selectedScene = null;
        this._sceneName = "";
      }
      this._safeRender();
    }
  }

  _onSceneNameChange(e) {
    this._sceneName = e.target.value;
  }

  _onRelayToggle(entity_id) {
    this._relayStates[entity_id] = !this._relayStates[entity_id];
    this._safeRender();
  }

  _onSceneSelect(e) {
    const sceneId = e.target.value;
    this._selectedScene = sceneId;
    if (sceneId) {
      const sceneInfo = this._scenes.find(s => s.id === sceneId);
      this._sceneName = sceneInfo?.name || "";
      // TODO: Load relay states for the selected scene if available
    } else {
      this._sceneName = "";
    }
    this._safeRender();
  }

  async _onCreateScene() {
    if (!this._sceneName.trim()) {
      this._showToast("Please enter a scene name");
      return;
    }
    try {
      // Call the backend to create the scene
      await this._hass.callService("savant_energy", "create_scene", {
        name: this._sceneName.trim(),
        relay_states: this._entities.reduce((acc, ent) => {
          acc[ent.attributes.friendly_name] = true;
          return acc;
        }, {})
      });
      // Optimistically add the new scene to the list
      const newId = `scene_${this._sceneName.trim().toLowerCase().replace(/\s+/g, '_')}`;
      const newScene = {
        id: newId,
        entity_id: `button.savant_energy_scene_${this._sceneName.trim().toLowerCase().replace(/\s+/g, '_')}`,
        name: this._sceneName.trim(),
      };
      this._scenes.push(newScene);
      // Optionally, set all relays ON for the new scene
      this._relayStates = Object.assign({}, ...this._entities.map(ent => ({ [ent.entity_id]: true })));
      // Save all scenes to backend for integration access
      await this._hass.callService("savant_energy", "save_scenes", {
        scenes: this._scenes
      });
      this._showToast(`Scene "${this._sceneName}" created successfully`);
      this._sceneName = "";
      this._safeRender();
    } catch (error) {
      this._showToast("Error creating scene: " + error.message);
    }
  }

  async _onDeleteScene(sceneId) {
    try {
      await this._hass.callService("savant_energy", "delete_scene", {
        scene_id: sceneId
      });
      this._showToast(`Scene deleted successfully`);
      setTimeout(() => this._safeRender(), 500);
    } catch (error) {
      this._showToast("Error deleting scene: " + error.message);
    }
  }

  async _onSaveEditor() {
    if (!this._selectedScene) return;
    try {
      await this._hass.callService("savant_energy", "update_scene", {
        scene_id: this._selectedScene,
        name: this._sceneName,
        relay_states: this._entities.reduce((acc, ent) => {
          acc[ent.attributes.friendly_name] = !!this._relayStates[ent.entity_id];
          return acc;
        }, {})
      });
      this._showToast(`Scene updated successfully`);
      setTimeout(() => this._safeRender(), 500);
    } catch (error) {
      this._showToast("Error saving scene: " + error.message);
    }
  }
  _showToast(message) {
    this._hass.callService("persistent_notification", "create", {
      message,
      title: "Savant Energy Scenes Standalone",
      notification_id: "savant_scene_standalone_notification"
    });
  }

  render() {
    if (!this._hass) return;
    const style = `
      <style>
        .card {
          font-family: var(--primary-font-family);
          background: var(--card-background-color, #fff);
          border-radius: 12px;
          box-shadow: var(--ha-card-box-shadow);
          padding: 12px;
        }
        .header {
          font-size: 1.1em;
          font-weight: bold;
          margin-bottom: 6px;
        }
        .pill-toggle {
          display: flex;
          width: 100%;
          margin: 0 0 10px 0;
          background: var(--secondary-background-color, #f0f0f0);
          border-radius: 999px;
          padding: 2px;
          border: 1px solid var(--divider-color, #ddd);
        }
        .pill {
          border-radius: 999px;
          padding: 5px 10px;
          font-size: 0.95em;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
          text-align: center;
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .pill.selected {
          background: var(--primary-color, #03a9f4);
          color: var(--primary-text-color-on-primary, #fff);
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .switch-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 8px;
        }
        .switch-item {
          display: flex;
          align-items: center;
          background: var(--secondary-background-color, #f5f5f5);
          border-radius: 8px;
          padding: 4px 8px;
        }
        .switch-label {
          margin-left: 6px;
          font-size: 0.95em;
        }
        .scene-controls {
          display: flex;
          gap: 6px;
          align-items: center;
          margin-bottom: 8px;
        }
        .scene-name-input {
          flex: 1 1 0%;
          min-width: 0;
          width: 100%;
        }
        .scene-select {
          flex: 1;
        }
        .input {
          padding: 3px 7px;
          border-radius: 6px;
          border: 1px solid var(--divider-color, #ccc);
          height: 24px;
        }
        button {
          background: var(--primary-color, #03a9f4);
          color: var(--primary-text-color-on-primary, #fff);
          border: none;
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 0.95em;
          cursor: pointer;
          height: 24px;
          display: flex;
          align-items: center;
          white-space: nowrap;
        }
        button[disabled] {
          background: var(--disabled-color, #ccc);
          cursor: not-allowed;
        }
        .delete-btn {
          background: #e53935;
        }
        .scene-items {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .scene-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 5px;
          border-bottom: 1px solid var(--divider-color, #eee);
          font-size: 0.95em;
        }
        .trash-icon {
          color: #e53935;
          cursor: pointer;
          display: flex;
        }
      </style>
    `;
    const pillToggle = `
      <div class="pill-toggle">
        <div class="pill${this._view === 'scenes' ? ' selected' : ''}" data-view="scenes">Scenes</div>
        <div class="pill${this._view === 'editor' ? ' selected' : ''}" data-view="editor">Editor</div>
      </div>
    `;
    let content = "";
    if (this._view === "scenes") {
      content = `
        <div class="scene-controls">
          <input class="input scene-name-input" type="text" placeholder="New scene name" value="${this._sceneName}">
          <button${this._sceneName.trim() === "" ? " disabled" : ""}>Create</button>
        </div>
        <div class="scene-list">
          ${this._scenes.length === 0 ?
            '<p>No scenes created yet. Enter a name above and click Create.</p>' :
            `<ul class="scene-items">
              ${this._scenes.map(s => `<li class="scene-item">
                <span>${s.name}</span>
                <span class="trash-icon" data-id="${s.id}">
                  <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M7,6H17V19H7V6M9,8V17H11V8H9M13,8V17H15V8H13Z" /></svg>
                </span>
              </li>`).join("")}
            </ul>`
          }
        </div>
      `;
    } else if (this._view === "editor") {
      content = `
        <div class="scene-controls">
          <select class="scene-select input">
            <option value="" ${!this._selectedScene ? "selected" : ""}>Select a scene</option>
            ${this._scenes.map(s => `<option value="${s.id}" ${this._selectedScene === s.id ? "selected" : ""}>${s.name}</option>`).join("")}
          </select>
          <button${!this._selectedScene ? " disabled" : ""}>Save</button>
        </div>
        <div class="switch-list">
          ${this._entities.map(ent => `
            <div class="switch-item">
              <input type="checkbox" id="${ent.entity_id}" ${this._relayStates[ent.entity_id] !== false ? "checked" : ""}>
              <label class="switch-label" for="${ent.entity_id}">${ent.attributes.friendly_name || ent.entity_id}</label>
            </div>
          `).join("")}
        </div>
      `;
    }
    this.shadowRoot.innerHTML = `
      <ha-card>
        ${style}
        <div class="card">
          <div class="header">Savant Energy Scenes Standalone</div>
          ${pillToggle}
          ${content || '<div class="card-content">No content available</div>'}
        </div>
      </ha-card>
    `;
    // Pill toggle events
    this.shadowRoot.querySelectorAll('.pill').forEach(pill => {
      pill.addEventListener('click', e => {
        const view = pill.getAttribute('data-view');
        this._setView(view);
      });
    });
    // Scenes view events
    if (this._view === 'scenes') {
      const inputEl = this.shadowRoot.querySelector('input[type=text]');
      const buttonEl = this.shadowRoot.querySelector('button');
      inputEl.addEventListener('input', e => {
        this._onSceneNameChange(e);
        buttonEl.disabled = e.target.value.trim() === "";
      });
      buttonEl.addEventListener('click', async () => {
        if (buttonEl.disabled) return;
        // Call the create scene logic
        await this._onCreateScene();
      });
      this.shadowRoot.querySelectorAll('.trash-icon').forEach(btn => {
        btn.addEventListener('click', e => {
          const id = btn.getAttribute('data-id');
          this._onDeleteScene(id);
        });
      });
    }
    // Editor view events
    if (this._view === 'editor') {
      this.shadowRoot.querySelector('select').addEventListener('change', e => this._onSceneSelect(e));
      this.shadowRoot.querySelector('button').addEventListener('click', () => this._onSaveEditor());
      this.shadowRoot.querySelectorAll('input[type=checkbox]').forEach(cb => {
        cb.addEventListener('change', e => this._onRelayToggle(e.target.id));
      });
    }
  }

  // Called by Lovelace when the card configuration changes
  setConfig(config) {
    if (!config) {
      throw new Error("No configuration provided");
    }
    this._config = config;
    this._safeRender();
  }

  // Return the card size (height in units) for proper Lovelace grid placement
  getCardSize() { 
    return 3; 
  }
}

// Define the configuration editor element
class SavantEnergyScenesCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
  }

  get _config() {
    return this._config;
  }

  render() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }

    this.shadowRoot.innerHTML = `
      <style>
        ha-switch {
          padding: 16px 0;
        }
        .side-by-side {
          display: flex;
        }
        .side-by-side > * {
          flex: 1;
          padding-right: 4px;
        }      </style>
      <div>
        <p>Savant Energy Scenes Standalone Card has no configuration options.</p>
        <p>This card provides an interface for managing Savant Energy scenes.</p>
      </div>
    `;
  }

  connectedCallback() {
    this.render();
  }
}

// Add card to the custom cards list for discovery
window.customCards = window.customCards || [];
window.customCards.push({
  type: "savant-energy-scenes-standalone-card",
  name: "Savant Energy Scenes Standalone Card",
  description: "A custom standalone card for Savant Energy scenes."
});

// Register the custom element with the browser
customElements.define("savant-energy-scenes-standalone-card", SavantEnergyScenesCard);
customElements.define("savant-energy-scenes-standalone-card-editor", SavantEnergyScenesCardEditor);
