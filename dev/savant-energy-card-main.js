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

