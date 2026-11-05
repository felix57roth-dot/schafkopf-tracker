# Schafkopf-Einsteigerlehrgang – Lernkonzept 1.1

## Zielgruppe und Grundidee

**Zielgruppe:** komplette Anfängerinnen und Anfänger des bayerischen Schafkopfs
mit langem Blatt (32 Karten). Keine vorausgesetzte Kartenkenntnis. Der
Lehrgang ist direkt über den neuen Navigationspunkt **Lernen** erreichbar,
ohne Anmeldung und ohne Internetverbindung.

**Didaktisches Prinzip:** eine Regel kennenlernen → sie mit den echten
Karten der App sehen → mindestens zwei kurze Fragen beantworten →
Erklärung bei Fehlern → nächste Lektion freischalten. Die Fragen sind
beliebig oft wiederholbar. Die Lektionen sind bewusst kurz (ca. 3–7 Min.)
und bauen aufeinander auf.

## Lernpfad: 5 Kapitel / 19 Lektionen / 46 Aufgaben

| Kapitel | Lektionen | Ziel |
| --- | --- | --- |
| Die Karten kennenlernen | Servus am Kartentisch!; Vier Farben erkennen; Sau, Zehner und Ober | 4 Spieler, 32 Karten, 4 Farben, Ränge und Augen |
| Die ersten Stiche | Stichablauf; Bedienen; Trumpf; Stichgewinner; 120 Augen und Sieg | Bedienpflicht, Stiche, Trumpf, 61-Augen-Ziel |
| Die Spielarten | Rufspiel; Ruf-Sau; Ansage; Solo; Wenz | Teams, Ansage, Trumpfwechsel, Partner |
| Am Tisch mitdenken | Augen schmieren; starke Trümpfe; Stiche lesen | erste taktische Regeln und Praxisentscheidungen |
| Bereit für die Runde | Schneider/Schwarz; Hausregeln; Abschlusstest | Tischsprache und Übergang zum Bot-Training |

Jede Lektion hat die Struktur **Einführung – Merksätze – Beispielkarten –
konkreter Tipp – interaktive Übung – Feedback**.

## Verständlichkeits-Update 1.1: Regeln zuerst sehen, dann anwenden

Für die drei schwierigsten Anfängerlektionen wurden die Texte neu gefasst:

- **Bedienen/Fehlfarbe:** „Fehlfarbe“ bedeutet nicht falsch, sondern eine
  normale Nicht-Trumpfkarte. Eichel-Sieben und Eichel-Ober werden mit
  Kartenbildern einander gegenübergestellt. An konkreten Schritten wird
  erklärt, warum der Eichel-Ober beim Rufspiel nicht Eichel bedienen kann.
- **Trumpf:** Alle **14 Rufspiel-Trümpfe** stehen sichtbar mit tatsächlichen
  Schafkopfkarten und Positionsnummern **1 bis 14**, in drei Gruppen:
  Ober, Unter, sechs übrige Herzen. Der Kurs vergleicht zusätzlich
  Augenwert und Stichstärke.
- **Stichgewinner:** Ein einfaches 3-Schritte-Verfahren: angespielte
  Farbe ansehen, Trumpf suchen, höchste passende Karte bestimmen.
  Zwei zusätzliche echte Beispiele heben die vom Regelkern berechnete
  Siegerkarte direkt hervor.

Damit die späteren Spielarten denselben Standard erfüllen, zeigt der Kurs
zusätzlich die **14 Trumpfkarten beim Gras-Solo** und die **vier Unter
beim Wenz**, ebenfalls vom stärksten zum schwächsten Trumpf.

Die drei zentralen Lektionen enthalten jetzt den Abschluss
**„Kurz gesagt“**. Das Lexikon wurde für „Fehlfarbe“, „Bedienen“
und „Trumpf“ präzisiert. Es gibt **46 statt 43** interaktive Fragen.

