# Answr - Projektpraesentation

## 1. Grundidee

`Answr` ist eine datenschutzfreundliche Quiz-Plattform als Alternative zu Kahoot. Das Projekt richtet sich an Schulen, Hochschulen, Unternehmen und private Gruppen, die interaktive Quiz-Sessions mit mehreren Teilnehmenden in Echtzeit durchfuehren wollen.

Die Grundidee ist, dass eine moderierende Person ein Quiz erstellt, eine Session mit einer 6-stelligen PIN startet und sich andere Personen ohne Registrierung schnell ueber ihr Geraet einloggen koennen. Dadurch entsteht eine einfache, schnelle und motivierende Form des Lernens oder der Wissensabfrage.

## 2. Anforderungen

### Funktionale Anforderungen

- Moderatorinnen und Moderatoren koennen sich registrieren und anmelden.
- Quizzes koennen erstellt, bearbeitet, geloescht und verwaltet werden.
- Spielerinnen und Spieler koennen ueber eine PIN einer Session beitreten.
- Das Spiel laeuft in Echtzeit mit Fragen, Timer, Antworten und Rangliste.
- Mehrere Fragetypen werden unterstuetzt.
- Eine oeffentliche Quiz-Bibliothek erlaubt das Durchsuchen, Verwalten und Klonen von Inhalten.
- Ergebnisse und Spielstaende sollen fuer Moderator und Teilnehmende klar sichtbar sein.

### Nicht-funktionale Anforderungen

- Die Anwendung soll schnell und reaktionsfaehig sein.
- Die Bedienung soll auf Desktop und Mobilgeraeten funktionieren.
- Die Architektur soll sauber getrennt und erweiterbar sein.
- Die Kommunikation waehrend des Spiels muss zuverlaessig in Echtzeit funktionieren.
- Authentifizierung und Eingabevalidierung muessen umgesetzt sein.

## 3. Architektur

Die Anwendung folgt einer klassischen Web-Architektur mit klar getrennter Frontend-, Backend- und Datenhaltungsschicht:

- `Frontend`: Vue-Client fuer Moderator- und Spieleroberflaechen
- `Backend`: Express-API fuer REST-Endpunkte und Socket.io fuer Echtzeitkommunikation
- `Datenbank`: MongoDB mit Mongoose-Modellen fuer Nutzer, Quizzes, Fragen, Sessions und Antworten

### Architekturmuster

- Das Frontend uebernimmt Darstellung, Navigation und lokale Statusverwaltung.
- Das Backend kapselt Geschaeftslogik, Authentifizierung, Validierung und Spiellogik.
- Echtzeitereignisse wie Spielstart, Timer, Antwortabgabe und Leaderboard laufen ueber WebSockets.
- REST wird fuer klassische CRUD-Vorgaenge genutzt, WebSockets fuer das Live-Spiel.

### Warum diese Architektur sinnvoll ist

- Die Trennung von REST und WebSocket passt gut zum Anwendungsszenario.
- Moderator- und Spielerfluss koennen in derselben Anwendung abgebildet werden.
- Die Architektur ist fuer spaetere Erweiterungen wie weitere Fragetypen, Statistiken oder Deployment in der Cloud vorbereitet.

## 4. Tech Stack

### Frontend

- `Vue 3` mit Composition API
- `Vite` als Build-Tool
- `Pinia` fuer State Management
- `Vue Router` fuer Navigation
- `Tailwind CSS` fuer Styling
- `Socket.io Client` fuer Echtzeitkommunikation

### Backend

- `Node.js`
- `Express.js`
- `Socket.io`
- `JWT` fuer Moderator-Authentifizierung
- `Mongoose` als ODM

### Datenhaltung und Infrastruktur

- `MongoDB 7`
- `Docker Compose` fuer lokale Entwicklungsumgebung

## 5. Umsetzung

Die Umsetzung orientiert sich an einem typischen Multiplayer-Quiz-Ablauf:

1. Eine moderierende Person erstellt oder waehlt ein Quiz aus.
2. Das Backend erzeugt eine Session mit einer eindeutigen 6-stelligen PIN.
3. Spielerinnen und Spieler treten der Session ueber die PIN bei.
4. Das Spiel startet und Fragen werden in Echtzeit an alle Clients gesendet.
5. Antworten werden serverseitig ausgewertet.
6. Timer, Punktevergabe und Rangliste werden zentral vom Server gesteuert.
7. Nach jeder Frage und am Ende des Spiels werden Ergebnisse angezeigt.

