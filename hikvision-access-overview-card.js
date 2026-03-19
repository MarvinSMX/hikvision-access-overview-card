/**
 * Hikvision Access Overview Card — eine Zelle (nur Vorschau).
 * Mehrere Instanzen im Lovelace-Grid (type: grid). ha-card ohne BG/Rand.
 */

class HikvisionAccessOverviewCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  /** Abwärtskompatibel: altes devices-Array → erstes Gerät */
  static _resolveDevice(config) {
    const d = config.device?.trim();
    if (d) return { device: d, title: (config.title || "").trim() };
    const list = config.devices;
    if (!Array.isArray(list) || !list.length) return null;
    const first = list[0];
    if (typeof first === "string")
      return { device: first.trim(), title: (config.title || "").trim() };
    return {
      device: (first.device || "").trim(),
      title: (config.title || first.title || "").trim(),
    };
  }

  setConfig(config) {
    const resolved = HikvisionAccessOverviewCard._resolveDevice(config);
    if (!resolved?.device) {
      throw new Error(
        "Pflichtfeld 'device' fehlt — Beispiel: device: hintereingang_halle"
      );
    }
    this._config = { ...config, ...resolved };
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
    const p = this._config.device;
    if (this._config.show_camera === false) {
      return `nocam\x00${p}\x00${this._config.title || ""}`;
    }
    const camId = `camera.${p}_letzter_snapshot`;
    const cam = this._hass?.states?.[camId];
    const pic = cam
      ? `cam:${cam.last_changed}|${cam.attributes?.entity_picture ?? ""}`
      : "cam:none";
    return `${pic}\x00${this._config.title || ""}`;
  }

  _s(entityId) {
    return this._hass?.states?.[entityId] ?? null;
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

  _escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  _render() {
    if (!this._config || !this._hass) return;

    const p = this._config.device;
    const label =
      this._config.title ||
      p.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const labelEsc = this._escapeHtml(label);

    // Kamera / Snapshot — gleiche Logik wie hikvision-access-card (Snapshot-Zweig)
    const camEntityId = `camera.${p}_letzter_snapshot`;
    const camExists = camEntityId in (this._hass?.states ?? {});
    const showCamera =
      this._config.show_camera !== false && camExists;
    const camState = showCamera ? this._s(camEntityId) : null;
    const camPictureRaw = camState?.attributes?.entity_picture ?? null;
    const camTs = camState?.last_changed
      ? new Date(camState.last_changed).getTime()
      : Date.now();
    const camPicture = camPictureRaw ? `${camPictureRaw}?t=${camTs}` : null;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card {
          container-type: inline-size;
          padding: 0;
          margin: 0;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          --ha-card-box-shadow: none;
          --ha-card-background: transparent;
        }
        .cell {
          cursor: pointer;
          min-width: 0;
        }
        .cell:hover .cam-wrap { filter: brightness(0.97); }
        .cam-wrap {
          width: 100%;
          aspect-ratio: 16 / 9;
          border-radius: var(--ha-card-border-radius, 10px);
          overflow: hidden;
          background: var(--secondary-background-color, rgba(0,0,0,.06));
        }
        .cam-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .cam-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--secondary-text-color);
          --mdc-icon-size: clamp(22px, 12cqi, 36px);
        }
      </style>
      <ha-card>
        <div class="cell" id="cell" data-cam="${camPicture ? camEntityId : ""}">
          <div class="cam-wrap">
            ${
              camPicture
                ? `<img src="${camPicture}" alt="${labelEsc}">`
                : `<div class="cam-placeholder"><ha-icon icon="mdi:camera-off"></ha-icon></div>`
            }
          </div>
        </div>
      </ha-card>
    `;

    const cell = this.shadowRoot.querySelector("#cell");
    if (cell) {
      cell.addEventListener("click", () => {
        if (camPicture) this._moreInfo(camEntityId);
        else this._moreInfo(`sensor.${p}_geratestatus`);
      });
    }
  }

  getCardSize() {
    return 1;
  }

  static getConfigElement() {
    return document.createElement("hikvision-access-overview-card-editor");
  }

  static getStubConfig() {
    return { device: "hintereingang_halle", title: "" };
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
    const r = HikvisionAccessOverviewCard._resolveDevice(this._config) || {
      device: "",
      title: "",
    };

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
        .field input {
          width: 100%;
          box-sizing: border-box;
          padding: 8px 10px;
          border: 1px solid var(--divider-color);
          border-radius: 6px;
          background: var(--card-background-color);
          color: var(--primary-text-color);
          font-size: .85rem;
        }
        .hint { font-size: .72rem; color: var(--secondary-text-color); margin-top: 4px; }
      </style>
      <div class="editor">
        <div class="field">
          <label>Gerät (Prefix)</label>
          <input id="device" type="text" value="${r.device || ""}"
            placeholder="hintereingang_halle">
        </div>
        <div class="field">
          <label>Bild-Alt-Text (optional)</label>
          <input id="title" type="text" value="${this._config.title || ""}"
            placeholder="Leer = aus Prefix ableiten">
          <div class="hint">Nur für Barrierefreiheit (alt), nicht sichtbar.</div>
        </div>
      </div>
    `;

    const push = () => {
      const device = this.querySelector("#device")?.value?.trim() ?? "";
      const title = this.querySelector("#title")?.value ?? "";
      const c = { ...this._config, device, title };
      delete c.devices;
      delete c.columns;
      this._fire(c);
    };
    this.querySelector("#device")?.addEventListener("input", push);
    this.querySelector("#title")?.addEventListener("input", push);
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
    name: "Hikvision Access Zelle",
    description: "Kamera-Vorschau ohne Rahmen (für Lovelace-Grid)",
    preview: true,
  });
})();
