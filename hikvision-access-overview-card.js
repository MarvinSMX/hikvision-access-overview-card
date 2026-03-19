/**
 * Hikvision Access Overview Card
 * CCTV-artiges Snapshot-Grid mehrerer Face-Terminals.
 *
 * HACS: /hacsfiles/.../hikvision-access-overview-card.js
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

  _columns() {
    const c = Number(this._config?.columns);
    if (c >= 1 && c <= 4) return c;
    return 2;
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
      const camId = `camera.${p}_letzter_snapshot`;
      const cam = this._hass?.states?.[camId];
      parts.push(
        cam
          ? `cam:${cam.last_changed}|${cam.attributes?.entity_picture ?? ""}`
          : "cam:none"
      );
      const ids = [
        `binary_sensor.${p}_tur`,
        `binary_sensor.${p}_bewegungsmelder`,
        `sensor.${p}_letzte_person`,
        `sensor.${p}_letztes_event`,
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

  _escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  _fmtShort(isoString) {
    if (!isoString || ["unavailable", "unknown", "—"].includes(isoString)) return "";
    try {
      return new Date(isoString).toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }

  _render() {
    if (!this._config || !this._hass) return;

    const cardTitle =
      this._config.title || "Überwachung — Zugang";
    const cols = this._columns();

    const tiles = this._config.devices
      .map(({ device: p, title: rowTitle }) => {
        const label =
          rowTitle ||
          p.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        const camId = `camera.${p}_letzter_snapshot`;
        const camState = this._s(camId);
        const camRaw = camState?.attributes?.entity_picture ?? null;
        const camTs = camState?.last_changed
          ? new Date(camState.last_changed).getTime()
          : Date.now();
        const imgSrc = camRaw ? `${camRaw}?t=${camTs}` : null;

        const doorState = this._val(`binary_sensor.${p}_tur`);
        const motionState = this._val(`binary_sensor.${p}_bewegungsmelder`);
        const personState = this._val(`sensor.${p}_letzte_person`);
        const eventState = this._val(`sensor.${p}_letztes_event`);
        const evTime = this._val(`sensor.${p}_zeit_des_letzten_events`);
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

        const doorIcon = doorOpen ? "mdi:door-open" : "mdi:door-closed";
        const accessDot =
          granted ? "ok" : denied ? "deny" : "neutral";

        const timeStr = this._fmtShort(evTime);
        const accessLabel = granted ? "OK" : denied ? "Nein" : "—";
        const subLine = [personState !== "—" ? personState : "", eventState !== "—" ? eventState : ""]
          .filter(Boolean)
          .join(" · ");
        const subEsc = this._escapeHtml(subLine);
        const labelEsc = this._escapeHtml(label);

        return {
          p,
          label,
          labelEsc,
          imgSrc,
          connected,
          motionActive,
          locked,
          lockEntityId,
          doorIcon,
          doorOpen,
          accessDot,
          accessLabel,
          timeStr,
          subEsc,
          camId,
        };
      })
      .map(
        (t) => `
      <div class="tile" data-prefix="${t.p}" data-cam="${t.imgSrc ? t.camId : ""}">
        <div class="tile-feed">
          ${
            t.imgSrc
              ? `<img src="${t.imgSrc}" alt="${t.labelEsc}" loading="lazy">`
              : `<div class="tile-no-signal">
                   <ha-icon icon="mdi:cctv-off"></ha-icon>
                   <span>Kein Bild</span>
                 </div>`
          }
          <div class="tile-scanline" aria-hidden="true"></div>
        </div>
        <div class="tile-top">
          <span class="rec" title="${t.connected ? "Verbunden" : "Getrennt"}">
            <span class="rec-dot ${t.connected ? "on" : "off"}"></span>
            ${t.connected ? "LIVE" : "OFF"}
          </span>
          <button class="tile-lock" data-lock="${t.p}" title="${t.locked ? "Entsperren" : "Sperren"}">
            <ha-icon icon="${t.locked ? "mdi:lock" : "mdi:lock-open-variant"}"></ha-icon>
          </button>
        </div>
        ${
          t.motionActive
            ? '<div class="tile-motion-badge" title="Aktivität"><ha-icon icon="mdi:motion-sensor"></ha-icon></div>'
            : ""
        }
        <div class="tile-overlay">
          <div class="tile-title-row">
            <span class="tile-name">${t.labelEsc}</span>
            <ha-icon icon="${t.doorIcon}" class="tile-door-ic ${t.doorOpen ? "door-open" : ""}"></ha-icon>
          </div>
          <div class="tile-meta">
            <span class="access-pill access-${t.accessDot}">${t.accessLabel}</span>
            ${t.timeStr ? `<span class="tile-time">${t.timeStr}</span>` : ""}
          </div>
          ${
            t.subEsc
              ? `<div class="tile-sub" title="${t.subEsc}">${t.subEsc}</div>`
              : ""
          }
        </div>
      </div>`
      )
      .join("");

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card {
          padding: 12px 12px 10px;
        }
        .card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          gap: 10px;
        }
        .card-title {
          font-size: var(--mushroom-card-primary-font-size, 14px);
          font-weight: 600;
          color: var(--primary-text-color);
        }
        .card-badge {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: .06em;
          color: var(--secondary-text-color);
          opacity: .85;
        }
        .cctv-grid {
          display: grid;
          grid-template-columns: repeat(var(--cctv-cols, 2), minmax(0, 1fr));
          gap: 10px;
        }
        @media (max-width: 500px) {
          .cctv-grid { grid-template-columns: 1fr; }
        }
        .tile {
          position: relative;
          border-radius: 10px;
          overflow: hidden;
          background: #0d0d0d;
          border: 1px solid rgba(255,255,255,.1);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,.35);
        }
        .tile-feed {
          position: relative;
          aspect-ratio: 16 / 9;
          background: #1a1a1a;
        }
        .tile-feed img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          vertical-align: top;
        }
        .tile-no-signal {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          color: rgba(255,255,255,.35);
          font-size: 11px;
        }
        .tile-no-signal ha-icon { --mdc-icon-size: 40px; }
        .tile-scanline {
          pointer-events: none;
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,.04) 2px,
            rgba(0,0,0,.04) 4px
          );
          opacity: .5;
        }
        .tile-top {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          padding: 6px 6px 0 8px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          pointer-events: none;
        }
        .tile-top .tile-lock { pointer-events: auto; }
        .rec {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .12em;
          color: #fff;
          text-shadow: 0 1px 3px rgba(0,0,0,.9);
          background: rgba(0,0,0,.5);
          padding: 3px 7px;
          border-radius: 4px;
        }
        .rec-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #666;
        }
        .rec-dot.on {
          background: #f44;
          box-shadow: 0 0 6px #f44;
          animation: recblink 1.4s ease-in-out infinite;
        }
        @keyframes recblink {
          0%, 100% { opacity: 1; }
          50% { opacity: .45; }
        }
        .tile-lock {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          background: rgba(0,0,0,.55);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          backdrop-filter: blur(4px);
        }
        .tile-lock:hover { background: rgba(0,0,0,.75); }
        .tile-lock ha-icon { --mdc-icon-size: 18px; }
        .tile-motion-badge {
          position: absolute;
          top: 36px;
          right: 6px;
          background: rgba(255,152,0,.9);
          color: #000;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          animation: motionpulse 1.2s ease-in-out infinite;
        }
        .tile-motion-badge ha-icon { --mdc-icon-size: 16px; }
        @keyframes motionpulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: .85; }
        }
        .tile-overlay {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          padding: 28px 10px 8px;
          background: linear-gradient(to top, rgba(0,0,0,.92) 0%, rgba(0,0,0,.5) 55%, transparent 100%);
          pointer-events: none;
        }
        .tile-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .tile-name {
          font-size: 13px;
          font-weight: 700;
          color: #fff;
          text-shadow: 0 1px 4px rgba(0,0,0,.8);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tile-door-ic {
          --mdc-icon-size: 18px;
          color: rgba(255,255,255,.75);
          flex-shrink: 0;
        }
        .tile-door-ic.door-open { color: var(--warning-color,#FF9800); }
        .tile-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
        }
        .access-pill {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 4px;
          letter-spacing: .04em;
        }
        .access-ok { background: rgba(76,175,80,.35); color: #a5d6a7; }
        .access-deny { background: rgba(244,67,54,.35); color: #ffcdd2; }
        .access-neutral { background: rgba(255,255,255,.12); color: rgba(255,255,255,.6); }
        .tile-time {
          font-size: 10px;
          color: rgba(255,255,255,.55);
          font-variant-numeric: tabular-nums;
        }
        .tile-sub {
          font-size: 10px;
          color: rgba(255,255,255,.65);
          margin-top: 3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      </style>
      <ha-card>
        <div class="card-head">
          <span class="card-title">${cardTitle}</span>
          <span class="card-badge">CCTV · ${this._config.devices.length}</span>
        </div>
        <div class="cctv-grid" style="--cctv-cols:${cols}">
          ${tiles}
        </div>
      </ha-card>
    `;

    this.shadowRoot.querySelectorAll(".tile").forEach((tile) => {
      const p = tile.dataset.prefix;
      if (!p) return;

      tile.addEventListener("click", (e) => {
        if (e.target.closest(".tile-lock")) return;
        const camId = tile.dataset.cam;
        if (camId) this._moreInfo(camId);
        else this._moreInfo(`sensor.${p}_geratestatus`);
      });

      tile.addEventListener("dblclick", (e) => {
        if (e.target.closest(".tile-lock")) return;
        const ids = [
          `sensor.${p}_letztes_event`,
          `sensor.${p}_letzte_person`,
          `binary_sensor.${p}_tur`,
          `sensor.${p}_zugang`,
        ].join(",");
        this._navigate(`/history?entity_id=${ids}`);
      });
    });

    this.shadowRoot.querySelectorAll(".tile-lock").forEach((btn) => {
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
  }

  getCardSize() {
    const rows = Math.ceil(this._config.devices.length / this._columns());
    return Math.min(2 + rows * 2, 12);
  }

  static getConfigElement() {
    return document.createElement("hikvision-access-overview-card-editor");
  }

  static getStubConfig() {
    return {
      title: "Überwachung — Zugang",
      columns: 2,
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
    const cols = this._config.columns ?? 2;

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
        .field input, .field textarea, .field select {
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
            placeholder="z. B. Gebäude 441 — Überwachung">
        </div>
        <div class="field">
          <label>Spalten (CCTV-Raster)</label>
          <select id="columns">
            <option value="1" ${cols === 1 ? "selected" : ""}>1</option>
            <option value="2" ${cols === 2 ? "selected" : ""}>2</option>
            <option value="3" ${cols === 3 ? "selected" : ""}>3</option>
            <option value="4" ${cols === 4 ? "selected" : ""}>4</option>
          </select>
          <div class="hint">Auf schmalen Displays wird automatisch 1 Spalte genutzt.</div>
        </div>
        <div class="field">
          <label>Geräte (eine Zeile pro Terminal)</label>
          <textarea id="devices" placeholder="prefix|Anzeigename">${lines}</textarea>
          <div class="hint">Snapshots von <code>camera.*_letzter_snapshot</code>. Ohne Kamera: Platzhalter „Kein Bild“.</div>
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
    const colEl = this.querySelector("#columns");
    if (colEl) {
      colEl.addEventListener("change", (e) => {
        this._config = {
          ...this._config,
          columns: Number(e.target.value) || 2,
        };
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
    const columns = Number(this.querySelector("#columns")?.value) || 2;
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
    return { ...this._config, title, columns, devices };
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
    description: "CCTV-Raster mit Snapshot-Vorschau mehrerer Terminals",
    preview: true,
  });
})();
