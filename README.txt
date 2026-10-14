SCHAFKOPFTRACKER – VERSION 2.5
=============================

NEU
- Einmalige, feste Sitzordnung für vier Personen (Tischgrafik: oben, rechts, unten, links im Uhrzeigersinn).
- Einen ersten Geber bestimmen. Vorhand, Mittelhand und Hinterhand werden daraus automatisch abgeleitet.
- Nach jeder vollständig erfassten und archivierten Partie rückt der Geber im Uhrzeigersinn zum nächsten Platz.
- "Geber weiter" erlaubt eine manuelle Anpassung, etwa falls eine Partie nicht getrackt wurde.
- Spielernamen werden mit jeder Trainingspartie gespeichert; alte Archive bleiben beim Wechsel der Sitzordnung unverändert.
- Beim Rufspiel wird der Ansagerpartner automatisch anhand des ausgespielten Ruf-Asses erkannt.
- Vor dem Ruf-Ass zeigt die App Augen pro Spielerposition und weist danach auch frühere Stiche dem Team zu.
- Eigene Trainingsstatistik im Reiter Statistik: Gewinnquote, Augenentwicklung und Spielartenverteilung als Grafiken.
- Bestehende Einzelspiele, Abende, Gewinnstatistiken und Offline-Kartenzähler bleiben unverändert.

DATEN UND DATENSICHERUNG
- Die Sitzordnung liegt nur lokal unter dem Schlüssel schafkopf-tisch-v1.
- Das normale Backup enthält jetzt auch die Sitzordnung und Trainingspartien.
- Beim Import "Alle Daten ersetzen" wird eine im Backup vorhandene Tischkonfiguration wiederhergestellt.
- Alte Backups ohne Tischkonfiguration bleiben kompatibel.
- Läuft bereits eine Partie, gilt eine geänderte Sitzordnung erst für die nächste Partie.

UPDATE ÜBER GITHUB
1. Zuerst Profil > Daten exportieren.
2. Die sechs Dateien (index.html, icon.png, icon.svg, manifest.webmanifest, sw.js, README.txt)
   aus dem ZIP-Ordner direkt ins Root des vorhandenen GitHub-Repositories hochladen.
3. Auf die GitHub-Pages-Veröffentlichung warten und die installierte App online öffnen.
4. Update-Hinweis bestätigen bzw. App komplett schließen und neu öffnen.

WICHTIG
- Der Geber rotiert nach archivierten Partien; bei übersprungenen Spielen bitte "Geber weiter" wählen.
- Pro Stich werden die vier Karten in der Reihenfolge ihrer Ausspielposition eingegeben.
- Training sollte mit Einverständnis der Mitspieler erfolgen; die Stichübersicht ist kein unerlaubtes Hilfsmittel für reguläre Wettbewerbe.
