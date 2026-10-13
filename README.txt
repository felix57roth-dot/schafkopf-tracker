SCHAFKOPF TRACKER – VERSION 1.4
==============================

NEU
- Schafkopfabende bearbeiten; getrennte Auswahl Gewinn/Verlust
- Suchfeld, Datums-, Ergebnis- und Sortierfilter
- Monats- und Jahresbilanz mit grafischen Monatsbalken
- Rekorde, Gewinn- und Verlustserien
- Gewinnkurve mit Euro-Skala, Zeitraumwahl und anklickbaren Punkten; Regler für viele Spielabende
- Optionales persönliches Gewinnziel im laufenden Kalenderjahr
- JSON-Export und Import-Vorschau mit „Nur neue Abende ergänzen“ oder „Alle Daten ersetzen“
- Erinnerung an Sicherungen nach 10 weiteren Abenden bzw. 30 Tagen
- Offline-Service-Worker mit Cache-Version 1.4 und Update-Meldung

INSTALLATION / UPDATE AUF GITHUB PAGES
1. VOR DEM UPDATE: In der App unter „Profil“ → „Daten exportieren“ ein Backup anlegen.
2. Auf GitHub im Repository alle fünf Dateien aus diesem Ordner hochladen und
   die bisherigen Dateien mit denselben Namen ersetzen. „Commit changes“ bestätigen.
3. Nach der Bereitstellung die bestehende Handy-App online öffnen. Falls ein
   Update-Hinweis erscheint, „Aktualisieren“ auswählen. Ggf. App neu öffnen.
4. Unter „Profil“ steht anschließend „Version 1.4“.

WICHTIG
- GLEICHE URL / GLEICHES GITHUB-REPOSITORY VERWENDEN!
- Lokale Daten liegen weiterhin unter localStorage-Schlüssel schafkopf-tracker-v1.
  Die neue Version löscht diesen Speicher nicht.
- Bitte keine App-Daten/Browser-Sitedaten löschen und die App nicht ohne Backup
  neu installieren. Speicherverlust ist trotz sorgfältiger Updates nie ausgeschlossen.
- Die Daten werden NICHT synchronisiert. Jeder Freund speichert eigene Daten.
- Offline-Nutzung setzt einmaliges Laden der Website mit Internet voraus.
- Privatsphäre-Einstellung und Freundesrangliste sind weiterhin eine DEMO.
- Keine externen Fonts, Bibliotheken oder Datenbanken nötig.

Zum Testen lokal index.html öffnen. Vollständiger Offline-Betrieb und Updates
benötigen eine HTTPS-Website wie GitHub Pages (oder localhost zum Entwickeln).
