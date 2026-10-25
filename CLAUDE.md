# Alle einsteigen! – Projektanleitung

Zählspiel als PWA für ein Kind von 2–3 Jahren. Das Kind ist Pilot, Familienmitglieder steigen als Passagiere ein,
jeder Gast wird mit der Stimme des Vaters gezählt. Diese Datei ist das Gedächtnis des Projekts: Wer hier weiterarbeitet,
liest sie zuerst und hält sie aktuell.

## Spielablauf (fachlich)

- **Flug:** Flugzeug rollt herein (Pilotfoto im Cockpit) → „Wer fliegt mit?“ → Kind tippt Gesichter am Gate an,
  jedes fliegt ins nächste Fenster und wird gezählt („Eins!“, „Zwei!“) → Nachzählen mit aufleuchtenden Fenstern
  („Eins, zwei, drei – drei Passagiere!“) → „Alle an Bord!“ → automatischer Start, Gesichter winken.
- **Runde:** 1–5 Flüge (Standard 3) mit je 1–10 Gästen (Standard 3–4–5), dann Belohnungsfoto, dann automatisch neue
  Runde mit neu gemischten Gesichtern und Landschaft.
- **Zeitlimit:** optional, Standard aus. Ist es erreicht, wird der laufende Flug fertig gespielt, dann „Gute Nacht“.
- **Kein Falsch:** Tipps auf Himmel/Flugzeug lösen kleine Effekte aus und stören nie. Nur die vorderen 3 Gäste der
  Schlange sind antippbar. Nach 5 s ohne Tipp hüpft das nächste Gesicht, Stimme: „Wer will noch mitfliegen?“
- **Flugzeuggröße:** ≤3 Gäste Propeller, ≤6 Jet, ≥7 Doppelstock-Jumbo.
- **Eltern-Bereich:** Zahnrad oben rechts, gesperrt durch Rechenaufgabe (zwei Zahlen 6–9).
- **Kein Text im Spiel**, nur Stimme und Animation. Eltern-Bereich ist Text-UI auf Deutsch.

## Architektur

```
src/
  logic/          Reine Spiel-Logik, ohne Oberfläche/Ton/Speicher. Vollständig getestet.
    game.ts       Zustandsmaschine: step(state, event, ctx) → { state, effects }
    settings.ts   Einstellungen und Prüfregeln
    parentGate.ts Rechenaufgabe
  ui/
    game/         StartScreen, GameScreen (führt Effekte aus: Ton, Sprache, Animationen)
    parents/      ParentGate, ParentsScreen
    art/          SVG-Zeichnungen: Airplane, Face, Scenery; planeGeometry.ts (testbar)
    faces.ts      FaceInfo: Foto-URL oder gezeichnetes Platzhalter-Gesicht
  services/
    audio/        sounds.ts (Web Audio, im Code erzeugt), voice.ts (Aufnahme → sonst Gerätestimme)
    data/         (Etappe 3) Laden aus Firebase in den Arbeitsspeicher
    photos/       (Etappe 3) Gesichtserkennung, Zuschnitt, WebP
  firebase/       Web-Konfiguration aus Umgebungsvariablen; fehlt sie → Demo-Modus
firebase/         Sicherheitsregeln und Indizes (als Code, werden mit deployt)
tests/unit        Vitest: Logik, Geometrie
tests/e2e         Playwright: Klick-Tests mit Screenshots in drei Bildschirmgrößen
tests/rules       Eigenes Paket (firebase@12 wegen rules-unit-testing): Firestore-Regeln gegen den Emulator
```

Regel: Die Logik entscheidet, die Oberfläche zeigt an und führt Effekte aus. Neue Spielregeln immer zuerst in
`logic/` mit Test, dann in der Oberfläche.

## Entscheidungen (verbindlich)

