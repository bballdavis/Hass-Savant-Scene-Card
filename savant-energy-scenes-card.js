// Savant Energy Scenes Standalone Card v1.1.3

// Register the card in the customCards array - important for Home Assistant to discover the card
console.info(
  "%c SAVANT-ENERGY-SCENES-STANDALONE-CARD %c v1.1.10 ",
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

  async _fetchScenesFromBackend() {
    try {
      // Use this._hass.callApi for fetching scenes
      const result = await this._hass.callApi("GET", "savant_energy/scenes");
      console.info("[Savant Card] Raw get_scenes API response (callApi):", result);
      // this._hass.callApi directly returns the parsed response, no need for resp.json()
      if (result && Array.isArray(result.scenes)) {
        this._scenes = result.scenes.map(s => ({
          id: s.scene_id,
          name: s.name
        }));
        console.info(`[Savant Card] Parsed ${this._scenes.length} scenes from backend:`, this._scenes);
      } else {
        this._scenes = [];
        console.warn("[Savant Card] No scenes returned or unexpected format from backend via callApi.", result);
      }
    } catch (e) {
      this._scenes = [];
      console.error("[Savant Card] Error fetching scenes from backend (callApi):", e);
    }
    this._safeRender();
  }

  async _fetchBreakersForEditor(sceneId) {
    if (!sceneId) {
      this._entities = [];
      this._relayStates = {};
      this._safeRender();
      return;
    }
    try {
      // Use this._hass.callApi for fetching breakers
      const result = await this._hass.callApi("GET", `savant_energy/scene_breakers/${sceneId}`);
      console.info(`[Savant Card] Raw get_scene_breakers API response (callApi) for scene '${sceneId}':`, result);
      // this._hass.callApi directly returns the parsed response
      if (result && result.breakers && typeof result.breakers === 'object') {
        this._entities = Object.keys(result.breakers).map(entity_id => ({
          entity_id,
          attributes: { friendly_name: entity_id },
        }));
        this._relayStates = { ...result.breakers };
        console.info(`[Savant Card] Retrieved breakers for scene '${sceneId}':`, this._relayStates);
      } else {
        this._entities = [];
        this._relayStates = {};
        console.warn(`[Savant Card] No breakers returned or unexpected format from backend for scene '${sceneId}' via callApi.`, result);
      }
    } catch (e) {
      this._entities = [];
      this._relayStates = {};
      console.error(`[Savant Card] Error fetching breakers from backend (callApi) for scene '${sceneId}':`, e);
    }
    this._safeRender();
  }

  _setView(view) {
    if (this._view !== view) {
      this._view = view;
      if (view === "editor") {
        // Default to first scene if available
        if (this._scenes.length > 0) {
          this._selectedScene = this._scenes[0].id;
          this._sceneName = this._scenes[0].name;
          this._fetchBreakersForEditor(this._selectedScene);
        } else {
          this._selectedScene = null;
          this._sceneName = "";
          this._entities = [];
          this._relayStates = {};
        }
      } else {
        this._selectedScene = null;
        this._sceneName = "";
        this._entities = [];
        this._relayStates = {};
        this._fetchScenesFromBackend();
      }
      this._safeRender();
    }
  }

  set hass(hass) {
    const firstUpdate = this._hass === null;
    this._hass = hass;
    // Only fetch scenes on first update or initial render
    if (firstUpdate || !this._hasInitialRender) {
      this._fetchScenesFromBackend();
    }
  }

  _safeRender() {
    if (this._isRendering) {
      this._pendingRender = true;
      return;
    }
    this._isRendering = true;
    try {
      console.debug(`[Savant Card] Rendering view: ${this._view}, scenes count: ${this._scenes.length}`);
      this.render();
      this._hasInitialRender = true;
    } catch (error) {      
      console.error("Error rendering Savant Energy Scenes Standalone card:", error);
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
      this._fetchBreakersForEditor(sceneId);
    } else {
      this._sceneName = "";
      this._entities = [];
      this._relayStates = {};
      this._safeRender();
    }
  }

  async _onCreateScene() {
    if (!this._sceneName.trim()) {
      this._showToast("Please enter a scene name");
      return;
    }
    try {
      const sceneData = {
        name: this._sceneName.trim(),
        // When creating from the scenes view, this._entities is empty, so relay_states will be {}
        // This is appropriate for a new scene; it can be edited subsequently.
        relay_states: this._entities.reduce((acc, ent) => {
          acc[ent.entity_id] = this._relayStates[ent.entity_id] !== undefined ? this._relayStates[ent.entity_id] : true;
          return acc;
        }, {})
      };
      console.info("[Savant Card] Creating scene with data (callApi):", sceneData);
      // Use this._hass.callApi for creating scenes via POST to the scenes collection endpoint
      const result = await this._hass.callApi("POST", "savant_energy/scenes", sceneData);
      console.info("[Savant Card] Create scene API response (callApi):", result);

      if (result && (result.scene_id || result.id || result.status === "ok" || result.success)) { // Adjust based on actual backend response
        this._showToast(`Scene "${this._sceneName.trim()}" created successfully`);
        this._sceneName = ""; // Clear input field
        setTimeout(() => this._fetchScenesFromBackend(), 200); 
      } else {
        this._showToast(result?.message || "Error creating scene. Unexpected response.");
      }
    } catch (error) {
      console.error("[Savant Card] Error creating scene (callApi):", error);
      this._showToast("Error creating scene: " + (error.message || error));
    }
  }

  async _onDeleteScene(sceneId) {
    if (!sceneId) {
        this._showToast("Cannot delete: Scene ID is missing.");
        return;
    }
    try {
      console.info(`[Savant Card] Deleting scene '${sceneId}' (callApi)`);
      // Use this._hass.callApi for deleting scenes via DELETE to the specific scene endpoint
      const result = await this._hass.callApi("DELETE", `savant_energy/scenes/${sceneId}`);
      console.info(`[Savant Card] Delete scene '${sceneId}' API response (callApi):`, result);

      // Assuming the backend returns a success status or relevant message
      // callApi throws for non-ok HTTP status, so if we are here, it was likely a 2xx response.
      this._showToast(result?.message || `Scene deleted successfully`);
      if (this._selectedScene === sceneId) {
          this._selectedScene = null;
          this._sceneName = "";
          this._entities = [];
          this._relayStates = {};
      }
      setTimeout(() => this._fetchScenesFromBackend(), 200);
    } catch (error) {
      console.error(`[Savant Card] Error deleting scene '${sceneId}' (callApi):`, error);
      this._showToast("Error deleting scene: " + (error.message || error));
    }
  }

  async _onSaveEditor() {
    if (!this._selectedScene) {
        this._showToast("No scene selected to save.");
        return;
    }
    if (!this._sceneName.trim()) {
        this._showToast("Scene name cannot be empty.");
        return;
    }
    try {
      const sceneData = {
        name: this._sceneName.trim(),
        relay_states: this._entities.reduce((acc, ent) => {
          acc[ent.entity_id] = !!this._relayStates[ent.entity_id]; // Use entity_id as key
          return acc;
        }, {})
      };
      console.info(`[Savant Card] Saving scene '${this._selectedScene}' with data (callApi):`, sceneData);
      // Use this._hass.callApi for updating scenes via PUT to the specific scene endpoint
      const result = await this._hass.callApi("PUT", `savant_energy/scenes/${this._selectedScene}`, sceneData);
      console.info(`[Savant Card] Update scene '${this._selectedScene}' API response (callApi):`, result);

      if (result && (result.status === "ok" || result.success || result.scene_id || result.id)) { // Adjust based on actual backend response
        this._showToast(`Scene "${this._sceneName.trim()}" updated successfully`);
        setTimeout(() => this._fetchScenesFromBackend(), 200);
      } else {
        this._showToast(result?.message || "Error saving scene. Unexpected response.");
      }
    } catch (error) {
      console.error(`[Savant Card] Error saving scene '${this._selectedScene}' (callApi):`, error);
      this._showToast("Error saving scene: " + (error.message || error));
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
