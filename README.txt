SCHAFKOPF TRACKER – VERSION 1.2
================================

NEU:
- Lange Rundennamen werden auf dem Handy korrekt abgeschnitten.
- Gewinn/Verlust steht unter dem Namen, statt rechts aus dem Bildschirm zu ragen.
- Responsive Ansicht und Schutz vor horizontalem Scrollen.
- Update-Benachrichtigung („Aktualisieren“ / „Später“).
- Profil > App-Updates > „Auf Updates prüfen“.
- Offline-Cache verwendet Netzwerk-zuerst + lokale Sicherung bei fehlendem Internet.
- Alter Cache wird nach Aktivierung der neuen Version entfernt.

WICHTIG ZU DEINEN DATEN:
- Die lokale Datenbank nutzt WEITERHIN den bestehenden Schlüssel
  'schafkopf-tracker-v1' im localStorage des Browsers.
- Kein Zurücksetzen und keine Löschung deiner eingetragenen Spielabende.
- Vor dem Update zur Sicherheit Profil > Daten exportieren verwenden.
- Cache löschen heißt NICHT: Browserdaten/Sitedaten löschen!

UPDATE BEI GITHUB PAGES:
1. Auf GitHub dein Repository schafkopf-tracker öffnen.
2. Im Hauptverzeichnis: Add file > Upload files.
3. index.html, sw.js, manifest.webmanifest, icon.svg, README.txt
   aus DIESEM Ordner auswählen. Keine ZIP und keinen übergeordneten Ordner hochladen.
4. Commit changes anklicken.
5. Warten, bis GitHub Pages den Commit veröffentlicht hat.
6. Die installierte App bei Internetverbindung vollständig schließen und neu öffnen.
   Beim einmaligen Upgrade von 1.1 auf 1.2 kann ein zweites Öffnen nötig sein.
   Ab zukünftigen Versionswechseln erscheint in der App eine Update-Meldung.

OFFLINE-TEST:
- App einmal online öffnen und laden lassen.
- Danach Flugmodus aktivieren, App schließen und neu öffnen.
- Bereits gespeicherte Abende müssen weiterhin verfügbar sein.

HINWEIS:
- Freunden stehen Änderungen nach einer Aktualisierung über die gleiche URL
  ebenfalls zur Verfügung, wenn sie online gehen.
- Veröffentlichung und Hosting über GitHub Pages im Free-Tarif.
