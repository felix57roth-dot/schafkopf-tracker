# Wastl Bot 8.2 – Wenz und Rufspiel (05.11.2026)

## Technische Änderungen

- Neue `wastl-tactics.js` für **Wenz und Rufspiel**; Regelkern, Daten und alte Policy bleiben unangetastet.
- Wenz: stärkere Berücksichtigung der **vier Unter als alleinige Trümpfe**; teure Unter weniger bereitwillig auf bereits vom eigenen Team gewonnene Stiche setzen; erwartete Augen und Trumpfreserve abwägen.
- Rufspiel: nur **öffentlich bekannte Partner** und eigene Ruf-Sau nutzen; bekannte Partnerstiche unterstützen; unnötiges Überstechen dämpfen; Ruffarbe beim Ansager leicht anders gewichten.
- Die Live-Engine verwendet die Taktik in ihren simulierten Fortsetzungen; bisheriges Modell bleibt über `{opponentModel:'classic'}` im Analyseaufruf zu Vergleichszwecken erreichbar.
- Alle Entscheidungen weiterhin ohne Zugriff auf verdeckte fremde Karten; Worker, Fallback-KI, Offlinebetrieb, Spiellogik und gespeicherte Partien bleiben erhalten.
- Bot-Partien beeinflussen die Spielstärken-Sterne weiterhin **nicht**.

## Gepaarte Regression – 120 identische Startkonstellationen

Reproduzieren:

```bash
node tests/wastl-tactics-study.js --cases=120 --samples=12
```

Dieselben Startkarten, Spielart, fokaler Sitzplatz und Referenzgegner werden zweimal getestet: Live-Simulation **klassisch** vs. **taktisch**. Dabei spielen drei Referenzspieler nach der vorherigen Policy 4.5. Insgesamt **240 vollständige Testpartien** (40 Paarungen je Spielart).

| Spielart | Gepaarte Fälle | Differenz Siegquote, taktisch – klassisch | Augen-Differenz, taktisch – klassisch |
| --- | ---: | ---: | ---: |
| Rufspiel | 40 | 0,0 Prozentpunkte | −1,18 Augen |
| Wenz | 40 | +2,5 Prozentpunkte | +1,53 Augen |
| Solo (Kontrollgruppe) | 40 | 0,0 Prozentpunkte | 0,0 Augen |
| **Gesamt** | **120** | **+0,83 Prozentpunkte** | **+0,12 Augen** |

Die approximativen 95%-Unsicherheitsintervalle der **mittleren Differenzen** betragen insgesamt ±3,66 Prozentpunkte Siegquote und ±1,48 Augen. Für Wenz: ±4,90 Prozentpunkte bzw. ±3,00 Augen; für Rufspiel: ±9,92 Prozentpunkte bzw. ±3,28 Augen. Sämtliche Intervalle enthalten null.

**Fazit:** Die neue Taktik ändert das Verhalten regelkonform und liefert beim Wenz einen kleinen positiven Trend, beweist aber **noch keinen stabilen Spielstärkezuwachs**. Die Rufspiel-Ergebnisse sind durchwachsen und verdienen eigene Gegenproben.

## Prüfung und verbleibende Grenzen

```bash
node --test tests/wastl-tactics.test.js tests/wastl-bot-brain.test.js
```

Die Prüfungen decken Wenz-Trumpfregeln, Partnerwissen, nicht einsehbare Hände, Stichübernahme, vollständige Partien, legale Karten und den Vergleich der Modellversionen ab. Die Regressionstests laufen zusätzlich automatisch in GitHub Actions.

Das Verfahren verwendet *synthetische* Partien und künstliche Referenzgegner, **keine menschlichen Spieler**. Die Simulationen setzen außerdem heuristische Gegenspieler voraus. Die einfachen Konfidenzintervalle berücksichtigen nur die Variation dieser Vergleichsfälle, nicht den Modellfehler selbst. Es liegt weiterhin keine Kalibrierung auf „Normalspielerniveau“ vor.

**Nächste Tests:** zusätzliche Rufspiel-Situationen mit unbekanntem und bekanntem Partner, separate Wenz-Einzelspiele mit schwachen/starken Unterhänden, stärkere unabhängige Referenzgegner und Praxistests auf langsamen Mobilgeräten. Erst danach erneut über die Integration von Bot-Partien ins Spieler-Rating entscheiden.
