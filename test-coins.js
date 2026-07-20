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
