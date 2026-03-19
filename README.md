# Hikvision Access Overview Card

Eine **Zelle**: nur der **Bild-Container** (Snapshot), ohne `ha-card`-Wrapper und ohne sichtbaren Text. Mehrere Instanzen im **Lovelace-Grid** (`type: grid`).

Integration: [hikvision-ha](https://github.com/MarvinSMX/hikvision-ha) · Einzelkarte: [hikvision-access-card](https://github.com/MarvinSMX/hikvision-access-card)

## HACS

Frontend-Repo hinzufügen → installieren → HA neu laden → Browser Strg+Shift+R.

## Konfiguration (pro Zelle)

```yaml
type: custom:hikvision-access-overview-card
device: hintereingang_halle
title: Hintereingang   # optional — nur img alt-Text, nicht sichtbar
```

Es gibt **keinen Card-Rahmen** — nur die Vorschau mit abgerundeten Ecken (klickbar → More-Info Kamera).

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
