const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const port = process.env.PORT || 4001;
const index = require("./routes/index");

const app = express();

app.use(index);

app.use('/images', express.static('images'));

const server = http.createServer(app);
server.listen(port, () => console.log(`Listening on port ${port}`));
const io = socketIo(server);

let usersSessions = [];


const shuffle = array => {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}


const startGame = io => {
  // Randomly choose the first player
  console.log(usersSessions);
  
  io.sockets.emit('player', usersSessions[Math.floor(Math.random() * 2)]);
  io.sockets.emit('images', shuffle([1,2,3,4,5,6,1,2,3,4,5,6]));
}

io.on("connection", socket => {

  // Send pseudo of the user to the front
  const waitPseudo = () => new Promise(resolve => {
    socket.on('pseudo', pseudo => {
      usersSessions.push({
        pseudo,
        id: socket.id
      });
      resolve();
    });
  });

  // Start a game
  waitPseudo().then(() => {
    if (usersSessions.length === 2) {
      io.sockets.emit('startGame', 'The game is starting !');
  
      startGame(io);
    }
  })

  socket.on('cardSelected', ({imageId, pairId}) => {
    console.log('card '+ imageId+ ' with pair '+ pairId+' selected');
    io.sockets.emit('returnCard', {imageId, pairId});
  })

  
  socket.on("disconnect", () => {
    console.log("Client disconnected");
    // Remove user from active sessions
    usersSessions.splice(usersSessions.indexOf(usersSessions.find(session => session.id === socket.id)), 1);
  });

});