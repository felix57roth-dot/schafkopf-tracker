# Spielfiguren

In diesem Ordner werden die drei vom Projekt bereitgestellten PNG-Illustrationen gespeichert:

- `resi_sitzend.png`
- `sepp_sitzend.png`
- `xaver_sitzend.png`

Die Datei `wastl-bots.css` bindet sie in den Schafkopftisch ein.

## Räumlicher Stammtisch (Version 6.2)

Optionales Szenenbild `stammtisch-szene.webp` (transparenter WebP-Hintergrund, drei Spieler und perspektivischer Holztisch). Lade es direkt in den Ordner `players/` hoch. Ohne das Bild bleibt eine rein aus CSS aufgebaute 3D-Holztischansicht mit den drei einzelnen Figuren sichtbar.

Wichtig: Das Hintergrundbild stellt von links nach rechts Resi, Sepp und Xaver dar. Diese feste visuelle Anordnung ist im Botmodell 6.2 berücksichtigt; die Spielpositionen (Vorhand, Mittelhand, Hinterhand, Geber) rotieren weiterhin.

## 7.1: Ein gemeinsames Tischbild (Handy-Hochformat)

- `stammtisch-szene.webp` ist die für die PWA vorbereitete gemeinsame Illustration
  (Resi links, Sepp in der Mitte, Xaver rechts, alle an einer durchgehenden Tischplatte).
- Das Bild muss in `players/stammtisch-szene.webp` liegen. Erst wenn der Browser
  die Datei erfolgreich geladen hat, blendet die App die drei Einzelportraits aus.
- Namensschilder, Sprechblasen und die vier dynamischen Stichkarten bleiben darüber
  interaktiv bzw. sichtbar; die Handkarten und Spiellogik sind unverändert.
- Die Darstellung ist für Hochformat optimiert. Bei fehlendem Bild sowie auf
  flachen Querformat-Displays bleibt die bisherige CSS-Tischszene als Fallback.
- Der Service Worker speichert die Szene optional offline, ohne eine Installation
  zu blockieren, wenn sie noch nicht im Repository liegt.
