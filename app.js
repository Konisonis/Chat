const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const SocketIOFile = require('socket.io-file');


//contains Sockets for quick access with username
let connectedUsers = {};

//contains usernames for a list of usernames
let allUsernames = [];


//enable access to the public folder and simplify node modules paths
app.use("/public", express.static(__dirname + "/public"));

app.use('/bootstrap-material', express.static(__dirname + '/node_modules/bootstrap-material-design'));


app.get('/socket.io.js', (req, res, next) => {
    return res.sendFile(__dirname + '/node_modules/socket.io-client/dist/socket.io.js');
});

app.get('/socket.io-file-client.js', (req, res, next) => {
    return res.sendFile(__dirname + '/node_modules/socket.io-file-client/socket.io-file-client.js');
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
                    userSocket.emit('chat message', {timeStamp: new Date().toUTCString(), sender: user, message: msg}); // Only sends message to logged in users not to all

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
                io.emit('chat message', {           //TODO not for everyone!!!
                    timeStamp: new Date().toUTCString(),
                    sender: socket.user,
                    message: 'CONNECTED'
                });
                io.emit('user list', allUsernames);
            }
        }
        catch (err) {
            console.log(err);
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

    let uploader = new SocketIOFile(socket, {
        // uploadDir: {			// multiple directories
        // 	music: 'data/music',
        // 	document: 'data/document'
        // },
        uploadDir: 'tmp',							// simple directory
        maxFileSize: 4194304, 						// 4 MB. default is undefined(no limit)
        chunkSize: 10240,							// default is 10240(1KB)
        transmissionDelay: 0,						// delay of each transmission, higher value saves more cpu resources, lower upload speed. default is 0(no delay)
        overwrite: false 							// overwrite file if exists, default is true.
    });

    //File upload handling
    uploader.on('start', (fileInfo) => {
    });
    uploader.on('stream', (fileInfo) => {
    });
    uploader.on('complete', (fileInfo) => {

    });
    uploader.on('error', (err) => {
    });
    uploader.on('abort', (fileInfo) => {
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
        io.emit('chat message', {timeStamp: new Date().toUTCString(), sender: socket.user, message: 'DISCONNECTED'});
    }
}


//starts server on part 3000
http.listen(3000, () => {
    console.log('listening on *:3000');
});