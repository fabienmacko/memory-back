// Utility methods
const containsObject = (pairId, array) => {
  var i;
  for (i = 0; i < array.length; i++) {
      if (array[i].pairId === pairId) {
          return true;
      }
  }

  return false;
}

const getWinner = arr => {
  return arr.sort((a,b) =>
  arr.filter(v => v.player.pseudo===a.player.pseudo).length
- arr.filter(v => v.player.pseudo===b.player.pseudo).length
).pop().player;
}

const getUserRoom = (rooms, socket) => {
  let userRoom = false;

  rooms.forEach((room => {
    room.players.forEach(player => {    
      if (player.id == socket.id) {
        userRoom = room;
      }
    });
  }));
  
  console.log(userRoom, 'UserRoom returned from the util function');
  
  return userRoom;
}


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

exports.shuffle = shuffle;
exports.getWinner = getWinner;
exports.containsObject = containsObject;
exports.getUserRoom = getUserRoom;