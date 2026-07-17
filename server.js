const { WebSocketServer } = require("ws");

const PORT = 3000;
const wss = new WebSocketServer({ port: PORT, path: "/pacman" });

console.log("Server laeuft auf ws://localhost:" + PORT + "/pacman");

wss.on("connection", (socket) => {
    console.log("Client verbunden");

    socket.on("message", (data) => {
        console.log("Nachricht:", data.toString());
    });

    socket.on("close", () => {
        console.log("Client getrennt");
    });
});