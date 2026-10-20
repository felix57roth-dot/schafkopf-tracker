Schafkopftracker – Version 4.2 (Wastl-Monte-Carlo, reparierte Bedienung)

NEU UND REPARIERT
- Der Würfel öffnet die Auswahl der Simulationen sofort sichtbar ÜBER der Vollbildanalyse.
- Der Simulationsdialog merkt sich beim Öffnen das gerade ausgewählte Spiel und den Stich.
  Beim Klick auf „Simulation starten“ kann dadurch nicht versehentlich eine andere
  oder bereits geschlossene Partie ausgewertet werden.
- Neues, eigenständig entwickeltes Offline-Mitspieler-Modell: Ausspielen, Übernehmen,
  Schmieren, Abwerfen, Partnerrollen, Trumpfreserven und Augen werden berücksichtigt.
- Die Werte bleiben EXPERIMENTELLE MODELLERGEBNISSE, keine objektiven Gewinnquoten.
- Der bestehende Wastl-Spielbericht und die gespeicherten Daten bleiben unangetastet.

INSTALLATION DES KLEINEN UPDATES
1. Unter Einstellungen → Datensicherung die Daten exportieren.
2. ZIP entpacken und alle enthaltenen Dateien direkt ins Hauptverzeichnis
   deines GitHub-Repositories laden; vorhandene Dateien ersetzen.
3. Keine Kartenbilder löschen: Der vorhandene Ordner cards bleibt bestehen.
4. Änderungen committen. Nach der GitHub-Pages-Veröffentlichung die App
   bei bestehender Internetverbindung öffnen und das PWA-Update übernehmen.
5. Wastl → gespeicherte Partie → 🎲 → 80, 160 oder 350 Verteilungen →
   „Simulation starten“.

SICHERHEIT DER ANALYSE
- Modell der Mitspieler ist heuristisch und nicht kalibriert.
- Tatsächlich gespielte Karten späterer Stiche werden bei der Verteilung
  unbekannter Gegnerkarten nicht als Wissen verwendet.
- Für unvollständige oder regelwidrige Partien liefert die Engine eine
  Fehlermeldung statt einer erfundenen Spielbewertung.
- Keine kostenpflichtige API, kein Datenversand und keine fremden KI-Codebasen.

TESTS
  node --test tests/*.test.js

26 automatische Tests bestanden, einschließlich zweier Regressionstests für
Sichtbarkeit des Würfel-Dialogs und Bindung an die angeklickte Partie.
Ein echter Smartphone-Browsertest auf dem Nutzergerät ist weiterhin nötig.
