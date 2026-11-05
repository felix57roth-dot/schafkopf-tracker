# Betreutes Schafkopf-Übungsspiel mit Wastl – Konzept & Version 1.0

## Ziel

Absolute Anfänger können nach dem Einsteigerlehrgang direkt am
vorhandenen Stammtisch gegen Resi, Sepp und Xaver üben. Wastl erklärt
während des Spiels die Regeln, gibt auf Wunsch einen vorsichtigen Tipp
und ordnet die anschließend gelegte Karte ein. Alles arbeitet **offline**.

## Drei auswählbare Lernstufen

| Modus | Während des Zugs | Nach dem Zug |
| --- | --- | --- |
| 🌱 Anfänger | Automatische Regelerklärung und optisch gekennzeichnete erlaubte Karten; Kartentipp auf Wunsch | Kurze Einordnung der Entscheidung |
| 💡 Fortgeschritten | Keine automatische Regelerklärung, aber Kartentipp auf Wunsch | Kurze taktische Einordnung |
| 🃏 Freies Spiel | Keine Trainingshilfe | Keine Trainingshilfe |

Der Modus ist vor dem Austeilen und jederzeit über ⚙️ einstellbar.
**Bisherige Nutzer starten im freien Spiel**, der bisherige Botmodus
bleibt daher unverändert. Der Modus wird ausschließlich unter der
separaten bestehenden Options-ID `schafkopf-botoptionen-v1` gespeichert.

## Fachliche Trennung der Rückmeldung

**Regelgewissheit:** Die erlaubten Karten werden ausschließlich über
`WastlEngine.legalMoves()` ermittelt. Gibt es genau eine erlaubte
Karte, erklärt Wastl eine zwingende Bedienpflicht oder Ruf-Sau-Regel.
Er formuliert hier keine taktische Bewertung.

**Strategische Unsicherheit:** Für mehrere erlaubte Karten kann
Wastl die bisherige `WastlPolicy.evaluate()` als leichte, schnelle
Heuristik verwenden. Das ist ausdrücklich **keine geprüfte
Bestkarte**. Die Rückmeldung nennt eine legale Alternative, ohne
andere korrekte Entscheidungen als „Fehler“ zu bezeichnen. Die
Heuristik kann weitere Alternativen übersehen und ist nicht auf
menschliche Spielstärke kalibriert.

**Faire Information:** In die Trainingsengine gehen nur eigene Hand,
Spielart, Ansager, bisherige Stiche und aktuelle offen ausliegende
Karten ein (`WastlCoach.publicView`). Die fremden Karten, initialen
Gegnerhände, verborgene Partnerinformationen und späteren Karten
werden weder übergeben noch gelesen.

## Ablauf

1. Menü **Spielen** öffnen und Lernstufe wählen.
2. Karten geben, Spielansage treffen. Als Anfänger erklärt Wastl
   zunächst „Ich spiele“, „Weiter“ und die Spielauswahl.
3. Während des eigenen Kartenzugs erklärt er die Bedienpflicht.
   Der bestehende Botmodus markiert spielbare Karten.
4. Optional **Kartentipp von Wastl** antippen. Eine Kartenempfehlung
   wird sichtbar hervorgehoben und als unsicher gekennzeichnet.
5. Karte wie gewohnt durch Tippen spielen. Wastl ordnet
   Regelkonformität und eine mögliche Alternative ein.
6. Nach der Runde kann die vorhandene ausführliche Wastl-Analyse
   wie bisher gestartet werden.

Der Spieltisch selbst, die automatischen Gegenspieler und die
Stich-Engine werden nicht verändert. Neue Runden und ein Wechsel
des Trainingsmodus setzen nur temporäre Hinweise zurück.

## Daten und Bewertung

- Weder der Lernmodus noch seine Hinweise speichern personenbezogene
  Angaben oder Informationen über die Gegnerhände.
- Botpartien werden weiterhin normal archiviert, aber **nicht** in
  die Spielstärken-Sterne einbezogen.
- Bestehende Guthaben, Tarife, Backups, Offlinecache und Rangfolgen
  bleiben erhalten.
- Bestehende Stammtischpartien können unverändert fortgesetzt werden.
- Kein Netzwerkzugriff, keine fremden Bibliotheken, keine generative KI.

## Automatische Prüfung

```bash
node --test tests/wastl-coach.test.js
```

Geprüft werden unter anderem: keine versteckten Karten, zwingendes
Bedienen, Trumpfpflicht, fehlender Stechzwang, legale strategische
Hinweise, keine falschen „sicheren Fehler“, Hilfen bei Ansagen,
Opt-in-Modi, Offline-Assets und die Unabhängigkeit von Wastls
Spielerstärkenprofil.

## Mögliche zweite Version

Aufbauend auf Nutzerfeedback:
- didaktisch geführte Beispielpartien mit bewusst erzeugten
  Lernkonstellationen (z. B. Partner erkennen, Davonlaufen, Wenz).
- Nachspielbare Stichentscheidungen mit mehreren Alternativen.
- Einfache Lernziele pro Partie, klar getrennt vom Leistungsrating.
- Erst nach gesonderter Kalibrierung stärkere strategische Tipps durch
  simulierte Fortsetzungen, ohne die UI bei langsamen Geräten zu blockieren.
