const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const port = process.env.PORT || 4001;
const index = require("./routes/index");

const app = express();
app.use(index);

const server = http.createServer(app);
server.listen(port, () => console.log(`Listening on port ${port}`));
const io = socketIo(server);

let usersSessions = [];

const startGame = socket => {
  
}

io.on("connection", socket => {

  socket.on('pseudo', pseudo => {
    usersSessions.push({
      pseudo,
      id: socket.id
    });
  });

  
  if (usersSessions.length === 1) {
    io.sockets.emit('startGame', 'The game is starting !');

    startGame(socket);
  }
  
  socket.on("disconnect", () => {
    console.log("Client disconnected");
    // Remove user from active sessions
    usersSessions.splice(usersSessions.indexOf(usersSessions.find(session => session.id === socket.id)), 1);
  });
});