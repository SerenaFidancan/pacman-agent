const { findClosestTarget } = require("./astar");

const grid = [
    [1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1]
];

const state = {
    pacman: { gridX: 1.0, gridY: 1.0 },
    remainingPills: [
        { gridX: 2.9, gridY: 1.0, type: "pill" },
        { gridX: 4.6, gridY: 3.0, type: "powerpill" }
    ]
};

const coinTargets = state.remainingPills.map((pill) => {
    return {
        x: Math.round(pill.gridX),
        y: Math.round(pill.gridY),
        type: pill.type
    };
});

const start = {
    x: Math.round(state.pacman.gridX),
    y: Math.round(state.pacman.gridY)
};

const result = findClosestTarget(grid, start, coinTargets);

console.log("Ergebnis:", result);

function buildAction(grid, pacman, pills) {
    const start = {
        x: Math.round(pacman.gridX),
        y: Math.round(pacman.gridY)
    };

    const targets = pills
        .map((pill) => {
            return {
                x: Math.round(pill.gridX),
                y: Math.round(pill.gridY),
                type: pill.type
            };
        })
        .filter((target) => {
            return target.x !== start.x || target.y !== start.y;
        });

    const result = findClosestTarget(grid, start, targets);

    if (result === null || result.nextStep === null) {
        return null;
    }

    return { type: "action", direction: result.nextStep };
}

const onCoinState = {
    pacman: { gridX: 3.0, gridY: 1.0 },
    remainingPills: [
        { gridX: 3.0, gridY: 1.0, type: "pill" },
        { gridX: 5.0, gridY: 3.0, type: "powerpill" }
    ]
};

const onCoinStart = {
    x: Math.round(onCoinState.pacman.gridX),
    y: Math.round(onCoinState.pacman.gridY)
};

const onCoinTargetsRaw = onCoinState.remainingPills.map((pill) => {
    return {
        x: Math.round(pill.gridX),
        y: Math.round(pill.gridY),
        type: pill.type
    };
});

console.log(
    "Roh (ohne Filter):",
    findClosestTarget(grid, onCoinStart, onCoinTargetsRaw)
);
console.log(
    "Gesendete Aktion :",
    buildAction(grid, onCoinState.pacman, onCoinState.remainingPills)
);
