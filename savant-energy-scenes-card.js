// Savant Energy Scenes Standalone Card v1.1.3

// Register the card in the customCards array - important for Home Assistant to discover the card
console.info(
  "%c SAVANT-ENERGY-SCENES-STANDALONE-CARD %c v1.1.17 ",
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
    this._errorMessage = ""; // Track error messages
    this._currentView = ""; // Track current view
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

  async _fetchScenesFromBackend(triggerRender = true) {
    console.log(`[Savant Card] _fetchScenesFromBackend called. triggerRender: ${triggerRender}`);
    try {
      const scenesData = await this._hass.callWS({ type: "savant_energy/get_scenes" });
      if (scenesData && scenesData.scenes) {
        this._scenes = [...scenesData.scenes]; // Ensure new array instance
        console.info("[Savant Card] Scenes fetched:", this._scenes.length, "scenes");
      } else {
        this._scenes = [];
        console.warn("[Savant Card] No scenes data returned from backend or format is unexpected.");
      }
    } catch (e) {
      console.error("[Savant Card] Error fetching scenes from backend:", e);
      this._scenes = [];
      this._errorMessage = "Error fetching scenes: " + (e.message || "Unknown error");
    }
    if (triggerRender) {
      this._safeRender();
    }
  }

  async _fetchBreakersForEditor(sceneId) {
    if (!sceneId) {
      this._entities = [];
      this._relayStates = {};
      return;
    }
    try {
      const result = await this._hass.callApi("GET", `savant_energy/scene_breakers/${sceneId}`);
      console.info(`[Savant Card] Raw get_scene_breakers API response (callApi) for scene '${sceneId}':`, result);
      if (result && result.breakers && typeof result.breakers === 'object') {
        this._entities = Object.keys(result.breakers).map(entity_id => {
          const stateObj = this._hass.states[entity_id];
          let displayName = entity_id; // Default to entity_id
          if (stateObj && stateObj.attributes) {
            if (typeof stateObj.attributes.name === 'string' && stateObj.attributes.name.trim() !== '') {
              displayName = stateObj.attributes.name;
            } else if (typeof stateObj.attributes.friendly_name === 'string' && stateObj.attributes.friendly_name.trim() !== '') {
              displayName = stateObj.attributes.friendly_name;
            }
          }
          return {
            entity_id,
            attributes: { friendly_name: displayName },
          };
        });
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
  }

  async _setView(view) {
    console.log(`[Savant Card] Setting view to: ${view}. Current _selectedScene: '${this._selectedScene}'`);
    this._currentView = view;
    this._errorMessage = ""; // Clear errors when switching views

    if (view === 'editor') {
      await this._fetchScenesFromBackend(false); // Fetch latest scenes without triggering render yet
      console.log(`[Savant Card] _setView (editor): Fetched scenes. Count: ${this._scenes.length}. Current _selectedScene: '${this._selectedScene}'`);

      const selectedSceneStillExists = this._selectedScene && this._scenes.find(s => s.id === this._selectedScene);

      if (selectedSceneStillExists) {
        const sceneInfo = this._scenes.find(s => s.id === this._selectedScene);
        this._sceneName = sceneInfo?.name || "";
        console.log(`[Savant Card] _setView (editor): Maintaining selected scene '${this._selectedScene}', updated name to '${this._sceneName}'`);
        await this._fetchBreakersForEditor(this._selectedScene);
        console.log(`[Savant Card] _setView (editor): Fetched breakers for '${this._selectedScene}'. Entities count: ${this._entities.length}`);
      } else {
        if (this._selectedScene) {
            console.log(`[Savant Card] _setView (editor): Previously selected scene '${this._selectedScene}' no longer valid. Resetting selection.`);
        } else {
            console.log(`[Savant Card] _setView (editor): No scene initially selected. Resetting editor fields.`);
        }
        this._selectedScene = '';
        this._sceneName = "";
        this._entities = [];
        this._relayStates = {};
      }
    }
    console.log(`[Savant Card] _setView: Calling _safeRender(). View: ${view}, _selectedScene: '${this._selectedScene}', _sceneName: '${this._sceneName}'`);
    this._safeRender();
  }

  set hass(hass) {
    const firstUpdate = this._hass === null;
    this._hass = hass;
    if (firstUpdate || !this._hasInitialRender) {
      this._initializeScenes();
    }
  }

  async _initializeScenes() {
    await this._fetchScenesFromBackend();
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

  async _onSceneSelect(e) {
    const sceneId = e.target.value;
    console.log(`[Savant Card] _onSceneSelect: Scene selected via dropdown. New ID: '${sceneId}', Previous ID: '${this._selectedScene}'`);
    this._selectedScene = sceneId;
    if (sceneId) {
      const sceneInfo = this._scenes.find(s => s.id === sceneId);
      this._sceneName = sceneInfo?.name || "";
      console.log(`[Savant Card] _onSceneSelect: Set _sceneName to '${this._sceneName}'. Fetching breakers.`);
      await this._fetchBreakersForEditor(sceneId);
      console.log(`[Savant Card] _onSceneSelect: Breakers fetched. Entities count: ${this._entities.length}`);
    } else {
      this._sceneName = "";
      this._entities = [];
      this._relayStates = {};
      console.log("[Savant Card] _onSceneSelect: 'Select a scene' chosen. Cleared scene name and breakers.");
    }
    console.log(`[Savant Card] _onSceneSelect: Calling _safeRender(). _selectedScene: '${this._selectedScene}', _sceneName: '${this._sceneName}'`);
    this._safeRender();
  }

  _onSceneNameChange(e) {
    this._sceneName = e.target.value;
    if (this._currentView === 'editor') {
      this._safeRender();
    }
  }

  async _onCreateScene() {
    const newSceneNameFromPrompt = prompt("Enter the name for the new scene:", "New Scene");
    if (!newSceneNameFromPrompt || !newSceneNameFromPrompt.trim()) {
      console.log("[Savant Card] Scene creation cancelled or empty name provided.");
      return;
    }
    const newSceneName = newSceneNameFromPrompt.trim();
    console.log(`[Savant Card] _onCreateScene: Attempting to create scene with name '${newSceneName}'`);

    try {
      const result = await this._hass.callWS({
        type: "savant_energy/create_scene",
        name: newSceneName,
      });
      console.log(`[Savant Card] _onCreateScene: Backend call 'create_scene' complete. Result:`, JSON.stringify(result));

      if (result && result.success && result.scene_id) {
        await this._fetchScenesFromBackend(false);
        console.log(`[Savant Card] _onCreateScene: _fetchScenesFromBackend complete. Scenes count: ${this._scenes.length}`);
        
        this._selectedScene = result.scene_id;
        const newSceneDetails = this._scenes.find(s => s.id === result.scene_id);
        
        if (newSceneDetails) {
          this._sceneName = newSceneDetails.name;
          console.log(`[Savant Card] _onCreateScene: New scene '${this._sceneName}' (ID: ${this._selectedScene}) selected and name set from fetched data.`);
        } else {
          console.warn(`[Savant Card] _onCreateScene: Newly created scene (ID: ${result.scene_id}) NOT FOUND in list after fetch. Using prompted name '${newSceneName}'. This is unexpected.`);
          this._sceneName = newSceneName;
        }
        
        await this._fetchBreakersForEditor(this._selectedScene);
        console.log(`[Savant Card] _onCreateScene: _fetchBreakersForEditor for scene '${this._selectedScene}' complete. Entities: ${this._entities.length}`);
        
        console.log(`[Savant Card] _onCreateScene: Calling _safeRender(). _selectedScene: '${this._selectedScene}', _sceneName: '${this._sceneName}'`);
        this._safeRender();
        this._hass.callService('notify', 'persistent_notification', {
            message: `Scene '${this._sceneName}' created successfully.`,
            title: 'Savant Energy Scenes'
        });
        this._errorMessage = "";
      } else {
        const errorMsg = result && result.error ? result.error : "Unknown error from backend.";
        console.error(`[Savant Card] Failed to create scene. Backend response: ${errorMsg}`, result);
        this._errorMessage = "Failed to create scene: " + errorMsg;
        this._safeRender();
      }
    } catch (e) {
      console.error("[Savant Card] Error creating scene in _onCreateScene:", e);
      this._errorMessage = "Error creating scene: " + (e.message || "Unknown error");
      this._safeRender();
    }
  }

  async _onSaveEditor() {
    if (!this._selectedScene || !this._sceneName.trim()) {
      console.warn("[Savant Card] _onSaveEditor: Save attempt with no scene selected or empty name.");
      this._errorMessage = "Please select a scene and provide a valid name.";
      this._safeRender();
      return;
    }

    const newName = this._sceneName.trim();
    const originalSceneObject = this._scenes.find(s => s.id === this._selectedScene);
    const originalName = originalSceneObject ? originalSceneObject.name : '[Unknown original name]';
    
    console.log(`[Savant Card] _onSaveEditor: Saving scene ID '${this._selectedScene}'. Original name: '${originalName}', New name from input: '${newName}'`);

    if (originalName === newName) {
        console.log("[Savant Card] _onSaveEditor: Scene name hasn't changed. No save action needed.");
        return;
    }

    try {
      await this._hass.callWS({
        type: "savant_energy/update_scene_name",
        scene_id: this._selectedScene,
        name: newName,
      });
      console.log(`[Savant Card] _onSaveEditor: Backend call 'update_scene_name' complete for ID '${this._selectedScene}' with new name '${newName}'`);

      await this._fetchScenesFromBackend(false);
      console.log(`[Savant Card] _onSaveEditor: _fetchScenesFromBackend complete. Scenes count: ${this._scenes.length}`);

      const sceneJustSaved = this._scenes.find(s => s.id === this._selectedScene);
      if (sceneJustSaved) {
        this._sceneName = sceneJustSaved.name;
        console.log(`[Savant Card] _onSaveEditor: Found saved scene in new list. ID: '${sceneJustSaved.id}', Updated _sceneName to: '${this._sceneName}'`);
      } else {
        console.warn(`[Savant Card] _onSaveEditor: Saved scene (ID: ${this._selectedScene}) NOT FOUND in list after fetch. This is unexpected if save was successful.`);
        this._selectedScene = '';
        this._sceneName = '';
        this._entities = [];
        this._relayStates = {};
        console.log(`[Savant Card] _onSaveEditor: Resetting selection as scene ${this._selectedScene} no longer exists post-save attempt.`);
      }
      
      console.log(`[Savant Card] _onSaveEditor: Calling _safeRender(). _selectedScene: '${this._selectedScene}', _sceneName: '${this._sceneName}'`);
      this._safeRender();
      this._hass.callService('notify', 'persistent_notification', {
          message: `Scene '${newName}' saved successfully.`,
          title: 'Savant Energy Scenes'
      });
      this._errorMessage = "";

    } catch (e) {
      console.error("[Savant Card] Error saving scene in _onSaveEditor:", e);
      this._errorMessage = "Error saving scene: " + (e.message || "Unknown error");
      this._safeRender();
    }
  }

  async _onDeleteScene() {
    if (!this._selectedScene) {
      console.warn("[Savant Card] _onDeleteScene: Delete attempt with no scene selected.");
      this._errorMessage = "Please select a scene to delete.";
      this._safeRender();
      return;
    }

    const sceneToDelete = this._scenes.find(s => s.id === this._selectedScene);
    const sceneNameToDelete = sceneToDelete ? sceneToDelete.name : this._selectedScene;

    if (!confirm(`Are you sure you want to delete the scene "${sceneNameToDelete}"?`)) {
      console.log("[Savant Card] _onDeleteScene: Deletion cancelled by user.");
      return;
    }
    console.log(`[Savant Card] _onDeleteScene: Attempting to delete scene ID '${this._selectedScene}' (Name: '${sceneNameToDelete}')`);

    try {
      await this._hass.callWS({
        type: "savant_energy/delete_scene",
        scene_id: this._selectedScene,
      });
      console.log(`[Savant Card] _onDeleteScene: Backend call 'delete_scene' complete for ID '${this._selectedScene}'`);

      const deletedSceneIdCache = this._selectedScene;

      await this._fetchScenesFromBackend(false);
      console.log(`[Savant Card] _onDeleteScene: _fetchScenesFromBackend complete. Scenes count: ${this._scenes.length}`);

      console.log(`[Savant Card] _onDeleteScene: Resetting selection state as scene '${deletedSceneIdCache}' was targeted for deletion.`);
      this._selectedScene = '';
      this._sceneName = "";
      this._entities = [];
      this._relayStates = {};
      
      console.log(`[Savant Card] _onDeleteScene: Calling _safeRender(). _selectedScene: '${this._selectedScene}', _sceneName: '${this._sceneName}'`);
      this._safeRender();
      this._hass.callService('notify', 'persistent_notification', {
          message: `Scene '${sceneNameToDelete}' deleted successfully.`,
          title: 'Savant Energy Scenes'
      });
      this._errorMessage = "";

    } catch (e) {
      console.error("[Savant Card] Error deleting scene in _onDeleteScene:", e);
      this._errorMessage = "Error deleting scene: " + (e.message || "Unknown error");
      this._safeRender();
    }
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
        .breaker-columns {
          display: flex;
          gap: 8px;
          width: 100%;
          max-width: 100%;
        }
        .breaker-col {
          flex: 1 1 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }
        .breaker-switch-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          min-width: 0;
        }
        .breaker-label {
          font-size: 0.73em;
          color: var(--primary-text-color, #222);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 120px;
        }
        .breaker-switch {
          width: 36px;
          height: 18px;
          border-radius: 9px;
          background: var(--disabled-color, #e0e0e0);
          border: 1px solid var(--divider-color, #bbb);
          position: relative;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
          display: flex;
          align-items: center;
          outline: none;
        }
        .breaker-switch.on {
          background: var(--primary-color, #03a9f4);
          border-color: var(--primary-color, #03a9f4);
        }
        .breaker-switch.off {
          background: var(--disabled-color, #e0e0e0);
          border-color: var(--divider-color, #bbb);
        }
        .breaker-switch-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 1px 2px rgba(0,0,0,0.08);
          position: absolute;
          left: 2px;
          top: 1px;
          transition: left 0.2s;
        }
        .breaker-switch.on .breaker-switch-thumb {
          left: 20px;
        }
        .breaker-switch.off .breaker-switch-thumb {
          left: 2px;
        }
        .breaker-switch:focus {
          box-shadow: 0 0 0 2px var(--primary-color, #03a9f4, 0.2);
        }
        .switch-list {
          display: none;
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
          flex: 1 1 30%;
          min-width: 130px;
        }
        .scene-name-editor-input {
          flex: 1 1 50%;
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
      const breakerColumns = [[], []];
      this._entities.forEach((ent, idx) => {
        const col = idx % 2;
        const friendlyName = ent.attributes?.friendly_name || ent.entity_id;
        breakerColumns[col].push(`
          <div class="breaker-switch-row">
            <span class="breaker-label" title="${friendlyName}">${friendlyName}</span>
            <div class="breaker-switch${this._relayStates[ent.entity_id] !== false ? ' on' : ' off'}" data-entity="${ent.entity_id}" tabindex="0" role="switch" aria-checked="${this._relayStates[ent.entity_id] !== false}">
              <div class="breaker-switch-thumb"></div>
            </div>
          </div>
        `);
      });
      content = `
        <div class="scene-controls">
          <select class="scene-select input">
            <option value="" ${!this._selectedScene ? "selected" : ""}>Select a scene</option>
            ${this._scenes.map(s => `<option value="${s.id}" ${this._selectedScene === s.id ? "selected" : ""}>${s.name}</option>`).join("")}
          </select>
          <input class="input scene-name-editor-input" type="text" placeholder="Scene name" value="${this._sceneName}" ${!this._selectedScene ? "disabled" : ""}>
          <button class="save-scene-button" ${(!this._selectedScene || !this._sceneName.trim()) ? " disabled" : ""}>Save</button>
        </div>
        <div class="breaker-columns">
          <div class="breaker-col">${breakerColumns[0].join("")}</div>
          <div class="breaker-col">${breakerColumns[1].join("")}</div>
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
    this.shadowRoot.querySelectorAll('.pill').forEach(pill => {
      pill.addEventListener('click', e => {
        const view = pill.getAttribute('data-view');
        this._setView(view);
      });
    });
    if (this._view === 'scenes') {
      const inputEl = this.shadowRoot.querySelector('.scene-name-input');
      const buttonEl = this.shadowRoot.querySelector('button:not(.save-scene-button)');
      if (inputEl && buttonEl) {
        inputEl.addEventListener('input', e => {
          this._onSceneNameChange(e);
          buttonEl.disabled = e.target.value.trim() === "";
        });
        buttonEl.addEventListener('click', async () => {
          if (buttonEl.disabled) return;
          await this._onCreateScene();
        });
      }
      this.shadowRoot.querySelectorAll('.trash-icon').forEach(btn => {
        btn.addEventListener('click', e => {
          const id = btn.getAttribute('data-id');
          this._onDeleteScene(id);
        });
      });
    }
    if (this._view === 'editor') {
      this.shadowRoot.querySelector('.scene-select').addEventListener('change', e => this._onSceneSelect(e));
      
      const editorSceneNameInput = this.shadowRoot.querySelector('.scene-name-editor-input');
      const saveButton = this.shadowRoot.querySelector('.save-scene-button');

      if (editorSceneNameInput && saveButton) {
        editorSceneNameInput.addEventListener('input', e => {
          this._onSceneNameChange(e);
          saveButton.disabled = (!this._selectedScene || this._sceneName.trim() === "");
        });
        saveButton.addEventListener('click', () => this._onSaveEditor());
      }
      
      this.shadowRoot.querySelectorAll('.breaker-switch').forEach(sw => {
        sw.addEventListener('click', e => {
          const entityId = sw.getAttribute('data-entity');
          this._onRelayToggle(entityId);
        });
        sw.addEventListener('keydown', e => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            const entityId = sw.getAttribute('data-entity');
            this._onRelayToggle(entityId);
          }
        });
      });
    }
  }

  setConfig(config) {
    if (!config) {
      throw new Error("No configuration provided");
    }
    this._config = config;
    this._safeRender();
  }

  getCardSize() { 
    return 3; 
  }
}

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

window.customCards = window.customCards || [];
window.customCards.push({
  type: "savant-energy-scenes-standalone-card",
  name: "Savant Energy Scenes Standalone Card",
  description: "A custom standalone card for Savant Energy scenes."
});

customElements.define("savant-energy-scenes-standalone-card", SavantEnergyScenesCard);
customElements.define("savant-energy-scenes-standalone-card-editor", SavantEnergyScenesCardEditor);
