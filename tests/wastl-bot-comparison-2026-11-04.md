# Wastl Bot 8.1 – Offline-Vergleichsprotokoll (04.11.2026)

Dieses Protokoll dokumentiert **reproduzierbare Simulationen mit künstlichen
Kartenverteilungen**. Die Ergebnisse sind kein Vergleich mit menschlichen
Schafkopfspielern und keine Kalibrierung der Wastl-Sterne.

## 1. Kartenstrategie: Bot Brain 8.0 gegen Policy 4.5

Reproduktion:

```bash
node tests/wastl-bot-tournament.js --cases=72 --samples=12
```

- 72 gleiche Startkonstellationen je zweimal gespielt = **144 Partien**.
- In jeder Paarung identische Anfangshände, Spielarten und fokale Sitzplätze.
- Die übrigen drei Spieler nutzen jeweils die bisherige Policy.
- Fokaler Spieler: einmal alte Policy, einmal Live-Lookahead. Die
  Gegenspiel-Entscheidungen werden mit nachvollziehbaren Seeds erzeugt.
- Spielarten: 24 Rufspiele, 24 Soli, 24 Wenzen.
- Rollen: 20 Einsätze im Ansagerteam, 52 als Gegenspieler.
- 394 Monte-Carlo-Entscheidungen, davon 195 mit einer anderen Karte,
  0 notwendige Rückfälle auf die alte KI in diesem reproduzierbaren Offline-Test.

| Größe | Alte Policy | Bot Brain 8.0 | Differenz |
| --- | ---: | ---: | ---: |
| Siegquote des fokalen Spielers | 59,72 % | 61,11 % | **+1,39 Prozentpunkte** |
| Augen der fokalen Seite | – | – | **+3,72 Augen** |
| 95%-Unsicherheitsintervall der Differenz | – | – | Sieg: **±8,22 Prozentpunkte**; Augen: **±3,71** |

Nach Spielarten: Augen-Differenz +4,75 (Rufspiel), +7,04 (Solo),
**−0,63 (Wenz)**. Der Siegquotenvorteil ist nicht eindeutig. Auch das
Wenz-Ergebnis ist angesichts der kleinen Teilstichprobe unsicher.

## 2. Ansagen: simulierte Gewinnchance gegen bisherige Handgrenzen

Reproduktion:

```bash
node tests/wastl-bid-tournament.js --hands=36 --samples=20 --holdouts=24
```

- 36 zufällige Achtkartenhände.
- Alte Ansage: bisheriger Handstärke-Schwellenwert.
- Neue Ansage: 20 zufällig erzeugte Kartenwelten je möglicher Spielart,
  konservative Unsicherheitsabschätzung und risikogewichteter Vergleich.
- **Unabhängige Prüfung** mit 24 zusätzlichen, zur Ansage nicht verwendeten
  Kartenwelten pro Hand und einem getrennten einfachen Regel-Testgegner.
- Nur als Versuchsmaß: Gewonnene/verlorene Spiele werden mit 1 (Rufspiel),
  2 (Wenz), 3 (Solo) Gewichtungseinheiten bewertet. Dies sind *keine*
  offiziellen Schafkopf-Tarife oder Echtgeldbewertungen.

| Größe | Beobachtung |
| --- | ---: |
| Handfälle mit unterschiedlicher Ansage | **16 von 36** |
| Anteil mit Ansage: bisheriges System | **50,0 %** |
| Anteil mit Ansage: neues System | **55,6 %** |
| Mittlere Differenz im unabhängigen Testmaß | **+0,162 Einheiten** |
| 95%-Unsicherheitsintervall | **±0,179 Einheiten** |

**Interpretation:** Die Ansagen reagieren auf modellierte Erfolgsaussichten
anstatt ausschließlich auf feste Handstärkepunkte. Ein tatsächlicher
Leistungsvorsprung wird durch diese kleine Stichprobe **noch nicht
nachgewiesen**.

## 3. Grenzen und Folgeschritte

1. Beide Experimente beruhen auf vereinfachten Regelgegnern, nicht auf
   echten Spielerentscheidungen. Daher ist die Übertragbarkeit begrenzt.
2. Mehr Tests, insbesondere mit starken und schwachen Wenz-Händen,
   unterschiedlichen Sitzpositionen und einer unabhängigen Referenz-
   Strategie, sind notwendig.
3. Auf echten Mobilgeräten muss die Zuverlässigkeit des zeitlich begrenzten
   Workers beobachtet werden. Bei Zeitüberschreitung greift die alte
   regelkonforme Spiel- und Ansagestrategie.
4. Die Kalibrierung der neuen KI gegen durchschnittliche Menschen steht
   aus. **Bot-Partien bleiben von den Sternen ausgeschlossen.**

Die beiden Testprogramme sind reproduzierbar, offline ausführbar und
verwenden keine personenbezogenen Partien oder fremde KI-Bibliotheken.