| Bereich | Entscheidung |
| --- | --- |
| Frontend | Svelte 5 (Runes) + TypeScript + Vite, PWA über vite-plugin-pwa (autoUpdate, still beim nächsten Start) |
| Darstellung | SVG + CSS, Svelte-Übergänge, keine Animationsbibliothek; Quer- und Hochformat |
| Spielablauf | Eigene Zustandsmaschine in `logic/game.ts` |
| Ton | Web Audio, Geräusche synthetisch; Aufnahmen als AAC (.m4a), Stille entfernen + Lautstärke angleichen |
| Ersatzstimme | speechSynthesis, de-DE (Hochdeutsch) |
| Fotos | Eltern wählen Fotos im Eltern-Bereich aus der Galerie; Gesichtserkennung schlägt Kreis vor, Eltern korrigieren, Rolle (Pilot/Passagier/Belohnung) + Name; App speichert WebP 512×512 ohne EXIF als Bytes in `families/{id}/photos/{id}` (max. 300 KB). HEIC nur auf dem iPhone lesbar. |
| Speicherung | Nur Cloud (Firestore); beim Start alles in den Arbeitsspeicher laden; Firestore nur mit Memory-Cache, **nie** `persistentLocalCache`; nichts dauerhaft auf dem Gerät. Offline-Modus später über eine Zwischenschicht im Daten-Dienst. |
| Backend | Nur Firebase im **Spark-Tarif** (kostenlos): Auth (E-Mail/Passwort), Firestore, Hosting. **Kein Cloud Storage** (bräuchte Blaze), Fotos und Aufnahmen als Bytes in Firestore. **Keine Cloud Functions.** App Check. Region europe-west3. Wechsel zu Storage später im Daten-Dienst kapselbar. |
| Konten | Familie mit mehreren Konten; Konten und `families/{id}.members` nur von Hand in der Konsole, keine Selbst-Registrierung |
| Eltern-Bereich live | Firestore-Listener im Eltern-Bereich; Spiel lädt nur beim Start |
| Umgebungen | Ein Firebase-Projekt, alles geht live. Tests nie gegen echte Daten (Emulator). |
| Veröffentlichung | Push auf `main` → GitHub Actions: Tests → Build → Deploy (Hosting + Regeln) |
| Sicherheit | Strenge Header inkl. CSP in `firebase.json`; Firestore-Regeln prüfen Mitgliedschaft, Felder, MIME-Typ und Größe der Bytes |
| Fehlerberichte/Analyse | Keine |
| Sicherung | Im Spark-Tarif keine verwaltete Sicherung; Export-Funktion im Eltern-Bereich vorsehen (Etappe 4) |

## Befehle

```
npm install
npm run dev                 # Entwicklung
npm run check               # Svelte- und TypeScript-Prüfung
npm test                    # Unit-Tests (Vitest)
npm run test:e2e            # Klick-Tests (Playwright), baut und startet Vorschau selbst
cd tests/rules && npm install && npm test   # Regeln gegen Emulator (braucht Java)
python3 scripts/render-icons.py             # App-Icons aus public/favicon.svg neu erzeugen
```

In der Claude-Arbeitsumgebung: Chromium liegt unter `/opt/pw-browsers/…`, Aufruf mit
`CHROMIUM_PATH=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome npm run test:e2e`. Der Firebase-Emulator lässt
sich dort nicht herunterladen; Regel-Tests laufen in GitHub Actions.

## Datenschutz

Fotos und Aufnahmen gehören **nie** ins Repo, nicht in Tests, nicht in Screenshots. Platzhalter-Gesichter sind
gezeichnet (`ui/art/Face.svelte`).

## Etappen

1. ✅ Grundgerüst: Spiel spielbar mit Platzhalter-Gesichtern und Gerätestimme, Eltern-Bereich mit Einstellungen
   (nur im Arbeitsspeicher), Regeln, CI.
2. Spiel verfeinern: Landschaften/Reiseziele, Animationen, echte Geräte testen (iPhone-Ton!).
3. Firebase: Anmeldung, Familie laden, Einstellungen speichern, Fotos aus der Galerie verarbeiten,
   Sprachaufnahmen (AAC, Aufbereitung), Ersatzstimme für fehlende Aufnahmen, App Check.
4. Feinschliff: Zeitlimit-Abschluss, Fehlende-Fotos/Aufnahmen-Hinweise, Sicherung einrichten.
