const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const util = require('./util');

// res

const port = process.env.PORT || 4001;
const index = require("./routes/index");
const app = express();

// Allow all
app.use(function (req, res, next) {

  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', 'https://www.fabienmackowiak.com');

  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader('Access-Control-Allow-Credentials', true);

  // Pass to next layer of middleware
  next();
});

app.use(index);

app.use('/images', express.static('images'));

const server = http.createServer(app);
server.listen(port, () => console.log(`Listening on port ${port}`));
const io = socketIo(server);

let waitingRoom = [];
let rooms = [];

// Creqte random Id
const ID = function () {
  // Math.random should be unique because of its seeding algorithm.
  // Convert it to base 36 (numbers + letters), and grab the first 9 characters
  // after the decimal.
  return '_' + Math.random().toString(36).substr(2, 9);
};

const startGame = socket => {
  // Add the two players in a room
  let roomID = ID();
  rooms.push({
    roomID,
    currentPlayer: {},
    cardCounter: 0,
    pairs: [],
    cardCounter: [],
    currentPlayer: {},
    players: [...waitingRoom]
  });

  // Reset the waiting room
  waitingRoom = [];


  let userRoom = util.getUserRoom(rooms, socket);

  // Make them leave the queue room
  var manageRoomsChangement = new Promise(resolve => {
    io.to('queue').clients(function (error, clients) {
      if (clients.length > 0) {
        clients.forEach(function (socket_id) {
          // Leave the queue room
          io.sockets.sockets[socket_id].leave('queue');

          // Add the two queue sockets into the appropriate room

          io.sockets.sockets[socket_id].join('room' + roomID);
        });
      }
    });
    resolve();
  });

  // When the users leaved the queue room and joined the appropriate room
  manageRoomsChangement.then(() => {
    // Randomly choose the first player
    userRoom.currentPlayer = userRoom.players[Math.floor(Math.random() * 2)];
    sendPlayer(userRoom.currentPlayer, socket);

    io.to('room' + userRoom.roomID).emit('images', util.shuffle([1, 2, 3, 4, 5, 6, 7, 1, 2, 3, 4, 5, 6, 7]));
  })


}

const sendPlayer = (currentPlayer, socket) => {
  let userRoom = util.getUserRoom(rooms, socket);
  io.to('room' + userRoom.roomID).emit('player', currentPlayer);
}

const changePlayer = (io, socket) => {
  let userRoom = util.getUserRoom(rooms, socket);
  const nextPlayer = userRoom.players.find(player => player.id != userRoom.currentPlayer.id);

  userRoom.currentPlayer = nextPlayer;
  sendPlayer(userRoom.currentPlayer, socket);
}


const closeRoom = socket => {
  let userRoom = util.getUserRoom(rooms, socket);

  var indexOfRoom = rooms.indexOf(userRoom);


  // Inform the room that his opponnent leaved
  io.to('room' + userRoom.roomID).emit('game:cancelled');


  if (userRoom) {

    // Disconnect all clients that was in this room
    io.to('room' + userRoom.roomID).clients(function (error, clients) {
      if (error) throw error;
      for (let i = 0; i < clients.length; i++) {
        io.sockets.connected[clients[i]].disconnect(true)
      }
    });

    // Delete the room


    rooms.splice(indexOfRoom, 1);

  }
}

//

io.on("connection", socket => {
  // Send pseudo of the user to the front
  socket.on('pseudo', pseudo => {
    // Add the new player to queue
    waitingRoom.push({
      pseudo,
      id: socket.id,
      points: 0
    });

    socket.join('queue');

    // If there is two players  that are in queue, create a room and start the game
    if (waitingRoom.length === 2) {
      io.to('queue').emit('startGame', waitingRoom);

      startGame(socket);
    }
  });

  // When user select a card
  socket.on('cardSelected', ({
    imageId,
    pairId
  }) => {
    let userRoom = util.getUserRoom(rooms, socket);

    // If the selected card hasn't already be found
    if (!util.containsObject(pairId, userRoom.pairs)) {

      userRoom.cardCounter.push({
        imageId,
        pairId
      });


      // If 2 cards has been returned, check if they are equal
      if (userRoom.cardCounter.length == 2) {

        // If yes, just push a new pair and let the cards like that, but reset the userRoom.cardCounter.
        if (userRoom.cardCounter[0].pairId === userRoom.cardCounter[1].pairId) {
          userRoom.pairs.push({
            player: userRoom.currentPlayer,
            pairId
          });
          userRoom.cardCounter = [];

          // Add new point to the user, and send the user object to the front in order to render the new score
          for (let i = 0; i < userRoom.players.length; i++) {
            const player = userRoom.players[i];

            if (player.pseudo == userRoom.currentPlayer.pseudo) {
              player.points++;
            }
          }
          io.to('room' + userRoom.roomID).emit('score:add', userRoom.players);
        }

        // If no, just reset the number of cards and reset them.
        else {
          // Send images to reset
          io.to('room' + userRoom.roomID).emit('card:reset', userRoom.cardCounter);


          // Reset the images stored
          userRoom.cardCounter = [];
        }

        changePlayer(io, socket);

      }

      io.to('room' + userRoom.roomID).emit('returnCard', {
        imageId,
        pairId
      });
    }

    if (userRoom.pairs.length == 7) {
      var winner = util.getWinner(userRoom.pairs);

      io.to('room' + userRoom.roomID).emit('game:winner', winner.pseudo);
    }

  });

  // Change turn
  socket.on('turn:change', () => {
    changePlayer(io, socket);
  })

  socket.on("disconnect", () => {
    let isUserWaiting = false;

    // Check if the user is on waiting room
      for (let i = 0; i < waitingRoom.length; i++) {
          if (waitingRoom[i].id === socket.id) {
            isUserWaiting = true;
          }
      }
  
    // If the user was on queue, leave the queue
    if (isUserWaiting) {
      // Get the user object in waiting room
      let userObject;
      waitingRoom.forEach((user => {
        if (user.id == socket.id) {
          userObject = user;
        }
      }));

      waitingRoom.splice(waitingRoom.indexOf(userObject), 1);

    }
    // If user was in a game, close the room 
    else {
      closeRoom(socket);
    }
  });

});