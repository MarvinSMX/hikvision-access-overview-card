# Hikvision Access Overview Card

Eigenständiges **HACS-Frontend-Repository** — **CCTV-artiges Raster** mit **Snapshot-Vorschau** pro Terminal ([Hikvision Face Terminals](https://github.com/MarvinSMX/hikvision-ha)), z. B. ein Tab pro Gebäude im Dashboard „Sicherheit / Zugriff“.

Die **Einzelkarte** pro Terminal liegt in einem **separaten Repo**:  
[hikvision-access-card](https://github.com/MarvinSMX/hikvision-access-card) (`custom:hikvision-access-card`).

## Installation via HACS

1. HACS → **Frontend** → **Eigene Repositories**
2. Diese Repo-URL eintragen · Kategorie: **Lovelace**
3. **Installieren** → **HA neu laden**

HACS legt automatisch eine Lovelace-Ressource an, z. B.:

`/hacsfiles/hikvision-access-overview-card/hikvision-access-overview-card.js`  
(Typ: **JavaScript-Modul**)

Danach Browser **hart neu laden** (Strg+Shift+R).

## Manuelle Installation

`hikvision-access-overview-card.js` nach `/config/www/` kopieren und als Ressource eintragen:

- URL: `/local/hikvision-access-overview-card.js`
- Typ: **JavaScript-Modul**

## Konfiguration

```yaml
type: custom:hikvision-access-overview-card
title: Gebäude 442 — Überwachung   # optional
columns: 2                        # optional, 1–4 (auf schmalen Screens automatisch 1)
devices:
  - device: hintereingang_halle
    title: Hintereingang Halle
  - nebeneingang
```

Die Vorschau nutzt `camera.{prefix}_letzter_snapshot` (`entity_picture`). Ohne Kamera-Entity erscheint ein Platzhalter **Kein Bild**.

**Darstellung**

- Raster 16:9, dezentes Scanline-Overlay, **LIVE**-Badge (rot = verbunden)
- Unten: Name, Tür-Icon, Zugang (OK/Nein), Uhrzeit letztes Event, Kurzinfo Person/Event

**Interaktion**

- **Klick** auf Kachel → More-Info **Kamera** (falls vorhanden), sonst **Gerätestatus**
- **Doppelklick** → Verlauf (History)
- **Schloss** (oben rechts) → Zugangssperre ein/aus

## Dashboard-Beispiel

Siehe [`examples/lovelace-sicherheit-zugriff.yaml`](examples/lovelace-sicherheit-zugriff.yaml).

## Voraussetzungen

- [Hikvision Access Control Integration](https://github.com/MarvinSMX/hikvision-ha)
- Home Assistant 2023.1+
