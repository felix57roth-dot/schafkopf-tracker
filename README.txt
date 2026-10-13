SCHAFKOPFTRACKER – VERSION 1.9
================================

NEU
- Automatische Abend-Bilanz aus allen getrackten Einzelspielen eines Tages.
- Im Reiter „Abende“ erscheint pro Datum eine automatisch berechnete Abendzeile (inklusive Anzahl Spiele).
- Manuell eingetragene Abende bleiben unverändert möglich.
- Falls ein manueller Abend am gleichen Datum existiert, hat dieser Vorrang in der Abendbilanz, damit dieselben Spiele nicht doppelt zählen.
- Beim manuellen Speichern eines Datums mit getrackten Spielen wird darauf hingewiesen und vor dem Speichern gefragt.
- Automatische Abend-Einträge ändern sich sofort, wenn Einzelspiele bearbeitet, gelöscht oder importiert werden.
- Automatische Abend-Einträge lassen sich nicht direkt bearbeiten oder löschen: Einzelspiele im Reiter „Spiele“ bearbeiten.
- Dashboard, Gewinnkurve, Monats-/Jahresbilanz, Rekorde und Jahresziel verwenden die automatische+manuelle Abendbilanz.
- Der App-Name, die Spielarten, Regeln und die lokalen gespeicherten Daten bleiben unverändert.

DATEN UND SICHERHEIT
- Automatische Abend-Einträge werden aus den Einzelspielen live berechnet und NICHT als zusätzliche Kopien im lokalen Speicher abgelegt.
- Dadurch entstehen beim Update, Import, Bearbeiten oder Neustart keine doppelten automatischen Abende.
- Backup weiterhin über Profil > Daten exportieren: sichert Original-Einzelspiele und manuelle Abende; automatische Abende werden daraus nach dem Import neu berechnet.
- LocalStorage-Schlüssel unverändert: schafkopf-tracker-v1.
- Daten weiterhin nur lokal; offline nach Installation nutzbar.

UPDATE
1. VOR DEM UPDATE in der laufenden App: Profil > Daten exportieren.
2. ZIP entpacken; die 5 Dateien aus dem Ordner im Hauptverzeichnis des GitHub-Repositories hochladen und ersetzen.
3. Nach GitHub-Pages-Bereitstellung die App mit Internetverbindung starten und Update übernehmen.
4. Version unter Profil > App-Updates kontrollieren.
