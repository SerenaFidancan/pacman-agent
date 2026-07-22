# Änderungen an pacman.js

## Herkunft der Originaldatei

Die Datei `pacman.js` stammt aus dem Pac-Man-Spiel von **Matt Platts (1999)**.
Sie kam über den Branch **`feature/pacman` von Prof. Antakli** in das
**AJAN-editor**-Projekt und liegt dort unter:

    AJAN-editor/public/pacman-game/js/pacman.js

Umfang: 1846 Zeilen im Original, 1886 Zeilen mit den vier Ergänzungen.

## Warum sie nicht im Repo liegt

`pacman.js` ist Fremdcode und gehört zum AJAN-editor-Projekt, nicht zu diesem
Repository (`pacman-agent`). Damit kein fremder Code und keine fremde
Urheberschaft/Historie in dieses Repo dupliziert werden, wird die Datei nicht
kopiert. Dokumentiert sind hier ausschließlich die vier eigenen Ergänzungen
als Patch.

## Node-Versionen

Die beiden Teile des Projekts brauchen **unterschiedliche Node-Versionen**:

| Teil | Version | Grund |
|------|---------|-------|
| AJAN-editor | **8.6.0** | Vorgabe des Editor-Projekts |
| Server in diesem Repo (`server.js`) | **24** | `astar.js` nutzt `??` (Node >= 14), `ws@8` braucht Node >= 10 |

Beide laufen in **getrennten PowerShell-Fenstern**. `nvm` schaltet die
Node-Version allerdings **systemweit** um, nicht pro Fenster — die zuletzt
gesetzte Version gilt also auch für jedes neu geöffnete Fenster.

Praktische Folge: **Vor jedem Neustart des AJAN-editors wieder auf 8.6.0
zurückschalten.**

```powershell
nvm use 24.0.0     # Fenster 1: node server.js
nvm use 8.6.0      # Fenster 2: AJAN-editor starten
```

Wird das vergessen, startet der Editor nicht sauber; umgekehrt bricht
`server.js` unter Node 8 bereits beim `require("./astar")` mit
`SyntaxError: Unexpected token ?` ab.

## Wie man die Änderungen einspielt

1. `AJAN-editor/public/pacman-game/js/pacman.js` öffnen (liegt außerhalb dieses Repos).
2. **Ergänzung 3** — die bestehende `setInterval`-Zeile am Dateiende von `1000`
   auf `100` ändern (Zeile 1848).
3. **Ergänzung 1** direkt darunter am Dateiende anhängen (Zeilen 1849–1857).
4. **Ergänzung 4** direkt unter Ergänzung 1 anhängen (Zeilen 1859–1886).
5. **Ergänzung 2** in die Funktion `publishGameState()` einfügen — direkt unter
   die Zeile `console.log("PACMAN_GAME_STATE:" ...)` (Zeilen 1777–1779).

Die Reihenfolge ist nicht beliebig: Ergänzung 4 setzt voraus, dass
`agentSocket` aus Ergänzung 1 bereits existiert. Ergänzung 2 steht zwar weiter
oben in der Datei als die Deklaration von `agentSocket`, greift aber erst zur
Laufzeit über den ersten `setInterval`-Tick darauf zu — zu diesem Zeitpunkt ist
das Skript längst vollständig durchgelaufen.

Alle Zeilenangaben beziehen sich auf die **fertig gepatchte** Datei.

---

## Ergänzung 1 — Dateiende (Zeilen 1849–1857)

WebSocket zum Agent-Service in der Variable `agentSocket`, mit `onopen`- und
`onerror`-Handler. Wird am Ende der Datei angehängt, direkt unter die
`setInterval`-Zeile.

```javascript
var agentSocket = new WebSocket("ws://localhost:3000/pacman");

agentSocket.onopen = function () {
    console.log("Mit Agent-Service verbunden");
};

agentSocket.onerror = function () {
    console.log("Keine Verbindung zum Agent-Service");
};
```

## Ergänzung 2 — Funktion `publishGameState()` (Zeilen 1777–1779)

Direkt unter `console.log("PACMAN_GAME_STATE:" + JSON.stringify(gameState));`.
Sendet den Spielzustand zusätzlich über den WebSocket, aber nur wenn die
Verbindung offen ist (`readyState === WebSocket.OPEN`).

```javascript
	if (agentSocket.readyState === WebSocket.OPEN) {
        agentSocket.send(JSON.stringify({ type: "state", state: gameState }));
    }
```

## Ergänzung 3 — Taktrate (Zeile 1848)

