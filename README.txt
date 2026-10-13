SCHAFKOPF TRACKER – PROTOTYP 1.0

Funktionsumfang:
- Spielabend mit Datum, Betrag, Ort und Notiz eintragen, löschen
- Dashboard mit kumuliertem Gewinn, Durchschnitt, Gewinn- und Verlustabenden, Diagramm
- Spielername und Sichtbarkeits-Schalter
- Backup-Export und -Import als JSON
- Vier selbst gezeichnete bayerische Kartensymbole (Schell, Eichel, Blatt, Herz)
- Installierbare Progressive Web App mit Offline-Cache
- Die Freundes-Rangliste zeigt ausdrücklich nur erfundene Demo-Einträge

WICHTIG ZU PRIVATSPHÄRE UND FREUNDEN:
Alle echten Einträge bleiben in diesem Prototyp ausschließlich im localStorage des jeweiligen Browsers. Das Sichtbarkeits-Setting wird ebenfalls nur lokal gespeichert; es gibt keine Online-Veröffentlichung, keine Verbindung zu Freunden und noch keinen Account. Für echte öffentliche/private Freundesprofile benötigen wir eine Authentifizierung und eine Cloud-Datenbank mit sicheren Zugriffsregeln. Standardmäßig privat.

SO STARTEN:
Option 1: Inhalt des Ordners auf statischem HTTPS-Hosting veröffentlichen (z.B. GitHub Pages oder Netlify Free). Link öffnen und auf Handy zum Startbildschirm hinzufügen.
Option 2: Zum lokalen Test im Projektordner `python -m http.server 8000` ausführen und http://localhost:8000 aufrufen. Die PWA-Installation braucht regulär HTTPS oder localhost.

SICHERUNG:
Daten sind geräte- und browsergebunden. Bitte regelmäßig unter Profil > Daten exportieren sichern. Löschen von Browser-Daten kann die Einträge entfernen.

NÄCHSTE AUSBAUSTUFE:
Login, Cloud-Synchronisierung, Kontakte/Freundesliste, durch Serverregeln geprüfte Sichtbarkeit (privat/Freunde/öffentlich), echte Ranglisten, Datenlöschung/Datenschutzhinweise.
