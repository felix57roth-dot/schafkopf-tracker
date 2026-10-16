SCHAFKOPFTRACKER – VERSION 3.4 (KOMPLETTPAKET)
================================================

Dieses Paket enthält ALLE erforderlichen Dateien für die
installierbare PWA, das neue Kartenset und Wastl.

DATEIEN IM REPOSITORY-HAUPTVERZEICHNIS:
  index.html
  manifest.webmanifest
  sw.js
  icon.png
  icon.svg
  wastl.png
  README.txt
  cards/  (32 einzelne WebP-Spielkarten)

INSTALLATION ÜBER GITHUB:
1. In der bisherigen App unter Einstellungen / Datensicherung
   die Daten als Datei exportieren.
2. ZIP entpacken und den INNEREN Ordner öffnen.
3. Alle 7 Dateien UND den gesamten cards-Ordner direkt ins
   Stammverzeichnis des bestehenden GitHub-Repositories laden.
4. Dateien mit denselben Namen überschreiben und committen.
5. Nach Veröffentlichung mit Internetverbindung die App öffnen
   und das PWA-Update durchführen; ggf. Seite erneut öffnen.

WICHTIG:
- NICHT den übergeordneten Ordner hochladen – index.html muss
  im Stammverzeichnis des Repositories liegen.
- Die gespeicherten Daten werden weiterhin unter dem bestehenden
  lokalen Speicherschlüssel verwaltet. Bitte trotzdem sichern.
- sw.js aktualisiert Offline-Cache inkl. der 32 Bilder und
  ermöglicht die Aktualisierung bereits installierter PWAs.
- Für GitHub Pages müssen die Dateien über HTTPS bereitstehen.

VERSION 3.4:
- vereinheitlichte Kartenbilder im Ordner cards/
- Wastl wieder mit gewünschtem Porträt
- reduzierte Analyseansicht und Holz-Kartentisch
- optionale Erläuterungen hinter aufklappbaren Hinweisen
