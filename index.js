'use strict';

var os = require('os');
var nodeStatic = require('node-static');
var http = require('http');
var https = require("https");
var socketIO = require('socket.io');
var fs = require("fs");
var fileServer = new(nodeStatic.Server)('./public');

var privateKey = fs.readFileSync("sslcert/learnomaprivate.key", "utf8");
var certificate = fs.readFileSync("sslcert/learnomacertificate.crt", "utf8");

var credentials = { key: privateKey, cert: certificate };

var app = https.createServer(credentials, function(req, res) {
  fileServer.serve(req, res);
}).listen(8080);

// var app = http.createServer(function(req, res) {
//   fileServer.serve(req, res);
// }).listen(8080);


var io = socketIO.listen(app);
io.sockets.on('connection', function(socket) {

  // convenience function to log server messages on the client
  function log() {
    var array = ['Message from server:'];
    array.push.apply(array, arguments);
    socket.emit('log', array);
  }

  socket.on('message', function(message) {
    log('Client said: ', message);
    // for a real app, would be room-only (not broadcast)
    socket.broadcast.emit('message', message);
  });

  socket.on('create or join', function(room) {
    log('Received request to create or join room ' + room);

    var clientsInRoom = io.sockets.adapter.rooms[room];
    var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
    log('Room ' + room + ' now has ' + numClients + ' client(s)');
    console.log("Room ", numClients);
    if (numClients === 0) {
      socket.join(room);
      log('Client ID ' + socket.id + ' created room ' + room);
      socket.emit('created', room, socket.id);

    } else {
      log('Client ID ' + socket.id + ' joined room ' + room);
      io.sockets.in(room).emit('join', room);
      socket.join(room);
      socket.emit('joined', room, " socket.id ", socket.id);
      io.sockets.in(room).emit('ready');
    } 
    // else { 
    //   // max two clients
    //   socket.emit('full', room);
    // }
  });

  socket.on('servercreate', function(room){
    var clientsInRoom = io.sockets.adapter.rooms[room];
    var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
    console.log("Room created >> ", numClients);

    socket.join(room);
      log('Client ID ' + socket.id + ' created room ' + room);
      socket.emit('created', room, socket.id);
  })

  socket.on('serverjoin', function(room){
    var clientsInRoom = io.sockets.adapter.rooms[room];
    var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;

    console.log("Room ", numClients);

    socket.join(room);
    io.sockets.in(room).emit('join', room);
    socket.join(room);
    socket.emit('joined', room, " socket.id ", socket.id);
    io.sockets.in(room).emit('ready');
  })

  socket.on('ipaddr', function() {
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      ifaces[dev].forEach(function(details) {
        if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
          socket.emit('ipaddr', details.address);
        }
      });
    }
  });

  socket.on('bye', function(){
    console.log('received bye');
  });

});
