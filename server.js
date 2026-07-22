const { WebSocketServer } = require("ws");

const {
    findClosestTarget,
    findEscapeDirection
} = require("./astar");

const PORT = 3000;

const STUCK_LIMIT = 30;
const BLOCK_DURATION_MS = 10000;

let lastTargetKey = null;
let lastDistance = null;
let sameTargetTicks = 0;

const blockedTargets = new Map();

function targetKey(x, y) {
    return x + "," + y;
}

const wss = new WebSocketServer({
    port: PORT,
    path: "/pacman"
});


let cachedGrid = null;
let cachedWallCount = 0;

function buildGrid(walls) {
    if (!walls || walls.length === 0) {
        return null;
    }

    let maxX = 0;
    let maxY = 0;

    for (const wall of walls) {
        const x = Math.round(wall.gridX);
        const y = Math.round(wall.gridY);

        if (x > maxX) {
            maxX = x;
        }

        if (y > maxY) {
            maxY = y;
        }
    }

    const grid = [];


    for (let y = 0; y <= maxY; y++) {
        const row = [];

        for (let x = 0; x <= maxX; x++) {
            row.push(0);
        }

        grid.push(row);
    }

    for (const wall of walls) {
        const x = Math.round(wall.gridX);
        const y = Math.round(wall.gridY);

        if (
            y >= 0 &&
            y < grid.length &&
            x >= 0 &&
            x < grid[y].length
        ) {
            grid[y][x] = 1;
        }
    }

    return grid;
}

function printGrid(grid) {
    console.log("Grid:");

    for (const row of grid) {
        const line = row
            .map((cell) => {
                return cell === 1 ? "#" : ".";
            })
            .join("");

        console.log(line);
    }
}

console.log(
    "Server laeuft auf ws://localhost:" +
    PORT +
    "/pacman"
);

