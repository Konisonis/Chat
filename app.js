let express = require('express');
let app = express();
let http = require('http').Server(app);
let io = require('socket.io')(http);

let fs = require('fs');//TODO


let date = new Date();

//contains Sockets for quick access with username
let connectedUsers = {};

//contains usernames for a list of usernames
let allUsernames = [];


//enable access to the public folder
app.use("/public", express.static(__dirname + "/public"));

//routes
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});


//Socket.io
io.on('connection', (socket) => {

    //on client disconnect
    socket.on('disconnect', () => {
        removeUser(socket);
        io.emit('user list', allUsernames);

    });

    //receiving a chat message
    socket.on('chat message', (message) => {
        let user = socket.user;
        let msg = message;
        if (socket.user && message) {
            allUsernames.forEach((username) => {
                let userSocket = connectedUsers[username];
                if (userSocket) {
                    userSocket.emit('chat message', user + ': ' + msg + '   |  ' + date.toUTCString()); // Only sends message to logged in users not to all

                }
            });
        }
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
                allUsernames.push(username);
                io.emit('chat message', 'User connected: ' + username);
                io.emit('user list', allUsernames);
            }
        }
        catch (err) {
            console.log(err);
        }

    });

    //client demands list of connected users
    socket.on('user list', (callback) => {
        callback(allUsernames);
    });

    //Send message only to one specific client
    socket.on('private message', (msg, receiver) => {
        //connectedUsers contains the sockets from each logged in user
        let receiverSocket = connectedUsers[receiver];
        let user = socket.user;
        if (receiverSocket && msg) {
            receiverSocket.emit('chat message', 'PRIVATE MESSAGE ' + user + ': ' + msg + '   |  ' + date.toUTCString());
        }
    });

    socket.on('file', (file, callback) => {
        callback();
        io.emit('file', file);
        fs.writeFile("mandala.png", file, (err) => {
            if (err) {
                throw err;
            }
            console.log("The file was saved!");
        });
    });

});

function removeUser(socket) {
    //remove username from allUsernames array
    let index = allUsernames.findIndex((username) => {
        return username === socket.user;
    });
    if (index > -1) {
        allUsernames.splice(index, 1);
    }

    //remove Socket from connectedUsers JSON
    if (connectedUsers[socket.user]) {
        connectedUsers[socket.user] = undefined;
        io.emit('chat message', socket.user + ' disconnected');
    }
}


//starts server on part 3000
http.listen(3000, () => {
    console.log('listening on *:3000');
});