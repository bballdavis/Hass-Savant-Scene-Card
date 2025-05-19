// Savant Energy Scenes Card Editor (standalone, for modular build)
class SavantEnergyScenesCardEditor extends HTMLElement {
  setConfig(config) {
    this.__config = { show_header: true, ...config };
    this.render();
  }

  getConfig() {
    return this._config;
  }

  get _config() {
    return this.__config;
  }

  render() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
    const showHeader = this._config.show_header !== false;
    this.shadowRoot.innerHTML = `
      <style>
        ha-switch { padding: 16px 0; }
        .side-by-side { display: flex; }
        .side-by-side > * { flex: 1; padding-right: 4px; }
        .option-row { display: flex; align-items: center; margin-bottom: 8px; }
        .option-label { flex: 1; }
      </style>
      <div>
        <div class="option-row">
          <span class="option-label">Show Header</span>
          <input type="checkbox" class="show-header-toggle" ${showHeader ? 'checked' : ''} />
        </div>
        <p>Savant Energy Scenes Standalone Card has no other configuration options.</p>
        <p>This card provides an interface for managing Savant Energy scenes.</p>
      </div>
    `;
    this.shadowRoot.querySelector('.show-header-toggle').addEventListener('change', (e) => {
      if (this._config.show_header !== e.target.checked) {
        this.__config = { ...this._config, show_header: e.target.checked };
        this._fireConfigChanged();
      }
    });
  }

  _fireConfigChanged() {
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    }));
  }

  connectedCallback() {
    this.render();
  }
}