wss.on("connection", (socket) => {
    console.log("Client verbunden");

    socket.on("message", (data) => {
        try {
            const msg = JSON.parse(data.toString());

            if (msg.type !== "state") {
                return;
            }

            const walls = msg.state.walls || [];

            if (
                cachedGrid === null ||
                walls.length !== cachedWallCount
            ) {
                cachedGrid = buildGrid(walls);
                cachedWallCount = walls.length;

                if (cachedGrid !== null) {
                    console.log(
                        cachedGrid.length +
                        " Zeilen, " +
                        cachedGrid[0].length +
                        " Spalten"
                    );

                    printGrid(cachedGrid);

                    console.log("Pac-Man Rohwerte:", {
                        x: msg.state.pacman.x,
                        y: msg.state.pacman.y,
                        gridX: msg.state.pacman.gridX,
                        gridY: msg.state.pacman.gridY
                    });

                    if (walls.length > 0) {
                        console.log("Erste Wand Rohwerte:", {
                            x: walls[0].x,
                            y: walls[0].y,
                            gridX: walls[0].gridX,
                            gridY: walls[0].gridY
                        });
                    }
                }
            }

            const grid = cachedGrid;

            const pacmanDirection = msg.state.pacman.direction;

            let pacmanX;
            let pacmanY;

            if (pacmanDirection === "R") {
                pacmanX = Math.floor(msg.state.pacman.gridX);
                pacmanY = Math.round(msg.state.pacman.gridY);
            } else if (pacmanDirection === "L") {
                pacmanX = Math.ceil(msg.state.pacman.gridX);
                pacmanY = Math.round(msg.state.pacman.gridY);
            } else if (pacmanDirection === "D") {
                pacmanX = Math.round(msg.state.pacman.gridX);
                pacmanY = Math.floor(msg.state.pacman.gridY);
            } else if (pacmanDirection === "U") {
                pacmanX = Math.round(msg.state.pacman.gridX);
                pacmanY = Math.ceil(msg.state.pacman.gridY);
            } else {
                pacmanX = Math.round(msg.state.pacman.gridX);
                pacmanY = Math.round(msg.state.pacman.gridY);
            }

            let currentCell;

            if (
                grid !== null &&
                pacmanY >= 0 &&
                pacmanY < grid.length &&
                pacmanX >= 0 &&
                pacmanX < grid[pacmanY].length
            ) {
                currentCell = grid[pacmanY][pacmanX];
            } else {
                currentCell = undefined;
            }

            let fieldStatus;

            if (currentCell === 0) {
                fieldStatus = "frei";
            } else if (currentCell === 1) {
                fieldStatus = "Wand";
            } else {
                fieldStatus = "außerhalb des Grids";
            }

            console.log(
                `Pac-Man auf (${pacmanX}, ${pacmanY}), Feld: ${fieldStatus}`
            );

            if (grid !== null) {
                const remainingPills =
                    msg.state.remainingPills || [];

                const now = Date.now();

                for (const [blockedKey, expiresAt] of blockedTargets) {
                    if (expiresAt <= now) {
                        blockedTargets.delete(blockedKey);
                    }
                }

                const reachableTargets = remainingPills
                    .map((pill) => {
                        return {
                            x: Math.round(pill.gridX),
                            y: Math.round(pill.gridY),
                            type: pill.type
                        };
                    })
                    .filter((target) => {
                        return (
                            target.x !== pacmanX ||
                            target.y !== pacmanY
                        );
                    });

                const unblockedTargets = reachableTargets.filter((target) => {
                    return !blockedTargets.has(
                        targetKey(target.x, target.y)
                    );
                });

                let coinTargets;

                if (unblockedTargets.length === 0) {
                    blockedTargets.clear();
                    coinTargets = reachableTargets;
                } else {
                    coinTargets = unblockedTargets;
                }

                const start = { x: pacmanX, y: pacmanY };

                const result = findClosestTarget(
                    grid,
                    start,
                    coinTargets
                );

                if (result === null) {
                    lastTargetKey = null;
                    lastDistance = null;
                    sameTargetTicks = 0;

                    console.log(
                        `Kein erreichbarer Coin (${coinTargets.length} Pills, Pac-Man auf (${pacmanX}, ${pacmanY}))`
                    );
                } else {
                    const currentTargetKey = targetKey(
                        result.target.x,
                        result.target.y
                    );

                    if (currentTargetKey === lastTargetKey) {
                        if (
                            lastDistance !== null &&
                            result.distance < lastDistance
                        ) {
                            lastDistance = result.distance;
                            sameTargetTicks = 1;
                        } else {
                            sameTargetTicks++;
                        }
                    } else {
                        lastTargetKey = currentTargetKey;
                        lastDistance = result.distance;
                        sameTargetTicks = 1;
                    }

                    if (sameTargetTicks > STUCK_LIMIT) {
                        blockedTargets.set(
                            currentTargetKey,
                            now + BLOCK_DURATION_MS
                        );

                        console.log(
                            `Ziel (${result.target.x}, ${result.target.y}) gesperrt fuer ${BLOCK_DURATION_MS / 1000}s nach ${STUCK_LIMIT} Ticks ohne Ankunft`
                        );

                        sameTargetTicks = 0;
                    }

                    console.log(
                        `Ziel (${result.target.x}, ${result.target.y}) [${result.target.type}], Distanz: ${result.distance}, Richtung: ${result.nextStep}`
                    );

                    if (result.nextStep !== null) {
                        socket.send(
                            JSON.stringify({
                                type: "action",
                                direction: result.nextStep
                            })
                        );
                    }
                }
            }
        } catch (error) {
            console.log(
                "Nachricht konnte nicht verarbeitet werden."
            );

            console.log(error.message);
        }
    });

    socket.on("close", () => {
        console.log("Client getrennt");
    });

    socket.on("error", (error) => {
        console.log("WebSocket-Fehler:", error.message);
    });
});