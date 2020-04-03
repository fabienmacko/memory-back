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

const sendPlayer = (sessionObject, io) => {
  io.sockets.emit('player', sessionObject);
}

const startGame = io => {
  // Randomly choose the first player
  
  currentPlayer = usersSessions[Math.floor(Math.random() * 2)];
  
  sendPlayer(currentPlayer, io);
  io.sockets.emit('images', shuffle([1,2,3,4,5,6,1,2,3,4,5,6]));
}

const changePlayer = io => {
  const nextPlayer = usersSessions.filter(session => session.id != currentPlayer.id)[0];
  
  currentPlayer = nextPlayer;
  sendPlayer(currentPlayer, io);
}

const pairs = [];

let cardCounter = [];

let currentPlayer = {};

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
    
    // If pairs are empty
    if (pairs.length === 0) {
      // If the card has not already found
      if (true) {

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
          console.log(pairs.size);
          
        }

      io.sockets.emit('returnCard', {imageId, pairId});
      }
      
    }
    
  });

  // Change turn
  socket.on('turn:change', () => {
    changePlayer(io);
  })
  
  socket.on("disconnect", () => {
    console.log("Client disconnected");
    // Remove user from active sessions
    usersSessions.splice(usersSessions.indexOf(usersSessions.find(session => session.id === socket.id)), 1);
  });

});