Die bestehende Zeile unter dem Kommentar `// Start periodic publication` wird
von `1000` auf `100` geändert. Der Agent braucht den Zustand häufiger als
einmal pro Sekunde, weil `move()` deutlich schneller läuft und Kreuzungen sonst
verpasst werden.

Vorher:

```javascript
setInterval(publishGameState, 1000);
```

Nachher:

```javascript
setInterval(publishGameState, 100);
```

## Ergänzung 4 — `onmessage`-Handler (Zeilen 1859–1886)

Wird unter Ergänzung 1 an das Dateiende angehängt. Nimmt die Aktionen des
Agent-Service entgegen, übersetzt den Richtungs-String über `DIRECTION_BITS` in
die Bitmaske des Spiels und legt sie in der globalen Variable `newkey` ab.

```javascript
var DIRECTION_BITS = { UP: 8, DOWN: 4, LEFT: 2, RIGHT: 1 };

agentSocket.onmessage = function (event) {
    var msg;

    try {
        msg = JSON.parse(event.data);
    } catch (error) {
        console.log("Ungueltige Nachricht vom Agent-Service");
        return;
    }

    if (!msg || msg.type !== "action") {
        return;
    }

    var bits = DIRECTION_BITS[msg.direction];

    if (typeof bits !== "number") {
        return;
    }

    newkey = bits;

    if (!moving && !won && !onPause && (divStart.visibility === "hidden" || speedball)) {
        sprite_pacman.move();
    }
};
```

### Warum `newkey` und nicht `movekey`

`movekey` ist kein Eingabe-, sondern ein Ergebniswert: `move()` setzt es in
Zeile 1035 selbst, nachdem es die Wunschrichtung in Zeile 1033 per
`pac_possibilities & newkey` gegen die Wände geprüft hat. Ein von außen
gesetztes `movekey` würde beim nächsten Tick überschrieben und die Wandprüfung
umgehen. Die Tastatursteuerung setzt in `keyLogic()` (Zeile 782) ebenfalls
`newkey` — der Agent benutzt also exakt denselben Eingang wie ein Tastendruck.

Daraus folgt auch, dass Richtungen, die in eine Wand zeigen, **nicht** abgefangen
werden müssen: Zeile 1037 lässt Pac-Man in `lastkey` weiterlaufen, während der
Wunsch in `newkey` liegen bleibt und an der nächsten passenden Kreuzung greift.

### Warum kein `movekey !== bits`-Guard

`keyLogic()` aktualisiert `newkey` nur, wenn die neue Richtung von `movekey`
abweicht. Für eine gehaltene Taste ist das richtig, für einen Agenten nicht: Er
entscheidet zehnmal pro Sekunde neu, und jede Entscheidung muss die vorige
ersetzen. Mit dem Guard konnte ein veralteter Wunsch in `newkey` liegen bleiben
und an der nächsten Kreuzung ausgelöst werden.

### Warum `!won && !onPause`

`move()` plant sich in Zeile 1128 nur unter `!won && !onPause` selbst nach. Die
Tastatur ist gegen `onPause` eine Ebene höher abgesichert, in `kd()` (Zeile 701),
wo bei laufender Pause ein anderer Zweig greift, der `keyLogic()` gar nicht
aufruft. Ohne diese beiden Flags wäre der `onmessage`-Handler die einzige Stelle
im Spiel, die während der Todespause oder nach dem letzten Leben noch Bewegung
auslösen kann.

---

## Bekannte Einschränkungen

**Geister werden nicht ausgewertet.** Der Agent liest `msg.state.ghosts` nicht
aus und weicht Geistern nicht aus; er verfolgt ausschließlich Coins.
`findEscapeDirection()` ist in `astar.js` implementiert und getestet, wird aber
bewusst noch nicht in `server.js` verwendet — der Einsatz ist für den Behavior
Tree vorgesehen.

**Pendeln an einzelnen Kreuzungen.** Der Spielzustand wird alle 100 ms gesendet,
Pac-Man durchquert eine Zelle aber in etwa 150 ms. Dadurch kann ein Kommando zu
spät eintreffen und der Agent an einer Kreuzung zwischen zwei Zellen hin- und
herpendeln. Gegenmaßnahme im Server: eine Stuck-Erkennung sperrt ein Ziel, das
über 30 Ticks aktiv bleibt, ohne dass die Distanz zu ihm je kleiner geworden
ist, für 10 Sekunden und weicht auf das nächste Ziel aus. Sind alle
verbleibenden Ziele gesperrt, wird die Sperrliste geleert.
