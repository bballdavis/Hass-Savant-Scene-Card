// API utility for Savant Energy Scenes Card
// Handles all REST API calls to the Home Assistant backend

export class SavantEnergyApi {
  constructor(hass) {
    this._hass = hass;
  }

  async fetchScenes() {
    const resp = await this._hass.callApi("GET", "savant_energy/scenes");
    if (resp && resp.scenes) {
      return resp.scenes.map(s => ({ id: s.scene_id, name: s.name }));
    }
    return [];
  }

  async fetchBreakers(sceneId) {
    if (!sceneId) return { entities: [], relayStates: {} };
    const result = await this._hass.callApi("GET", `savant_energy/scene_breakers/${sceneId}`);
    if (result && result.breakers && typeof result.breakers === 'object') {
      return {
        relayStates: { ...result.breakers },
        entities: Object.keys(result.breakers).map(entity_id => ({ entity_id }))
      };
    }
    return { entities: [], relayStates: {} };
  }

  async createScene(name, relayStates) {
    return await this._hass.callApi("POST", "savant_energy/scenes", {
      name,
      relay_states: relayStates || {},
    });
  }

  async updateScene(sceneId, name, relayStates) {
    return await this._hass.callApi("POST", `savant_energy/scenes/${sceneId}`,
      { name, relay_states: relayStates || {} }
    );
  }

  async deleteScene(sceneId) {
    return await this._hass.callApi("DELETE", `savant_energy/scenes/${sceneId}`);
  }
}

// CSS for Savant Energy Scenes Card
// Export as a string for easy import

export const cardStyle = `
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

// Savant Energy Scenes Card Editor (standalone, for modular build)
export class SavantEnergyScenesCardEditor extends HTMLElement {
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
        ha-switch { padding: 16px 0; }
        .side-by-side { display: flex; }
        .side-by-side > * { flex: 1; padding-right: 4px; }
      </style>
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

import { SavantEnergyApi } from './savant-energy-api.js';
import { cardStyle } from './savant-energy-card-style.js';
import { SavantEnergyScenesCardEditor } from './savant-energy-card-editor.js';

// Register the card in the customCards array - important for Home Assistant to discover the card
console.info(
  "%c SAVANT-ENERGY-SCENES-STANDALONE-CARD %c v1.1.18 ",
  "color: white; background: #4CAF50; font-weight: 700;",
  "color: #4CAF50; background: white; font-weight: 700;"
);

class SavantEnergyScenesCard extends HTMLElement {
  constructor() {
    super();
    this.api = null;
    this.scenes = [];
    this.selectedScene = null;
    this.relayStates = {};
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.api) {
      this.api = new SavantEnergyApi(hass);
      this.loadScenes();
    }
  }

  async loadScenes() {
    this.scenes = await this.api.fetchScenes();
    this.selectedScene = this.scenes.length ? this.scenes[0].id : null;
    this.loadBreakers();
    this.render();
  }

  async loadBreakers() {
    if (this.selectedScene) {
      const { entities, relayStates } = await this.api.fetchBreakers(this.selectedScene);
      this.relayStates = relayStates;
      this.entities = entities;
    } else {
      this.relayStates = {};
      this.entities = [];
    }
    this.render();
  }

  async createScene(name) {
    await this.api.createScene(name, this.relayStates);
    this.loadScenes();
  }

  async updateScene(name) {
    if (this.selectedScene) {
      await this.api.updateScene(this.selectedScene, name, this.relayStates);
      this.loadScenes();
    }
  }

  async deleteScene() {
    if (this.selectedScene) {
      await this.api.deleteScene(this.selectedScene);
      this.loadScenes();
    }
  }

  toggleRelay(entityId) {
    this.relayStates[entityId] = !this.relayStates[entityId];
    this.render();
  }

  render() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }

    this.shadowRoot.innerHTML = `
      ${cardStyle}
      <div class="card">
        <div class="header">Savant Energy Scenes</div>
        <div class="scene-controls">
          <select class="scene-select" @change="${this.handleSceneChange.bind(this)}">
            ${this.scenes.map(scene => `<option value="${scene.id}" ${scene.id === this.selectedScene ? 'selected' : ''}>${scene.name}</option>`).join('')}
          </select>
          <input type="text" class="scene-name-editor-input" placeholder="Scene Name" />
          <button @click="${this.createScene.bind(this)}">Create</button>
          <button @click="${this.updateScene.bind(this)}">Update</button>
          <button class="delete-btn" @click="${this.deleteScene.bind(this)}">Delete</button>
        </div>
        <div class="breaker-columns">
          ${this.entities.map(entity => `
            <div class="breaker-col">
              <div class="breaker-switch-row">
                <span class="breaker-label">${entity.entity_id}</span>
                <div class="breaker-switch ${this.relayStates[entity.entity_id] ? 'on' : 'off'}" @click="${() => this.toggleRelay(entity.entity_id)}">
                  <div class="breaker-switch-thumb"></div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  handleSceneChange(event) {
    this.selectedScene = event.target.value;
    this.loadBreakers();
  }

  connectedCallback() {
    this.render();
  }
}

// Register editor (already imported)

window.customCards = window.customCards || [];
window.customCards.push({
  type: "savant-energy-scenes-standalone-card",
  name: "Savant Energy Scenes Standalone Card",
  description: "A custom standalone card for Savant Energy scenes."
});

customElements.define("savant-energy-scenes-standalone-card", SavantEnergyScenesCard);
customElements.define("savant-energy-scenes-standalone-card-editor", SavantEnergyScenesCardEditor);


