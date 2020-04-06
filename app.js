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

let usersSessions = [];

const sendPlayer = (sessionObject, io) => {
  
  io.sockets.emit('player', sessionObject);
}

const startGame = io => {
  // Randomly choose the first player
  
  currentPlayer = usersSessions[Math.floor(Math.random() * 2)];
  console.log('Send player executed from startGame');
  sendPlayer(currentPlayer, io);
  io.sockets.emit('images', util.shuffle([1,2,3,4,5,6,7,1,2,3,4,5,6,7]));
}

const changePlayer = io => {
  const nextPlayer = usersSessions.filter(session => session.id != currentPlayer.id)[0];
  
  currentPlayer = nextPlayer;
  console.log('Send player executed from changePlayer');
  sendPlayer(currentPlayer, io);
}

let pairs = [];

let cardCounter = [];

let currentPlayer = {};


const resetServerData = () => {
  pairs = [];

  cardCounter = [];

  currentPlayer = {};

  usersSessions = [];
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
  });

  // When user select a card
  socket.on('cardSelected', ({imageId, pairId}) => {
    
    // If the selected card hasn't already be found
    if (!util.containsObject(pairId, pairs)) {

        cardCounter.push({imageId, pairId});


        // If 2 cards has been returned, check if they are equal
        if (cardCounter.length == 2) {
          
          // If yes, just push a new pair and let the cards like that, but reset the cardCounter.
          if (cardCounter[0].pairId === cardCounter[1].pairId ) {
            pairs.push({currentPlayer, pairId});
            cardCounter = [];
          } 

          // If no, just reset the number of cards and reset them.
          else {
            // Send images to reset
            io.sockets.emit('card:reset', cardCounter);


            // Reset the images stored
            cardCounter = [];
          }
          
          changePlayer(io);
          
        }

      io.sockets.emit('returnCard', {imageId, pairId});
    }

    if (pairs.length == 7) {
      
      var winner = util.getWinner(pairs);
      
      io.sockets.emit('game:winner', winner.currentPlayer.pseudo);
      resetServerData();
    }
    
  });

  // Change turn
  socket.on('turn:change', () => {
    changePlayer(io);
  })
  
  socket.on("disconnect", () => {
    console.log("Client disconnected");
    resetServerData();
    // Remove user from active sessions
    usersSessions.splice(usersSessions.indexOf(usersSessions.find(session => session.id === socket.id)), 1);
  });

});