Die kursinternen Lektion-IDs und das \`localStorage\`-Speicherformat
\`schafkopf-einsteiger-v1\` bleiben **unverändert**. Bisherige
Lernfortschritte und Backups bleiben gültig.

Zusätzliche automatische Tests prüfen die vollständigen, bildlich
gezeigten Trumpfreihenfolgen direkt gegen \`WastlEngine.compare()\`,
die tatsächliche Trumpfzuordnung und die visuellen Siegerkarten.

## Interaktive Übungsformen

1. **Wissensfragen** mit kurzen, verständlichen Antwortmöglichkeiten.
2. **Stichaufgaben:** Vier echte Karten werden gezeigt. Die Gewinnerkarte
   wird mit `WastlEngine.winnerIndex()` berechnet, nicht manuell behauptet.
3. **Bedienaufgaben:** Eine angespielte Karte und eine Hand aus vier Karten
   werden angezeigt. Die einzige erlaubte Karte wird automatisch über
   `WastlEngine.legalMoves()` ermittelt.
4. **Abschlusstest:** Sechs gemischte Fragen. Nach Abschluss erscheint die
   Verbindung zum vorhandenen Offline-Botspiel.

Der Lehrgang erklärt bewusste **Vereinfachungen für Anfänger**. Er bildet
nicht jedes regionale Sonderrecht als Volllehrgang ab. Sonderregeln und
Geldtarife werden ausdrücklich als Vereinbarungen der Spielrunde erklärt.
Insbesondere ist die im eigenen Botspiel verwendete Grundrangfolge
Rufspiel < Wenz < Solo konfigurations- bzw. rundenabhängig zu betrachten.

## Nutzerführung

- Fünfter Navigationsbereich **Lernen** als sechster Hauptmenüpunkt neben
  Start, Erfassen, Spielen, Statistik und Wastl.
- Mobile Navigation für sechs Menüpunkte angepasst.
- Startseite des Kurses mit 5 Kapiteln, Bearbeitungsstand, `x/19` und Prozent.
- Nur die nächste Lektion wird freigeschaltet, bereits erledigte können
  beliebig wiederholt werden. Keine Strafen bei falschen Antworten.
- Lexikon mit 17 wichtigen Tischbegriffen.
- Nach Abschluss geht es mit einem Knopf direkt in den Botmodus.

## Datenhaltung, Kompatibilität und Datenschutz

- Eigenes, kleines `localStorage`-Objekt:
  `schafkopf-einsteiger-v1`, Format `{version:1,completed:[...]}`.
- Kein Lernprofil auf dem Server, keine Analytics, keine Fremdbibliotheken.
- Fortschritt wird zusätzlich in der regulären App-Datensicherung als
  `beginnerCourse` exportiert und kann bei einem Import ergänzt oder
  ersetzt werden. Alte Backups ohne diesen Teil löschen ihn nicht.
- Bestehende Spiele, Statistiken, Wastl-Wertung und Bot-Speicher werden
  nicht verändert; der Kurs ist ein gesondertes Modul.
- Alle verwendeten Kartenbilder sind Bestandteil des vorhandenen
  Offlinecaches.

## Quellenbasis und geprüfte Spielvariante

Die Regeln wurden gegen die bereits bestehende Schafkopf-Engine und
öffentlich dokumentierte bayerische Spielregeln abgeglichen:

- Schafkopfschule e. V., Schafkopfregeln:
  https://www.schafkopfschule.de/regeln.html
- Bayern Tourismus, Schafkopf-Anleitung:
  https://erlebe.bayern/service/schafkopf/
- Bayerisch Schafkopf, verständliche Einführung:
  https://www.bayerisch-schafkopf.de/schafkopf-regeln.html

**Abgrenzung:** Der Lehrgang soll sich für die ersten echten
Schafkopfpartien eignen. Er ist kein vollständiges Regel- oder
Strategiekompendium für alle Hausregeln, Varianten oder Turniere.

## Automatisierte Prüfungen

```bash
node --test tests/schafkopf-kurs.test.js
```

Die Regressionstests umfassen Kartenbilder, Lehrgangsumfang, gültige
Lösungen über den Regelkern, Freischaltung, Fehlerkorrektur, die komplette
Abfolge aller 46 Antworten, Offline-Integration und Backup-Roundtrip.
