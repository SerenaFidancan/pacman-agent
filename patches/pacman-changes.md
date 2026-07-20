# Änderungen an pacman.js

## Herkunft der Originaldatei

Die Datei `pacman.js` stammt aus dem Pac-Man-Spiel von **Matt Platts (1999)**.
Sie kam über den Branch **`feature/pacman` von Prof. Antakli** in das
**AJAN-editor**-Projekt und liegt dort unter:

    AJAN-editor/public/pacman-game/js/pacman.js

Umfang: ca. 1850 Zeilen.

## Warum sie nicht im Repo liegt

`pacman.js` ist Fremdcode und gehört zum AJAN-editor-Projekt, nicht zu diesem
Repository (`pacman-agent`). Damit kein fremder Code und keine fremde
Urheberschaft/Historie in dieses Repo dupliziert werden, wird die Datei nicht
kopiert. Dokumentiert sind hier ausschließlich die beiden eigenen Ergänzungen
als Patch.

## Wie man die Änderungen einspielt

1. `AJAN-editor/public/pacman-game/js/pacman.js` öffnen (liegt außerhalb dieses Repos).
2. **Ergänzung 1** am Dateiende anhängen (~Zeile 1849).
3. **Ergänzung 2** in die Funktion `publishGameState()` einfügen — direkt unter
   die Zeile `console.log("PACMAN_GAME_STATE:" ...)` (~Zeile 1777).

---

## Ergänzung 1 — Dateiende (~Zeile 1849)

WebSocket zum Agent-Service in der Variable `agentSocket`, mit `onopen`- und
`onerror`-Handler. Wird am Ende der Datei angehängt.

```javascript
var agentSocket = new WebSocket("ws://localhost:3000/pacman");

agentSocket.onopen = function () {
    console.log("Mit Agent-Service verbunden");
};

agentSocket.onerror = function () {
    console.log("Keine Verbindung zum Agent-Service");
};
```

## Ergänzung 2 — Funktion `publishGameState()` (~Zeile 1777)

Direkt unter `console.log("PACMAN_GAME_STATE:" + JSON.stringify(gameState));`.
Sendet den Spielzustand zusätzlich über den WebSocket, aber nur wenn die
Verbindung offen ist (`readyState === WebSocket.OPEN`).

```javascript
	if (agentSocket.readyState === WebSocket.OPEN) {
        agentSocket.send(JSON.stringify({ type: "state", state: gameState }));
    }
```
