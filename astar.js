const DIRECTIONS = [
    { name: "UP", dx: 0, dy: -1 },
    { name: "DOWN", dx: 0, dy: 1 },
    { name: "LEFT", dx: -1, dy: 0 },
    { name: "RIGHT", dx: 1, dy: 0 },
];

function isWalkable(grid, x, y) {
    if (!grid || y < 0 || y >= grid.length) {
        return false;
    }
    if (x < 0 || x >= grid[y].length) {
        return false;
    }
    return grid[y][x] === 0;
}

const h = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const key = (x, y) => x + "," + y;
function findPath(grid, start, goal) {
    if (!isWalkable(grid, start.x, start.y)) {
        return null;
    }

    if (!isWalkable(grid, goal.x, goal.y)) {
        return null;
    }

    const open = [
        {
            x: start.x,
            y: start.y
        }
    ];

    const cameFrom = new Map();

    const startKey = key(start.x, start.y);

    const g = new Map();
    g.set(startKey, 0);

    const f = new Map();
    f.set(startKey, h(start, goal));

    while (open.length > 0) {
      
        let bestIndex = 0;

        for (let i = 1; i < open.length; i++) {
            const currentKey = key(open[i].x, open[i].y);
            const bestKey = key(open[bestIndex].x, open[bestIndex].y);

            const currentF = f.get(currentKey) ?? Infinity;
            const bestF = f.get(bestKey) ?? Infinity;

            if (currentF < bestF) {
                bestIndex = i;
            }
        }

        const current = open.splice(bestIndex, 1)[0];

        // Prüfen
        if (current.x === goal.x && current.y === goal.y) {
            const path = [current];
            let currentPathPosition = current;

            while (cameFrom.has(key(currentPathPosition.x, currentPathPosition.y))) {
                currentPathPosition = cameFrom.get(
                    key(currentPathPosition.x, currentPathPosition.y)
                );

                path.unshift(currentPathPosition);
            }

            if (path.length < 2) {
                return {
                    distance: 0,
                    nextStep: null
                };
            }

            const nextPosition = path[1];

            const direction = DIRECTIONS.find((item) => {
                return (
                    start.x + item.dx === nextPosition.x &&
                    start.y + item.dy === nextPosition.y
                );
            });

            return {
                distance: path.length - 1,
                nextStep: direction ? direction.name : null
            };
        }

        for (const direction of DIRECTIONS) {
            const nextX = current.x + direction.dx;
            const nextY = current.y + direction.dy;

            if (!isWalkable(grid, nextX, nextY)) {
                continue;
            }

            const currentKey = key(current.x, current.y);
            const nextKey = key(nextX, nextY);

            const currentG = g.get(currentKey) ?? Infinity;
            const newG = currentG + 1;
            const oldG = g.get(nextKey) ?? Infinity;
        
            if (newG < oldG) {
                cameFrom.set(nextKey, current);

                g.set(nextKey, newG);

                f.set(nextKey, newG + h(
                    { x: nextX, y: nextY },
                    goal
                ));

                const isAlreadyOpen = open.some((position) => {
                    return position.x === nextX && position.y === nextY;
                });

                if (!isAlreadyOpen) {
                    open.push({
                        x: nextX,
                        y: nextY
                    });
                }
            }
        }
    }

    // Es wurde kein erreichbarer Weg gefunden
    return null;
}
function findClosestTarget(grid, start, targets) {
    let bestResult = null;

    for (const target of targets) {
        const pathResult = findPath(grid, start, target);

        if (pathResult === null) {
            continue;
        }

        if (
            bestResult === null ||
            pathResult.distance < bestResult.distance
        ) {
            bestResult = {
                target: target,
                distance: pathResult.distance,
                nextStep: pathResult.nextStep
            };
        }
    }

    return bestResult;
}

function findEscapeDirection(grid, pacman, ghosts) {
    if (!ghosts || ghosts.length === 0) {
        return null;
    }

    let bestDirection = null;
    let bestDistance = -1;

    for (const direction of DIRECTIONS) {
        const nextX = pacman.x + direction.dx;
        const nextY = pacman.y + direction.dy;

        if (!isWalkable(grid, nextX, nextY)) {
            continue;
        }

        let nearestGhostDistance = Infinity;

        for (const ghost of ghosts) {
            const pathResult = findPath(
                grid,
                { x: nextX, y: nextY },
                { x: ghost.x, y: ghost.y }
            );

            if (
                pathResult !== null &&
                pathResult.distance < nearestGhostDistance
            ) {
                nearestGhostDistance = pathResult.distance;
            }
        }

        if (nearestGhostDistance > bestDistance) {
            bestDistance = nearestGhostDistance;
            bestDirection = direction.name;
        }
    }

    return bestDirection;
}

module.exports = {
    findPath,
    findClosestTarget,
    findEscapeDirection,
    DIRECTIONS
};