SCHAFKOPFTRACKER 5.0 – Gegen Bots spielen (erste spielbare Offline-Version)

NEU
- Eigenständiger Menüpunkt „Spielen“ und Schnellstart auf der Startseite.
- Du spielst mit acht Originalkarten gegen drei lokale Bots.
- Sitzplatz wählen, neue Karten austeilen, vereinfachte Ansage (Rufspiel,
  Wenz, Farbsolo), alle acht Stiche durchspielen.
- Schafkopfregeln und Bedienpflicht werden vom eigenen Wastl-Regelkern geprüft.
- Jeder Bot erhält für seinen Zug nur seine eigene Hand und die öffentlich
  bekannten Karten. Keine versteckten Hände als Entscheidungshilfe.
- Abgeschlossene Runden werden automatisch als „Bot-Partie“ im Wastl-Archiv
  gespeichert und verändern niemals die Finanzstatistik.
- Anschließend direkt „Mit Wastl analysieren“: 350 Verteilungen pro Stich
  starten ohne zusätzliche Auswahl.
- Aktuelle Spielrunde wird lokal gespeichert und nach dem Öffnen der App fortgesetzt.
- Nach Spielende dieselben Anfangskarten erneut spielen oder neue mischen.

GRENZEN UND HINWEISE
- Die Ansage ist in Version 5.0 als einfaches Bietverfahren mit
  Rangfolge Rufspiel < Wenz < Farbsolo umgesetzt. Noch keine vollständige
  Palast-/Turnier-Reizmechanik oder Hausregel-Auswahl.
- Die drei Bots nutzen die eigene Wastl-Heuristik. Sie haben keine garantierte
  Spielstärke oder optimalen Strategien. Auch die spätere 1–10-Bewertung ist
  ein experimenteller Modellindex, keine validierte Expertennote.
- Spielarchiv, Karten, Bilder und Berechnung bleiben offline. Es werden weder
  externe KI-Dienste noch fremde Schafkopf-Engines benötigt.
- VOR dem Update im Profil unter Datensicherung ein Backup exportieren.
- Das kleine Update in die HAUPTEBENE des GitHub-Repositories laden.
  Den cards-Ordner NICHT erneut hochladen.
- Bestehende Stichdaten/Tracker-Einträge bleiben unverändert.

DATEIEN DIESES UPDATES: index.html, sw.js, README.txt,
  wastl-bots.js, wastl-bots-ui.js, wastl-bots.css.

--- HISTORISCHE VERSIONEN ---

Schafkopftracker 4.9.1 – Importstabilität, Originalbild, Wastls Mentorensprache

- Sicherer Bildimport: Jeder Upload hat einen getrennten Zustand. Langsam eintreffende Dateien können neuere Auswahlen nicht überschreiben.
- Fehlermeldungen und „Erkennung erneut starten“ direkt im Import; kein erneutes Hochladen notwendig, wenn lediglich die Kartenerkennung scheitert.
- Bei unklarer Sitzposition wird der Spielerbereich des Originalbilds angezeigt. Über „Originalbild ansehen“ lässt sich jederzeit der ganze Spielbericht ansehen.
- Wastl spricht im Tischdialog in kurzen, zugbezogenen Mentoren-Sätzen ohne Prozentwerte. Zahlen und Unsicherheiten bleiben über ⓘ verfügbar.
- Geprüfte Spielart, gespeicherte Partien, bestehende Daten und Offline-Kartensatz bleiben erhalten. Keine weiteren Abhängigkeiten.

KLEINES UPDATE: Alle enthaltenen Dateien ins Repository-Hauptverzeichnis kopieren und bestehende ersetzen. cards-Ordner nicht ändern.
Vorher unter Einstellungen → Datensicherung die Daten exportieren.
Schafkopftracker Version 4.9 – Klassische Spielarten, nachvollziehbarer Entscheidungsindex
- Spielart-Erkennung: Rufspiel Eichel/Gras/Schellen; Farbsolo Eichel/Gras/Herz/Schellen; Wenz.
- Vollstaendig simulierte Partien erhalten einen vorläufigen 1–10-Modellindex, ohne globales Benchmark-Gate.
- Auch bei wenigen bewertbaren Zuegen wird der neutrale Wert 5 klar als nicht interpretierbar gekennzeichnet.
- Konkrete Zugkommentare mit Kartenalternativen, Modell-Siegquoten, Augen und Unsicherheit.
- Wastls Abschlussansicht zeigt Lernpunkte.
- Alle Daten bleiben lokal; keine Schueler- oder Nutzerdaten werden versendet.
- 1–10 ist kein Expertenurteil und muss weiter kalibriert werden.

