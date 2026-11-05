# Wastl Rufspiel-Labor – 5. November 2026

## Fragestellung

Kann das Zusammenspiel zwischen Ansager und unbekanntem Rufspielpartner
durch bessere, **ausschließlich öffentlich nachvollziehbare** Teamzuordnung
verbessert werden?

Untersuchte Versuchsregeln:

- Ein Nichtansager, der die Ruf-Sau **nicht** besitzt, kennt seine Rolle
  als Verteidiger bereits vor der Aufdeckung. Er kennt damit aber noch
  nicht automatisch die Zugehörigkeit jedes anderen Nichtansagers.
- Der Besitzer der Ruf-Sau kennt seine Zugehörigkeit zum Ansagerteam.
  Diese Information stammt ausschließlich aus seiner eigenen Hand.
- **Davonlaufen:** Ein abgeschlossener Stich, der mit einer kleinen
  Ruffarbe eröffnet wurde und keine Ruf-Sau enthält, kann unter den
  geprüften Spielregeln den Anspieler als Ruf-Sau-Besitzer offenbaren.
  Das darf niemals aus einer bloß begonnenen Kartenfolge geraten werden.
- Dazu werden vorsichtige Zu-/Abschläge für Stechen, Überspielen und
  Augenschmieren getestet, nicht als gesicherte menschliche Taktik behauptet.

## Getrennte Testfortsetzungen (A/B)

Reproduzierbar:

```bash
node tests/wastl-rufspiel-independent-study.js --cases=144 --samples=12
```

144 identische Rufspiel-Konstellationen werden zweimal gespielt, insgesamt
**288 vollständige Partien**. Je 48 Konstellationen testen Ansager,
Ruf-Sau-Besitzer und Verteidiger. Die jeweils drei Mitspieler benutzen
eine **separate, einfache Regelstrategie** (`chooseIndependent`).
Sie erhält bei ihrem Zug ausschließlich ihre eigene Hand und öffentlich
bekannte Stiche. Sie verwendet denselben Regelkern und einige
Teamerkennungs-Hilfen wie die alte Policy; sie ist daher **kein
vollständig unabhängiger Expertenstandard**.

Die beiden Kandidaten verwenden identische Anfangsverteilungen,
Sitzpositionen, Spielart, Seeds und Gegnerschema. Bewertet wird der
tatsächliche Ausgang der ausgeteilten Partie; unbekannte Karten werden
während der Zugwahl nicht preisgegeben.

| Perspektive | Fälle | Gewinnquote: neu minus alt | Augen: neu minus alt |
| --- | ---: | ---: | ---: |
| Ansager | 48 | −2,08 Prozentpunkte | +1,02 |
| Ruf-Sau-Besitzer | 48 | 0,00 Prozentpunkte | −0,04 |
| Verteidiger | 48 | −4,17 Prozentpunkte | −2,00 |
| **Insgesamt** | **144** | **−2,08 Prozentpunkte** | **−0,34** |

Annähernde 95%-Intervalle für den mittleren Differenzschätzer:
Gewinnquote **±2,34 Prozentpunkte**; Augen **±0,90 Augen**.
Die Intervalle umfassen null. Insgesamt wurden **210 Zugentscheidungen
vor dem erstmaligen öffentlichen Ausspielen der Ruf-Sau** protokolliert;
in der Testserie gab es keine Simulations-Rückfälle. Die Intervalle
berücksichtigen nur die Unterschiede zwischen diesen synthetischen
Testfällen, keine systematischen Schwächen des Simulationsgegners.

In einem zusätzlichen gezielten Einzelentscheidungs-Vergleich änderte
die experimentelle Direkt-Taktik unter 200 untersuchten Verläufen nur
**zwei konkrete Kartenempfehlungen**. Keiner dieser beiden Fälle änderte
die Partiegewinnentscheidung. Die Evidenz reicht daher nicht für einen
Vorteil dieser Heuristik.

## Umsetzung ohne Risiko für laufende Botpartien

Der bestehende Modellaufruf

```js
WastlBotBrain.analyze(view, {samples: 26, seed: 123})
```

verwendet weiterhin die **bereits vorhandene Taktik** (`tactical`).

Die neue Partnerbehandlung wird **ausschließlich für Prüfzwecke** durch
den ausdrücklich gewählten Parameter `opponentModel: 'partnerAware'`
aktiviert. Die Referenzmodi `classic` und `tactical` bleiben erhalten.
Das neue Experiment ist nicht über die normale Oberfläche aktivierbar.
Spielstände, Backups, Wertung und Bot-Sterne werden nicht verändert.

## Befund und nächste wissenschaftlich sinnvolle Prüfung

**Keine nachgewiesene Verbesserung.** Die hier geprüfte Variante ist
insbesondere bei Verteidigerrollen in dieser Stichprobe eher schlechter.
Deshalb wird die neue Heuristik nicht zur Standardstrategie.

Als nächste Untersuchungen bieten sich an:
1. eine zweite, tatsächlich unabhängig implementierte Gegenstrategie,
   deren Teamlogik nicht von der alten Policy abhängt;
2. gezielt erzeugte Partien mit regelkonformem Davonlaufen sowie
   gesicherten und ungesicherten Partnerstichen;
3. mehr reproduzierbare Vergleichspartien mit einer vorab festgelegten
   Gewinn-/Augenmetrik und aufbewahrten Fehlentscheidungen;
4. erst später der Vergleich mit echten menschlichen Spielern.

Botpartien bleiben aus der Spielerstärkenwertung ausgeschlossen.
