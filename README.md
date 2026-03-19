# Hikvision Access Overview Card

Eine **Zelle**: Snapshot + Name. Mehrere Karten im **Lovelace-Grid** (`type: grid`) anordnen.

Integration: [hikvision-ha](https://github.com/MarvinSMX/hikvision-ha) · Einzelkarte: [hikvision-access-card](https://github.com/MarvinSMX/hikvision-access-card)

## HACS

Frontend-Repo hinzufügen → installieren → HA neu laden → Browser Strg+Shift+R.

## Konfiguration (pro Zelle)

```yaml
type: custom:hikvision-access-overview-card
device: hintereingang_halle
title: Hintereingang   # optional — nur img alt-Text, nicht sichtbar
```

Die Karte hat **keinen eigenen Hintergrund/Rand** (nur das Bild mit abgerundeten Ecken).

## Grid-Beispiel

```yaml
type: grid
columns: 2
square: false
cards:
  - type: custom:hikvision-access-overview-card
    device: terminal_a
  - type: custom:hikvision-access-overview-card
    device: terminal_b
```

*(Altes `devices:`-Array wird nur noch das erste Element gelesen — bitte auf `device` umstellen.)*

## Voraussetzungen

- [Hikvision Access Control](https://github.com/MarvinSMX/hikvision-ha) · HA 2023.1+