### Technische Umsetzung im Projekt

- Die Moderator-Seite steuert den Spielablauf.
- Die Spieler-Seite ist auf schnellen Einstieg und einfache Bedienung ausgelegt.
- Die serverseitige Spiellogik sorgt dafuer, dass Timer und Punkte nicht vom Client manipuliert werden koennen.
- Die WebSocket-Kommunikation reduziert Verzoegerungen und sorgt fuer Live-Feedback.
- Die Quiz-Bibliothek ergaenzt die Kernfunktion um Wiederverwendbarkeit und Content-Sharing.

## 6. Passt MongoDB gut zu diesem Projekt?

Ja, `MongoDB` passt grundsaetzlich gut zu diesem Projekt.

### Vorteile von MongoDB fuer Answr

- Quizdaten koennen je nach Fragetyp unterschiedlich aufgebaut sein. MongoDB ist bei solchen flexiblen Datenstrukturen sehr stark.
- Dokumentenorientierte Speicherung passt gut zu Quizzes, Fragen, Antwortoptionen und eingebetteten Metadaten.
- Mit `Mongoose` lassen sich Schemas, Validierung und Beziehungen trotzdem sauber modellieren.
- Die Entwicklung ist schnell, weil neue Felder und Fragetypen einfacher erweiterbar sind als in einem starren relationalen Schema.
- Fuer ein Lern- und Webprojekt mit wechselnden Anforderungen ist MongoDB besonders praktisch.

### Einschraenkungen von MongoDB

- Komplexe relationale Auswertungen sind in relationalen Datenbanken oft angenehmer umzusetzen.
- Wenn spaeter sehr umfangreiche Reports, Statistiken oder Analysen ueber viele verknuepfte Tabellen benoetigt werden, kann MongoDB unuebersichtlicher werden.
- Strenge Transaktions- und Konsistenzanforderungen sind bei klassischen SQL-Datenbanken oft leichter zu modellieren.

## 7. Waere eine andere Datenbank besser?

Das haengt vom Schwerpunkt des Projekts ab.

### Gute Alternative: PostgreSQL

`PostgreSQL` waere eine sehr starke Alternative, besonders wenn das Projekt spaeter staerker in Richtung Auswertung, Reporting und komplexe Beziehungen weiterentwickelt wird.

### Warum PostgreSQL interessant waere

- Beziehungen zwischen `User`, `Quiz`, `Question`, `Session`, `Participant` und `Submission` lassen sich sehr sauber relational modellieren.
- Komplexe Abfragen fuer Statistiken, Ranglisten, Historien und Reports sind mit SQL oft einfacher und transparenter.
- Datenintegritaet, Constraints und Transaktionen sind bei PostgreSQL ein grosser Vorteil.
- Falls spaeter Admin-Auswertungen, BI-Reports oder aggregierte Lernstatistiken wichtig werden, ist PostgreSQL oft die langfristig robustere Wahl.

### Warum MongoDB hier trotzdem sinnvoll bleibt

- Die Anwendung arbeitet mit flexiblen Quiz- und Fragestrukturen.
- Unterschiedliche Fragetypen lassen sich ohne grossen Schema-Umbau speichern.
- Die aktuelle Produktidee legt den Fokus eher auf Echtzeit-Spielablauf und flexible Inhalte als auf hochkomplexe relationale Analyse.

## 8. Fazit

`Answr` ist eine moderne Quiz-Plattform mit Fokus auf Datenschutz, Echtzeitfaehigkeit und einfacher Nutzung. Die Kombination aus Vue, Express, Socket.io und MongoDB ist fuer diesen Anwendungsfall gut geeignet, weil sie schnelle Entwicklung, flexible Datenstrukturen und eine gute Echtzeit-User-Experience unterstuetzt.

MongoDB ist fuer den aktuellen Projektstand eine sinnvolle Wahl. Wenn sich das Projekt spaeter jedoch staerker in Richtung komplexer Statistiken, Reporting oder stark strukturierter Geschaeftslogik entwickelt, waere `PostgreSQL` vermutlich die bessere langfristige Option.
