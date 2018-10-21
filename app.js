const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const ss = require('socket.io-stream');
const path = require('path');
var fs = require('fs');


//contains Sockets for quick access with username
let connectedUsers = {};


//enable access to the public folder and simplify node modules paths
app.use("/public", express.static(__dirname + "/public"));

app.use('/bootstrap-material', express.static(__dirname + '/node_modules/bootstrap-material-design'));


app.get('/socket.io-stream.js', (req, res, next) => {
    return res.sendFile(__dirname + '/node_modules/socket.io-stream/socket.io-stream.js');
});


app.get('/bootstrap-icons.scss', (req, res, next) => {
    return res.sendFile(__dirname + '/node_modules/material-icons/iconfont/material-icons.scss');
});


//routes
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});


//Socket.io
io.on('connection', (socket) => {

    //receiving a public file
    ss(socket).on('public file', (stream, data) => {
        Object.entries(connectedUsers).forEach(([key, userSocket]) => { //key => username, value=> socket
            let outgoingstream = ss.createStream();
            if (userSocket) {
                ss(userSocket).emit('public file', outgoingstream, {
                    sender: socket.user,
                    timeStamp: new Date().toUTCString(),
                    name: data.name,
                    size: data.size,
                    type: data.type
                });
                stream.pipe(outgoingstream);
            }
        });
    });

    //receiving a private file
    ss(socket).on('private file', (stream, data) => {
        Object.entries(connectedUsers).forEach(([key, userSocket]) => { //key => username, value=> socket
            let outgoingstream = ss.createStream();
            if (userSocket) {
                ss(userSocket).emit('private file', outgoingstream, {
                    sender: socket.user,
                    timeStamp: new Date().toUTCString(),
                    name: data.name,
                    size: data.size,
                    type: data.type
                });
                stream.pipe(outgoingstream);
            }
        });
    });

    //For Streaming files


    //on client disconnect
    socket.on('disconnect', () => {
        removeUser(socket);
    });

    //new client log-in
    socket.on('login', (username, callback) => {
        //if username is already taken
        try {
            if (connectedUsers[username] || socket.user || !username) {
                callback(false);
                //if username is accepted and login was successful
            } else {
                socket.user = username;
                callback(true);
                connectedUsers[username] = socket;
                io.emit('chat message', {           //TODO not for everyone!!!
                    timeStamp: new Date().toUTCString(),
                    sender: socket.user,
                    message: 'CONNECTED'
                });
                socket.emit('user list', createListWithUserNames());
                socket.broadcast.emit('user joined', username);
            }
        }
        catch (err) {
            console.log(err);
        }
    });

    //receiving a chat message
    socket.on('chat message', (message) => {
        let user = socket.user;
        let msg = message;
        if (socket.user && message) {
            Object.entries(connectedUsers).forEach(([key, value]) => {  //key => username, value=> socket
                let userSocket = connectedUsers[key];
                if (userSocket) {
                    userSocket.emit('chat message', {timeStamp: new Date().toUTCString(), sender: user, message: msg}); // Only sends message to logged in users not to all
                }
            });
        }
    });

    //Send a message only to one specific client
    socket.on('private message', (msg, receiver) => {
        //connectedUsers contains the sockets from each logged in user
        let receiverSocket = connectedUsers[receiver];
        let user = socket.user;
        if (receiverSocket && msg && user) {
            let data = {
                receiver: receiver,
                sender: user,
                message: msg,
                timeStamp: new Date().toUTCString()
            };
            receiverSocket.emit('private message', data);
            //sender receives same message
            socket.emit('private message', data);
        }
    });

});

function removeUser(socket) {
    //remove Socket from connectedUsers JSON
    if (connectedUsers[socket.user]) {
        delete connectedUsers[socket.user];
        io.emit('user left', socket.user);
        io.emit('chat message', {timeStamp: new Date().toUTCString(), sender: socket.user, message: 'DISCONNECTED'}); //TODO not to everyone
    }
}

function createListWithUserNames() {
    let list = [];
    Object.entries(connectedUsers).forEach(([key, value]) => { //key => username, value=> socket
        list.push(key);
    });

    return list;
}


//starts server on part 3000
http.listen(3000, () => {
    console.log('listening on *:3000');
});