Schafkopftracker – Version 4.8
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

Version 4.7: Referenz-Eckenerkennung (32 nutzerseitig erstellte Eckenausschnitte als verkleinerte Merkmale). Vor dem Speichern weiterhin Spielart/Sitzposition/Hand und Karten kontrollieren. Original-Vorlagenbilder werden nicht mitveröffentlicht.

Version 4.8 – Ein-Klick-Analyse (aktualisierte Fassung 4.8.1):
1. Unter Wastl »Schafkopf-Palast-Partie importieren« wählen.
2. Palast-Gesamtbild auswählen (Bildaufteilung ca. 600 × 1350).
3. Auf »Spiel analysieren« tippen: automatische Sicherung der Partie,
   anschließend 350 Verteilungen JE STICH ohne erneute Nachfrage.
4. Originale vier Anfangshände und acht Stiche werden separat erkannt
   und auf identische Kartenverteilung pro Spieler abgeglichen.
5. Palast-Grünmarkierung erkennt den eigenen Platz nur, wenn eindeutig.
6. Spielart-Textabgleich ist NUR für vorliegende Palast-Schriftvarianten
   Rufspiel Eichel, Rufspiel Gras und Rufspiel Schellen vorbereitet.
   Nicht erkannte Spielarten werden NICHT pauschal als Rufspiel gespeichert;
   stattdessen verlangt die App eine kurze Korrektur.
7. Ansager aus Palast-Ansagezeilen wird bei eindeutigem Treffer zugeordnet.
8. Kartenfehler, fehlende eindeutige Informationen oder ungültige Regeln
   stoppen die automatische Analyse und lassen einen Detailcheck öffnen.
9. Datumsangabe ohne Texterkennung: es wird zunächst Importdatum gesetzt;
   das tatsächliche Spieldatum kann in Details korrigiert werden.
10. Screenshot wird nur im Arbeitsspeicher verarbeitet, NICHT mit
    der Partie gespeichert oder an externe Server gesendet.
11. Externe Cloud-OCR wird nicht verwendet; weitere Foto-Layouts,
    Solo, Ramsch etc. brauchen neue geprüfte Textmuster oder einen
    separaten lokalen Texterkenner.
12. Spielnoten bleiben experimentell/ggf. gesperrt, keine objektiv
    validierte 1-10-Bewertung; Wastl verwendet seine bisherigen MC-Modelle.

DATEIEN IN DIESEM UPDATE (OHNE cards-ORDNER):
- index.html, sw.js, palast-import.js, training-manager.js,
  wastl-montecarlo-ui.js, palast-game-labels.js, palast-oneclick.js,
  palast-oneclick.css, README.txt.

Die bestehenden Archiv-Schlüssel bleiben unverändert. Vor dem Update
in Einstellungen einen Backup-Export durchführen.


AUTOMATISCHE SYNCHRONISIERUNG AB 28.10.2026
- Einziges Entwicklungsrepository: schafkopf-tracker/schafkopf-tracker.github.io (Branch main).
- GitHub Actions: .github/workflows/sync-old-tracker.yml spiegelt jeden Push
  auf main automatisch nach felix57roth-dot/schafkopf-tracker (Branch main).
- Voraussetzung: Das Repository-Secret OLD_REPO_TOKEN im neuen Repository
  muss Schreibzugriff auf das alte Repository haben.
- Der Abgleich übernimmt die App-Dateien; die Verzeichnisse .git und .github
  des alten Repositories werden nicht überschrieben.
- Vorhandene Browser-Daten (localStorage) werden durch den Repository-Abgleich
  weder gelöscht noch zwischen den beiden unterschiedlichen Links übertragen.
