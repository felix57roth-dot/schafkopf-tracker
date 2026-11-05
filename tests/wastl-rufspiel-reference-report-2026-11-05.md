# Rufspiel-Referenzlabor 2.0 – Stand: 5. November 2026

## Ziel und Sicherheitsentscheidung

Wir untersuchen schwierige Rufspiel-Zugentscheidungen, bei denen der Rufpartner
**noch nicht öffentlich bekannt** ist, und prüfen sie gegen eine weitere
Gegenstrategie, die nicht von der Wastl-Policy abgeleitet wird.

**Produktiv bleibt unverändert `opponentModel:'tactical'`.**
Die Modi `knowledgeOnly` (nur zusätzliche eigene/öffentliche Teamkenntnis)
und `partnerAware` (zusätzlich heuristische Boni) sind ausschließlich
explizit aufrufbare Forschungsvarianten. Botspiele bleiben von der
Spielerstärkenwertung ausgeschlossen.

## Neue unabhängige Referenz

`wastl-reference-opponent.js` ist eine eigenständige, offlinefähige
Regelheuristik, die ausschließlich den Schafkopf-Regelkern
`wastl-engine.js` nutzt. Sie verwendet **weder WastlPolicy noch
WastlOpponents, WastlTactics oder Monte-Carlo** für ihre Entscheidungen.

Sie besitzt zwei voreingestellte Stile:
- `resource`: Trumpf und starke Karten eher schonen.
- `tempo`: Initiative und Stichgewinn aktiver suchen.

Für jeden Referenzzug werden ausschließlich eigene Hand, bereits
offen gelegte Tischkarten, abgeschlossene Stiche und öffentliche
Spielparameter übergeben. **Wahre fremde Hände und künftige Stiche
werden nicht an die Referenz-KI übergeben.**

Dies ist jedoch **kein Expertenbot**: Beide Stile stammen aus derselben
einfachen Heuristik, benutzen denselben Regelkern und bilden keine
vollständig unabhängige menschliche Referenz.

## Versuchsaufbau

`tests/wastl-rufspiel-reference-study.js` erzeugt zufällige, regulär
ansagbare Rufspiele mit wechselndem Ansager, Ruf-Sau-Besitzer und Verteidiger.
Für jeden Stil wird eine **Entscheidung mit mindestens zwei erlaubten
Karten vor der öffentlichen Partneraufdeckung** ausgewählt. Auch durch
Davonlaufen bereits öffentlich identifizierte Partner werden ausgeschlossen.

Wir vergleichen **nur diese eine Karte** bei identischer Startverteilung,
identischem bisherigen Spielverlauf und identischer Simulationszufallsfolge.
Die beiden daraus resultierenden Partien spielen unsere neue unabhängige
Referenzheuristik zu Ende. Das ist ein gezielter, gepaarter
**Single-Decision-Test**, kein Nachweis einer durchgängig stärkeren Bot-KI.

Für beide Modellvarianten gibt es eine Entwicklungs- und eine davon
getrennte Prüfgruppe.

### Reproduktion ohne externe Pakete

```bash
# Erste Stichprobe (90 verschiedene Szenario-Seeds, jeweils 2 Gegenspielstile)
node tests/wastl-rufspiel-reference-study.js --cases=90 --samples=14 --from=0 --model=knowledgeOnly

# Unberührte Prüfgruppe
node tests/wastl-rufspiel-reference-study.js --cases=90 --samples=14 --from=1000 --model=knowledgeOnly

# Die ältere, umfangreichere experimentelle Partner-Strategie
node tests/wastl-rufspiel-reference-study.js --cases=90 --samples=14 --from=1000 --model=partnerAware

# Regressionstests
node --test tests/wastl-rufspiel-reference.test.js
```

## Ergebnisse: Wissensverbesserung ohne zusätzliche Zug-Boni

| Größe | Entwicklungsgruppe | Getrennte Prüfgruppe |
| --- | ---: | ---: |
| Tatsächlich geeignete Entscheidungen | 138 | 135 |
| Entscheidungen, bei denen sich die Karte änderte | 25 | 16 |
| Gewinnquote, neue minus alte Karte | −0,72 Prozentpunkte | **+1,48 Prozentpunkte** |
| Augen, neue minus alte Karte | +0,14 | **+0,66** |
| Ungefährer 95%-Fehlerbereich der Siegquotendifferenz | ±3,19 Prozentpunkte | ±2,05 Prozentpunkte |
| Ungefährer 95%-Fehlerbereich der Augendifferenz | ±0,81 | ±0,81 |

Unter den 135 Prüfentscheidungen: 43 aus Ansagersicht, 48 aus Sicht des
Ruf-Sau-Besitzers, 44 aus Sicht eines Verteidigers. Die zwei
Gegenspielstile lieferten dabei 59 geeignete `resource`- und 76
`tempo`-Vergleiche.

Die Variante mit zusätzlichen taktischen Boni (`partnerAware`)
verzeichnete in der separaten Prüfgruppe ebenfalls 135 geprüfte
Entscheidungen und 16 Kartenänderungen, mit +1,48 Prozentpunkten
Gewinnquote und +0,66 Augen. In der Entwicklungsgruppe war diese
Variante wie `knowledgeOnly` leicht im Nachteil.

**Interpretation:** Die Verbesserungen in der Prüfgruppe sind klein und
nicht statistisch gesichert; die groben Unsicherheitsintervalle enthalten
null. Außerdem stammen beide Referenzstile aus demselben Modell und
die zwei Stil-Vergleiche einer Ausgangsverteilung sind nicht vollständig
unabhängig. Die angegebenen einfachen Intervalle berücksichtigen
diese Abhängigkeit, Modellverzerrung und die Vorauswahl geeigneter
Situationen **nicht ausreichend**, sind also nicht als starke
statistische Evidenz zu verstehen.

**Die neuen Zugboni werden folglich nicht in normalen Botpartien aktiviert.**

## Qualitätssicherung und nächste Schritte

- Neue Referenz: eigenständige Modulschnittstelle mit zwei Spielstilen.
- Regelkonformität, bekannte/verborgene Karten, deterministische
  Ergebnisse, normale Standard-KI und gesonderte Testfälle erhalten
  automatische Regressionstests.
- Die existierenden Spielerprofile, lokale Spielstände und Backups
  bleiben unverändert.
- Nächster Qualitätsschritt: gezielt **spätere Rufspiel-Stellungen** mit
  unbekanntem Partner erstellen (aktuell liegt die Mehrheit der
  Testentscheidungen im ersten Stich), alternative Referenzalgorithmen
  und Tests mit menschlichen Beurteilungen ergänzen.
- Erst bei belastbar verbesserten Ergebnissen über mehrere echte
  Referenzstrategien und Rollen eine Standardumstellung erwägen.

**Warnung zur Interpretation:** Weder dieses Labor noch die bestehende
Monte-Carlo-Simulation beweist Spielstärke auf durchschnittlichem
menschlichem Schafkopfniveau.
