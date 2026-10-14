SCHAFKOPFTRACKER – VERSION 2.0.1
================================

ÄNDERUNGEN
- Training und Legen aus der AUSWAHL der Spielarten entfernt. 
  Leger/Klopfer stehen weiterhin als Verdopplungsregel zur Verfügung.
- Alte gespeicherte Spiele mit Spielart "Training" oder "Legen" bleiben
  im Verlauf, in Backups und in der Statistik lesbar; es erfolgt kein Löschen.
- Sie-Abrechnung an die Hausregel angepasst:
  Preis pro Gegner = (Solo-Grundpreis + 8 × Läuferzuschlag) × 4
  Danach Verdopplung für jeden Klopfer/Leger (und ggf. aktivierte Zusatzregeln).
  Keine Schneider-/Schwarz-Zuschläge beim Sie.
- Persönlicher Gesamtgewinn beim Sie = Preis pro Gegner × 3.
  Standardtarif: (0,50 € + 8 × 0,10 €) × 4 = 5,20 € pro Gegner,
  insgesamt +15,60 €; ein Leger = 10,40 € pro Gegner, +31,20 € gesamt.
- Im Spielpreis-Feld des Sie wird "Preis pro Gegner" angezeigt.

WICHTIG
- Gespeicherte Ergebnisse werden NICHT rückwirkend neu berechnet.
- Wenn du einen bisherigen Sie-Eintrag bearbeitest und neu speicherst,
  wird die neue Formel angewendet. Alte Daten vorher exportieren.
- LocalStorage-Schlüssel unverändert: schafkopf-tracker-v1.
- Offline-Cache auf v2.0.1 aktualisiert.

UPDATE
1. In der bisherigen App unter Profil > Daten exportieren ein Backup erstellen.
2. ZIP entpacken und die fünf Dateien aus dem enthaltenen Ordner
   in das Hauptverzeichnis des GitHub-Repositorys hochladen.
3. GitHub Pages Veröffentlichung abwarten, App online öffnen,
   Aktualisieren bestätigen oder App vollständig schließen und neu öffnen.
