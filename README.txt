SCHAFKOPFTRACKER – VERSION 1.5
=============================

NEU
- Darstellungsfehler „Monats- und Jahresbilanz“ behoben: Auf allen Unterseiten
  beginnt der Inhalt jetzt unterhalb des gruenen Kopfbereichs, nicht mehr darin.
- Jahresauswahl passt sich auch bei sehr schmalen Handy-Bildschirmen an.
- Der offizielle PWA-App-Name (manifest name + short_name) lautet
  "Schafkopftracker". HTML-Titel und sichtbarer Schriftzug angepasst.
- Version und Offline-Cache auf v1.5 erhoeht.

UPDATE
1. VORHER Backup in der alten App unter Profil > Daten exportieren erstellen.
2. ZIP entpacken und die FÜNF Dateien aus diesem Ordner
   in dasselbe GitHub-Repository (im Root) hochladen; bestaetigen.
3. Nach GitHub-Pages-Bereitstellung die installierte App ONLINE oeffnen.
   Update-Banner nutzen, ggf. App vollstaendig schliessen und neu oeffnen.
4. Unter Profil > App-Updates sollte nun Version 1.5 stehen.

WICHTIG ZUM APP-NAMEN
- Ein bereits installiertes Android-App-Symbol kann trotz neuem Manifest
  zunaechst weiterhin "Schafkopf" anzeigen. Android/Launcher uebernehmen
  die neue Beschriftung nicht auf jedem Geraet automatisch.
- Eine Neuinstallation kann erforderlich sein, um die neue Beschriftung
  "Schafkopftracker" sichtbar zu machen. Vorher zwingend BACKUP exportieren,
  danach Backup in der neu installierten App importieren.
- Hersteller/Launcher koennen lange Beschriftungen mit ... kuerzen.

DATENSCHUTZ & SPEICHER
- Dieselbe GitHub-Pages-Adresse verwenden; localStorage-Schluessel bleibt
  'schafkopf-tracker-v1' (unveraendert). KEIN automatisches Daten-Loeschen.
- Backup lokal sicher aufbewahren. Vor dem Export NICHT App deinstallieren,
  Browserdaten loeschen oder den Speicher zuruecksetzen!
- Jeder Nutzer speichert Daten lokal; weiterhin keine Online-Datenbank.
- Offline-Nutzung nach erstem Laden ueber HTTPS (z.B. GitHub Pages).
