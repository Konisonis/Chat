/*
* Authors:
* "Robin Schramm 761392",
  "Konstantin Rosenberg 761385"
* */

const express = require('express');
const app = express();
const http = require('http').Server(app);
var https = require("https");
const io = require('socket.io')(http);

const ss = require('socket.io-stream');

//table to access sockets with username ==> {username:socket}
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

    //-------------------handle login and logout

    //new client log-in
    socket.on('login', (username, callback) => {
        //if username is already taken
        try {
            //username already in use, the user is already logged in or not valid
            if (connectedUsers[username] || socket.user || !username) {
                callback(false);
                //if username is accepted and login was successful
            } else {
                socket.user = username;
                //tell the client then login was successful
                callback(true);
                connectedUsers[username] = socket;
                userConnects(username);

                socket.emit('user list', createListWithUserNames());
                socket.broadcast.emit('user joined', username);
            }
        }
        catch (err) {
            console.log(err);
        }
    });

    //on client disconnect
    socket.on('disconnect', () => {
        removeUser(socket);
    });

    //-------------------Streaming files

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
            if (key === data.receiver || key === socket.user) {
                let outgoingstream = ss.createStream();
                if (userSocket) {
                    ss(userSocket).emit('private file', outgoingstream, {
                        sender: socket.user,
                        timeStamp: new Date().toUTCString(),
                        name: data.name,
                        size: data.size,
                        type: data.type,
                        receiver: data.receiver
                    });
                    stream.pipe(outgoingstream);
                }
            }
        });
    });

    //-------------------handle messages

    //receiving a chat message
    socket.on('chat message', (message) => {
        let user = socket.user;
        getMood(message,user);
        if (socket.user && message) {
            Object.entries(connectedUsers).forEach(([key, value]) => {  //key => username, value=> socket
                let userSocket = connectedUsers[key];
                if (userSocket) {
                    userSocket.emit('chat message', {timeStamp: new Date().toUTCString(), sender: user, message: message}); // Only sends message to logged in users not to all
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

//remove Socket from connectedUsers JSON-Object
function removeUser(socket) {
    if (connectedUsers[socket.user]) {
        delete connectedUsers[socket.user];
        userDisconnects(socket.user);
    }
}

//notfy clinets that a user has disconnected
function userDisconnects(user) {
    Object.entries(connectedUsers).forEach(([key, socket]) => { //key => username, value=> socket
        if (socket) {
            socket.emit('user left', socket.user);
            socket.emit('chat message', {timeStamp: new Date().toUTCString(), sender: user, message: 'DISCONNECTED'}); //TODO put 'user left' and chat message togehter
        }
    });
}

//notify clients that a new user has connected
function userConnects(user) {
    Object.entries(connectedUsers).forEach(([key, socket]) => { //key => username, value=> socket
        if (socket) {
            socket.emit('chat message', {timeStamp: new Date().toUTCString(), sender: user, message: 'CONNECTED'});
        }
    });
}

function createListWithUserNames() {
    let list = [];
    Object.entries(connectedUsers).forEach(([key, value]) => { //key => username, value=> socket
        list.push(key);
    });
    return list;
}

function getMood(text,user) {
    let options = {
        "method": "POST",
        "hostname":
            "peaceful-morse.eu-de.mybluemix.net",
        "path": [
            "tone"
        ],
        "headers": {
            "Content-Type": "application/json",
            "cache-control": "no-cache",
            "Postman-Token": "86b5ff66-dd88-4c0f-a537-94ddc842c919"
        }
    };

    let req = https.request(options,  (res)=> {
        let chunks = [];

        res.on("data", (chunk)=> {
            chunks.push(chunk);
        });

        res.on("end", () =>{
            let body = Buffer.concat(chunks);
            console.log(body.toString());
            Object.entries(connectedUsers).forEach(([key, socket]) => { //key => username, value=> socket
                if (socket) {
                    socket.emit('mood', {timeStamp: new Date().toUTCString(), mood: body.toString(), user:user});
                }
            });
        });
    });
    req.write(JSON.stringify({ texts:
            [text] }));
    req.end();
}


let port = process.env.PORT || 3000;
//starts server on part 3000
http.listen(port, () => {
    console.log('listening on *: ' + port);
});