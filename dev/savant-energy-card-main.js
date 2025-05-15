// Register the card in the customCards array - important for Home Assistant to discover the card
console.info(
  "%c SAVANT-ENERGY-SCENES-STANDALONE-CARD %c v1.1.18 ",
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
    this._hasInitialRender = false;
    this._errorMessage = "";
    this._currentView = "";
    this.api = null;
    this.shadowRoot.innerHTML = `
      <ha-card header="Savant Energy Scenes Standalone">
        <div class="card-content">Loading...</div>
      </ha-card>
    `;
  }

  static getConfigElement() {
    return document.createElement("savant-energy-scenes-standalone-card-editor");
  }

  static getStubConfig() {
    return {};
  }

  set hass(hass) {
    const firstUpdate = this._hass === null;
    this._hass = hass;
    if (!this.api) {
      this.api = new SavantEnergyApi(hass);
    }
    if (firstUpdate || !this._hasInitialRender) {
      this._initializeScenes();
    }
  }

  async _initializeScenes() {
    await this._fetchScenesFromBackend();
  }

  async _fetchScenesFromBackend(triggerRender = true) {
    try {
      const scenes = await this.api.fetchScenes();
      this._scenes = scenes;
    } catch (e) {
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
      const { entities, relayStates } = await this.api.fetchBreakers(sceneId);
      this._entities = entities;
      this._relayStates = relayStates;
    } catch (e) {
      this._entities = [];
      this._relayStates = {};
    }
  }

  async _setView(view) {
    this._currentView = view;
    this._errorMessage = "";
    if (view === 'editor') {
      await this._fetchScenesFromBackend(false);
      const selectedSceneStillExists = this._selectedScene && this._scenes.find(s => s.id === this._selectedScene);
      if (selectedSceneStillExists) {
        const sceneInfo = this._scenes.find(s => s.id === this._selectedScene);
        this._sceneName = sceneInfo?.name || "";
        await this._fetchBreakersForEditor(this._selectedScene);
      } else {
        this._selectedScene = '';
        this._sceneName = "";
        this._entities = [];
        this._relayStates = {};
      }
    }
    this._safeRender();
  }

  async _onSceneSelect(e) {
    const sceneId = e.target.value;
    this._selectedScene = sceneId;
    if (sceneId) {
      const sceneInfo = this._scenes.find(s => s.id === sceneId);
      this._sceneName = sceneInfo?.name || "";
      await this._fetchBreakersForEditor(sceneId);
    } else {
      this._sceneName = "";
      this._entities = [];
      this._relayStates = {};
    }
    this._safeRender();
  }

  _onSceneNameChange(e) {
    this._sceneName = e.target.value;
    if (this._currentView === 'editor') {
      this._safeRender();
    }
  }

  _showToast(message, type = 'error') {
    const oldToast = this.shadowRoot.querySelector('.toast');
    if (oldToast) oldToast.remove();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    this.shadowRoot.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  async _onCreateScene() {
    const newSceneName = this._sceneName.trim();
    if (!newSceneName) return;
    try {
      await this.api.createScene(newSceneName, this._relayStates);
      await this._fetchScenesFromBackend(false);
      const newScene = this._scenes.find(s => s.name === newSceneName);
      this._selectedScene = newScene ? newScene.id : '';
      this._sceneName = '';
      await this._fetchBreakersForEditor(this._selectedScene);
      this._safeRender();
      this._showToast('Scene created successfully!', 'success');
    } catch (e) {
      this._errorMessage = "Error creating scene: " + (e.message || "Unknown error");
      this._safeRender();
      this._showToast(this._errorMessage, 'error');
    }
  }

  async _onSaveEditor() {
    if (!this._selectedScene || !this._sceneName.trim()) {
      this._errorMessage = "Please select a scene and provide a valid name.";
      this._safeRender();
      this._showToast(this._errorMessage, 'error');
      return;
    }
    const newName = this._sceneName.trim();
    try {
      await this.api.updateScene(this._selectedScene, newName, this._relayStates);
      await this._fetchScenesFromBackend(false);
      const updated = this._scenes.find(s => s.id === this._selectedScene);
      this._sceneName = updated ? updated.name : newName;
      this._safeRender();
      this._showToast('Scene updated successfully!', 'success');
    } catch (e) {
      this._errorMessage = "Error updating scene: " + (e.message || e);
      this._safeRender();
      this._showToast(this._errorMessage, 'error');
    }
  }

  async _onDeleteScene(sceneId) {
    try {
      await this.api.deleteScene(sceneId);
      await this._fetchScenesFromBackend(false);
      if (this._selectedScene === sceneId) {
        this._selectedScene = '';
        this._sceneName = '';
        this._entities = [];
        this._relayStates = {};
      }
      this._safeRender();
      this._showToast('Scene deleted successfully!', 'success');
    } catch (e) {
      this._errorMessage = "Error deleting scene: " + (e.message || e);
      this._safeRender();
      this._showToast(this._errorMessage, 'error');
    }
  }

  _onRelayToggle(entityId) {
    this._relayStates[entityId] = !this._relayStates[entityId];
    this._safeRender();
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
    } catch (error) {
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

  render() {
    if (!this._hass) return;
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
        ${cardStyle}
        <div class="card">
          <div class="header">Savant Energy Scenes Standalone</div>
          ${pillToggle}
          ${content || '<div class="card-content">No content available</div>'}
        </div>
        <style>
          .toast {
            position: fixed;
            left: 50%;
            bottom: 32px;
            transform: translateX(-50%) translateY(40px);
            background: #323232;
            color: #fff;
            padding: 10px 24px;
            border-radius: 6px;
            font-size: 1em;
            opacity: 0;
            pointer-events: none;
            z-index: 9999;
            transition: opacity 0.3s, transform 0.3s;
          }
          .toast.show {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
            pointer-events: auto;
          }
          .toast-success {
            background: #4caf50;
          }
          .toast-error {
            background: #e53935;
          }
        </style>
      </ha-card>
    `;
    this.shadowRoot.querySelectorAll('.pill').forEach(pill => {
      pill.addEventListener('click', e => {
        const view = pill.getAttribute('data-view');
        this._view = view;
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

window.customCards = window.customCards || [];
window.customCards.push({
  type: "savant-energy-scenes-standalone-card",
  name: "Savant Energy Scenes Standalone Card",
  description: "A custom standalone card for Savant Energy scenes."
});

customElements.define("savant-energy-scenes-standalone-card", SavantEnergyScenesCard);
customElements.define("savant-energy-scenes-standalone-card-editor", SavantEnergyScenesCardEditor);

