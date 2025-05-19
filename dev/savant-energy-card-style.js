// CSS for Savant Energy Scenes Card
// Export as a string for easy import

const cardStyle = `
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
      margin-top: 12px;
      margin-bottom: 12px;
      margin-left: 8px;
      margin-right: 8px;
      /* Optionally, add padding if you want more space inside the header */
      /* padding: 8px 0; */
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
