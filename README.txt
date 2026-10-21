Schafkopftracker – Version 4.4
Wastl Engine: reproduzierbares Offline-Prueflabor und Bewertungsschutz

WAS IST NEU?
- Der Wuerfel-Dialog fuer die GESAMTE PARTIE bleibt wie in 4.3 bestehen.
- Darunter befindet sich optional der einklappbare Bereich
  "Engine-Prueflabor".
- Er erzeugt 24 oder 48 eigenstaendig generierte, regelgepruefte
  Vergleichssituationen aus Solo, Wenz, Rufspiel und Geier.
- Wastl muss daraus Empfehlungen machen, ohne die Haende der
  gegnerischen Spieler zu kennen. Eine GETRENNTE Testauswertung
  spielt Alternativen mit den zurueckgehaltenen Referenzhaenden durch.
- Der Nutzer sieht einen Durchschnittsvorteil gegen zufaellig legale
  Spielzuege, einen Schwankungsbereich und getrennte Ergebnisse nach
  Spielart. Negative und statistisch unklare Ergebnisse werden NICHT
  versteckt.
- Die vorlaeufige 1-10-MODELLNOTE wird nur noch gezeigt, wenn fuer
  die betreffende Spielart ausreichend viele positive Testergebnisse
  vorliegen. Sonst zeigt Wastl einen Grund fuer die Zurueckhaltung.
- Die Stich-fuer-Stich-Erklaerungen und die Simulationen funktionieren
  auch OHNE Testlauf weiter. Kein Account, keine Internet-API.

WICHTIGE WISSENSCHAFTLICHE EINSCHRAENKUNGEN
- Das ist KEINE Kalibrierung gegen menschliche Schafkopfexperten.
- Referenzspiele werden aus demselben Heuristik-Umfeld erzeugt.
  Die Auswertung erhaelt zwar die vollstaendigen, dem Simulator
  verborgenen Referenzhaende, ist aber keine unabhaengige Experteninstanz.
- Mit nur 24 bzw. 48 Szenarien koennen viele Unterschiede durch Zufall
  entstehen; das +/- entspricht einem ungefaehren 95%-Intervall
  allein fuer die Schwankung zwischen Testfaellen. Modellfehler sind
  darin nicht enthalten.
- Der zufaellig legale Zug ist eine schwache Referenz, kein Profi.
- Es gibt noch KEINE robuste Umrechnung des Modellindexes in eine
  menschliche Spielstaerkeskala. Gerade deshalb keine erfundene Note.
- Die Prueffragen betreffen derzeit Solo, Wenz, Rufspiel und Geier,
  nicht alle Schafkopf-Sonder- und Farbvarianten.

REPRODUZIERBARER REFERENZLAUF – Version 4.4
- Zufallsseed 0x441022, 48 Testsituationen, 100 simulierte
  Kartenverteilungen und 24 getrennte Fortsetzungen je Testalternative.
- Gesamt: +1,7 Prozentpunkte (+/- 2,5) gegen zufaellig legal.
- Solo:    +2,1 Prozentpunkte (+/- 3,1), 12 Situationen.
- Wenz:    +2,8 Prozentpunkte (+/- 7,5), 12 Situationen.
- Rufspiel:+0,2 Prozentpunkte (+/- 5,3), 12 Situationen.
- Geier:   +1,7 Prozentpunkte (+/- 2,5), 12 Situationen.
- Daraus ist fuer KEINE der vier Spielarten ein Vorteil auf Basis
  der definierten Pruefgrenzen hinreichend nachgewiesen.
- Ergebnis: 1-10-Noten werden in diesem Referenzlauf nicht freigegeben.
- Die Spielstrategie selbst wurde in 4.4 noch nicht wesentlich
  verbessert; 4.4 macht ihre Qualitaet mess- und vergleichbar.

INSTALLATION (KLEINES UPDATE)
1. Einstellungen -> Datensicherung -> Daten exportieren.
2. Die 7 Dateien des kleinen Update-ZIP ins GitHub-Hauptverzeichnis
   hochladen und gleichnamige Dateien ersetzen.
3. Den Ordner cards NICHT hochladen und NICHT loeschen.
4. Commit abwarten, PWA online einmal neu laden, dann offline nutzbar.
5. Wastl -> gespeicherte Partie -> Wuerfel -> "Engine-Prueflabor"
   aufklappen -> Pruefumfang -> "Modell pruefen".
6. Fuer Stichanalysen weiter "Gesamte Partie simulieren" verwenden.

TECHNIK
- Neu: wastl-benchmark.js und wastl-benchmark-worker.js.
- Angepasst: wastl-match-analysis.js, wastl-montecarlo-ui.js,
  wastl-montecarlo-ui.css, sw.js.
- Neue lokale Speicherung fuer den optionalen Testbericht:
  wastl-benchmark-v44 (nur anonymisierte aggregierte Kennzahlen).
- Alle vorhandenen Spiele, Tracker-Daten, Bilder und Simulationscaches
  werden NICHT angetastet.
- Kein fremder lizenzierter KI-Code und keine laufenden Kosten.

PRUEFUNG
- 37 automatisierte Tests einschliesslich echtem Worker-
  Nachrichtenaustausch und reproduzierbarer Referenzspiele.
- Dialog auf 320, 390, 430 px getestet; Benchmark-Abschlussdialog
  mit simuliertem Worker-Ergebnis im Browser getestet.
- Ein End-to-End-Test der Browser-Worker in der installierten
  Android-PWA steht weiterhin aus.
- Node: node --test tests/*.test.js (Tests nur im Quellordner)

Version 4.6: Zusaetzlicher lokaler A/B-Test der Monte-Carlo-Empfehlung gegen die vorherige Heuristik. Die Testhaende sind der Empfehlung unbekannt. Nur interne Modellguete, keine validierte 1-10-Spielstaerke.

Referenzbilder fuer die Palast-Bilderkennung: Bitte fuer jede der 32 ORIGINAL-Palastkarten die obere Ecke mit Wert und Farbzeichen gut lesbar aufnehmen. Zwei getrennte Referenzsaetze fuer Hand- und Stichansicht waeren noch besser. Ein Referenzbilder-Datensatz wurde in 4.6 NICHT behauptet oder beigelegt: ohne verifizierte Vorlagen darf die Erkennung keine 100%-Sicherheit vortaeuschen.
