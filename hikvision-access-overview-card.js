/**
 * Hikvision Access Overview Card
 * Eigenständiges HACS-Frontend-Repo — nur diese eine Datei als Lovelace-Ressource.
 *
 * HACS: nach Installation erscheint automatisch
 *   /hacsfiles/hikvision-access-overview-card/hikvision-access-overview-card.js
 */

class HikvisionAccessOverviewCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  static _normalizeDevices(devices) {
    if (!devices || !Array.isArray(devices)) return [];
    return devices.map((d) => {
      if (typeof d === "string") return { device: d, title: "" };
      return { device: d.device, title: d.title || "" };
    }).filter((d) => d.device);
  }

  setConfig(config) {
    const devices = HikvisionAccessOverviewCard._normalizeDevices(config.devices);
    if (!devices.length) {
      throw new Error(
        "Pflichtfeld 'devices' fehlt oder ist leer — Beispiel: devices: [hintereingang_halle, nebeneingang]"
      );
    }
    this._config = { ...config, devices };
    if (this._hass) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    const fp = this._fingerprint();
    if (fp === this._lastFp) return;
    this._lastFp = fp;
    this._render();
  }

  _fingerprint() {
    const parts = [];
    for (const { device: p } of this._config.devices) {
      const ids = [
        `binary_sensor.${p}_tur`,
        `binary_sensor.${p}_bewegungsmelder`,
        `sensor.${p}_letzte_person`,
        `sensor.${p}_letztes_event`,
        `sensor.${p}_zugang`,
        `sensor.${p}_geratestatus`,
        `switch.${p}_zugangssperre`,
      ];
      for (const id of ids) {
        const s = this._hass?.states?.[id];
        parts.push(s ? `${id}:${s.state}` : `${id}:`);
      }
    }
    return parts.join("\x00");
  }

  _s(entityId) {
    return this._hass?.states?.[entityId] ?? null;
  }

  _val(entityId, fallback = "—") {
    const s = this._s(entityId);
    if (!s || ["unavailable", "unknown", "none"].includes(s.state)) return fallback;
    return s.state;
  }

  _moreInfo(entityId) {
    this.dispatchEvent(
      new CustomEvent("hass-more-info", {
        bubbles: true,
        composed: true,
        detail: { entityId },
      })
    );
  }

  _navigate(path) {
    history.pushState(null, "", path);
    window.dispatchEvent(
      new CustomEvent("location-changed", { bubbles: true, composed: true })
    );
  }

  _render() {
    if (!this._config || !this._hass) return;

    const cardTitle =
      this._config.title ||
      "Zugang — Übersicht";

    const rows = this._config.devices
      .map(({ device: p, title: rowTitle }) => {
        const label =
          rowTitle ||
          p.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        const doorState = this._val(`binary_sensor.${p}_tur`);
        const motionState = this._val(`binary_sensor.${p}_bewegungsmelder`);
        const personState = this._val(`sensor.${p}_letzte_person`);
        const accessState = this._val(`sensor.${p}_zugang`);
        const devStatus = this._val(`sensor.${p}_geratestatus`);
        const lockEntityId = `switch.${p}_zugangssperre`;
        const lockState = this._val(lockEntityId);
        const locked = lockState === "on";

        const doorOpen = doorState === "on";
        const motionActive = motionState === "on";
        const connected = devStatus === "connected";
        const granted = accessState === "granted";
        const denied = accessState === "denied";

        const doorLabel = doorOpen
          ? "Offen"
          : doorState === "—"
            ? "—"
            : "Zu";
        const accessLabel = granted ? "OK" : denied ? "Nein" : "—";
        const accessColor = granted
          ? "var(--success-color,#4CAF50)"
          : denied
            ? "var(--error-color,#F44336)"
            : "var(--secondary-text-color)";
        const statusColor = connected
          ? "var(--success-color,#4CAF50)"
          : "var(--error-color,#F44336)";
        const lockColor = locked
          ? "var(--error-color,#F44336)"
          : "var(--success-color,#4CAF50)";

        return {
          p, label, doorLabel, personState, accessLabel, accessColor, statusColor,
          lockColor, locked, motionActive, lockEntityId, connected,
        };
      })
      .map(
        (r) => `
      <div class="row" data-prefix="${r.p}">
        <div class="row-main" data-action="info">
          <div class="shape" style="background:rgba(var(--rgb-primary-color,3,169,244),.12)">
            <ha-icon icon="mdi:shield-account" style="color:var(--primary-color)"></ha-icon>
          </div>
          <div class="row-text">
            <div class="row-title">
              <span class="primary">${r.label}</span>
              <span class="status-dot" style="background:${r.statusColor}" title="${r.connected ? "Online" : "Offline"}"></span>
            </div>
            <div class="meta">
              <span><ha-icon icon="mdi:door" style="--mdc-icon-size:14px"></ha-icon> ${r.doorLabel}</span>
              <span class="${r.motionActive ? "motion-on" : ""}"><ha-icon icon="${r.motionActive ? "mdi:motion-sensor" : "mdi:motion-sensor-off"}" style="--mdc-icon-size:14px"></ha-icon></span>
              <span style="color:${r.accessColor};font-weight:600">${r.accessLabel}</span>
              <span class="person" title="${r.personState}">${r.personState}</span>
            </div>
          </div>
        </div>
        <button class="lock-btn" data-lock="${r.p}" title="${r.locked ? "Entsperren" : "Sperren"}">
          <ha-icon icon="${r.locked ? "mdi:lock" : "mdi:lock-open-variant"}" style="color:${r.lockColor}"></ha-icon>
        </button>
      </div>`
      )
      .join("");

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card {
          padding: 10px 12px 8px;
          --row-icon: 34px;
        }
        .card-title {
          font-size: var(--mushroom-card-primary-font-size, 14px);
          font-weight: 600;
          color: var(--primary-text-color);
          margin: 0 0 10px 2px;
        }
        .row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 8px;
          border-radius: var(--ha-card-border-radius, 10px);
          background: var(--secondary-background-color, rgba(0,0,0,.04));
          margin-bottom: 6px;
        }
        .row:last-child { margin-bottom: 0; }
        .row-main {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }
        .row-main:hover .primary { opacity: .75; }
        .shape {
          width: var(--row-icon);
          height: var(--row-icon);
          border-radius: var(--mushroom-shape-border-radius, 50%);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .shape ha-icon { --mdc-icon-size: 18px; }
        .row-text { min-width: 0; flex: 1; }
        .row-title {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .primary {
          font-size: 13px;
          font-weight: 600;
          color: var(--primary-text-color);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: calc(100% - 14px);
        }
        .status-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px 12px;
          margin-top: 2px;
          font-size: 11px;
          color: var(--secondary-text-color);
        }
        .meta span { display: inline-flex; align-items: center; gap: 3px; }
        .person {
          max-width: 140px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .motion-on { color: var(--warning-color,#FF9800); }
        .lock-btn {
          width: var(--row-icon);
          height: var(--row-icon);
          border-radius: 50%;
          border: none;
          background: rgba(var(--rgb-primary-text-color,0,0,0),.06);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
        }
        .lock-btn:hover { filter: brightness(.92); }
        .lock-btn ha-icon { --mdc-icon-size: 18px; }
      </style>
      <ha-card>
        <div class="card-title">${cardTitle}</div>
        ${rows}
      </ha-card>
    `;

    this.shadowRoot.querySelectorAll(".row-main[data-action=info]").forEach((el) => {
      const row = el.closest(".row");
      const p = row?.dataset?.prefix;
      if (!p) return;
      el.addEventListener("click", () =>
        this._moreInfo(`sensor.${p}_geratestatus`)
      );
    });

    this.shadowRoot.querySelectorAll("button[data-lock]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const p = btn.dataset.lock;
        const lockEntityId = `switch.${p}_zugangssperre`;
        const locked = this._val(lockEntityId) === "on";
        this._hass.callService("switch", locked ? "turn_off" : "turn_on", {
          entity_id: lockEntityId,
        });
      });
    });

    this.shadowRoot.querySelectorAll(".row").forEach((row) => {
      const p = row.dataset.prefix;
      if (!p) return;
      row.addEventListener("dblclick", () => {
        const ids = [
          `sensor.${p}_letztes_event`,
          `sensor.${p}_letzte_person`,
          `binary_sensor.${p}_tur`,
          `sensor.${p}_zugang`,
        ].join(",");
        this._navigate(`/history?entity_id=${ids}`);
      });
    });
  }

  getCardSize() {
    return Math.min(2 + this._config.devices.length, 6);
  }

  static getConfigElement() {
    return document.createElement("hikvision-access-overview-card-editor");
  }

  static getStubConfig() {
    return {
      title: "Gebäude — Zugang",
      devices: ["hintereingang_halle", "nebeneingang"],
    };
  }
}

if (!customElements.get("hikvision-access-overview-card")) {
  customElements.define("hikvision-access-overview-card", HikvisionAccessOverviewCard);
}

class HikvisionAccessOverviewCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
  }

  _fire(config) {
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config },
        bubbles: true,
        composed: true,
      })
    );
  }

  _render() {
    if (!this._config) return;
    const devices = HikvisionAccessOverviewCard._normalizeDevices(
      this._config.devices
    );
    const lines = devices.length
      ? devices.map((d) => `${d.device}|${d.title || ""}`).join("\n")
      : "hintereingang_halle|Hintereingang\nnebeneingang|";

    this.innerHTML = `
      <style>
        .editor { display: flex; flex-direction: column; gap: 12px; padding: 4px 0; }
        .field label {
          display: block;
          font-size: .8rem;
          font-weight: 500;
          color: var(--secondary-text-color);
          margin-bottom: 4px;
        }
        .field input, .field textarea {
          width: 100%;
          box-sizing: border-box;
          padding: 8px 10px;
          border: 1px solid var(--divider-color);
          border-radius: 6px;
          background: var(--card-background-color);
          color: var(--primary-text-color);
          font-size: .85rem;
        }
        .field textarea { min-height: 100px; font-family: inherit; resize: vertical; }
        .hint { font-size: .72rem; color: var(--secondary-text-color); margin-top: 4px; }
      </style>
      <div class="editor">
        <div class="field">
          <label>Kartentitel (optional)</label>
          <input id="title" type="text" value="${this._config.title || ""}"
            placeholder="z. B. Gebäude 441 — Zugang">
        </div>
        <div class="field">
          <label>Geräte (eine Zeile pro Terminal)</label>
          <textarea id="devices" placeholder="prefix|Anzeigename">${lines}</textarea>
          <div class="hint">Format: <code>entity_prefix|Titel</code> — Titel optional. Beispiel: <code>hintereingang_halle|Halle</code></div>
        </div>
      </div>
    `;

    const titleEl = this.querySelector("#title");
    if (titleEl) {
      titleEl.addEventListener("input", (e) => {
        this._config = { ...this._config, title: e.target.value };
        this._fire(this._parseDevicesFromUi());
      });
    }
    const devEl = this.querySelector("#devices");
    if (devEl) {
      devEl.addEventListener("input", () => this._fire(this._parseDevicesFromUi()));
    }
  }

  _parseDevicesFromUi() {
    const title = this.querySelector("#title")?.value ?? "";
    const raw = this.querySelector("#devices")?.value ?? "";
    const devices = raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const pipe = line.indexOf("|");
        if (pipe === -1) return { device: line.trim(), title: "" };
        return {
          device: line.slice(0, pipe).trim(),
          title: line.slice(pipe + 1).trim(),
        };
      })
      .filter((d) => d.device);
    return { ...this._config, title, devices };
  }
}

if (!customElements.get("hikvision-access-overview-card-editor")) {
  customElements.define(
    "hikvision-access-overview-card-editor",
    HikvisionAccessOverviewCardEditor
  );
}

window.customCards = window.customCards || [];
(function registerOverviewPicker() {
  const t = "hikvision-access-overview-card";
  if (window.customCards.some((c) => c.type === t)) return;
  window.customCards.push({
    type: t,
    name: "Hikvision Access Übersicht",
    description: "Mehrere Face-Terminals kompakt (pro Gebäude/Tab)",
    preview: true,
  });
})();
