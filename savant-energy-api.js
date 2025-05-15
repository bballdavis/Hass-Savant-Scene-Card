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
