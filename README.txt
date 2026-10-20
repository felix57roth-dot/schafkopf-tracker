Schafkopftracker Version 4.1 – Monte-Carlo-Versuch (offline)

Neu:
- Optionales Würfel-Symbol in Wastls Vollbild-Tischansicht eines gespeicherten Spiels.
- Lokale Simulation legaler Karten bei Rufspiel, Farbsolo, Wenz, Farb-Wenz, Geier und Farb-Geier.
- Stichregeln geprüft, eigene Hand rekonstruiert, öffentliche Karten und Abwürfe berücksichtigt.
- 80 / 160 / 350 mögliche Verteilungen, Berechnung in einem Web Worker.
- Vergleich als Modell-Durchschnitt (Teamaugen) und Simulationserfolgsanteil.
- Keine echte, kalibrierte Gewinnwahrscheinlichkeit oder objektive Spielnote.
- Die bisherige Wastl-Analyse, ihr 1-10 Ergebnis und gespeicherte Daten bleiben unverändert.
- Sonderformen (Ramsch, Bettel, Tout, Hochzeit, Kreuzrunde u. a.) noch nicht als
  strategische Monte-Carlo-Analyse verfügbar.

GitHub Installation:
1. Daten aus der alten App exportieren und sichern.
2. Klein-Update entpacken und ALLE enthaltenen Dateien ins Repository-Hauptverzeichnis laden.
   Neue Dateien: wastl-montecarlo.js, wastl-montecarlo-worker.js,
     wastl-montecarlo-ui.js, wastl-montecarlo-ui.css.
   Aktualisieren: index.html, sw.js, wastl-engine.js.
3. GitHub Commit speichern. Die 32 Karten müssen nicht neu hochgeladen werden.
4. Nach Deployment online App aufrufen / auf Aktualisierung warten;
   Offline wird erst nach erfolgreichem Vorladen aller neuen Dateien funktionieren.
5. Unter Wastl gespeicherte Partie öffnen und 🎲 oben rechts betätigen.

Wichtige technische Einschränkungen:
- Simulierende Mitspieler handeln nach einer einfachen Heuristik, nicht wie geübte Profis.
- Zufällige Verteilungen erfüllen erkannte Bedienpflicht-Ausschlüsse, sind aber nicht
  statistisch gleichverteilt und berücksichtigen nicht alle Ansage-Signale.
- Ergebnisse sind Schätzungen des Modells, keine objektiven Bewertungen.
- Keine Abhängigkeiten, Cloudkosten oder übernommenen Fremdcodelizenzen.

Tests: node --test tests/*.test.js
