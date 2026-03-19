# Hikvision Access Overview Card

Eigenständiges **HACS-Frontend-Repository** — Mehrfach-Übersicht mehrerer [Hikvision Face Terminals](https://github.com/MarvinSMX/hikvision-ha) auf einer Karte (z. B. ein Tab pro Gebäude im Dashboard „Sicherheit / Zugriff“).

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
title: Gebäude 442 — Zugang   # optional
devices:
  - device: hintereingang_halle
    title: Hintereingang Halle
  - nebeneingang               # nur Prefix, Titel aus Prefix abgeleitet
```

**Interaktion**

- Klick auf Zeile → More-Info **Gerätestatus**
- Doppelklick auf Zeile → Verlauf (History)
- Schloss → Zugangssperre ein/aus

## Dashboard-Beispiel

Siehe [`examples/lovelace-sicherheit-zugriff.yaml`](examples/lovelace-sicherheit-zugriff.yaml).

## Voraussetzungen

- [Hikvision Access Control Integration](https://github.com/MarvinSMX/hikvision-ha)
- Home Assistant 2023.1+
