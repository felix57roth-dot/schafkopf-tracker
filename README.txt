Schafkopftracker v3.9 – Einfache Importkontrolle, Trainingspartien verwalten, Wastl-Strategie

NEU:
- Importierte Stiche sind einzeln aufklappbar, statt 32 Karten auf einmal anzuzeigen.
- Archivierte Trainingspartien bearbeiten und löschen, ohne Finanzdaten zu ändern.
- Bearbeiten: Spielart/Trumpffarbe/Ansager/Sitzposition/Namen und Karten jedes Stichs korrigieren.
- Archiv-Solo bleibt nach Änderung gespeichert, die neue Spielart wird geprüft.
- Wastl behandelt Trumpf-Augensicherung differenzierter und bewertet niedrigere Trümpfe nicht automatisch als bessere Alternative.

WICHTIG: Die Palast-Bilderkennung bleibt fehlbar. Auch scheinbar sichere Vorschläge vor dem Speichern mit dem Bild vergleichen.

UPDATE AUF GITHUB:
1. Backup der Daten aus der App exportieren.
2. Hochladen/ersetzen: index.html, sw.js.
3. Neu hinzufügen: training-manager.js, training-manager.css.
4. Bestehende palast-import.js, palast-import.css, palast-signatures.js, 32 Karten, Manifest und Icons unverändert belassen.
5. GitHub Pages aktualisieren lassen, App mit Internet einmal neu öffnen.

Die gespeicherten Spielabende bleiben in localStorage erhalten. Gelöschte Trainingsverläufe lassen sich nur aus einem vorherigen Backup wiederherstellen.
