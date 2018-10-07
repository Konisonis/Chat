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

    //Send a message only to one specific client
    socket.on('private message', (msg, receiver) => {
        //connectedUsers contains the sockets from each logged in user
        let receiverSocket = connectedUsers[receiver];
        let user = socket.user;
        if (receiverSocket && msg && user) {
            receiverSocket.emit('private message', {
                receiver: receiver,
                sender: user,
                message: msg + '   |  ' + date.toUTCString()
            });
            //sender receives same message
            socket.emit('private message', {
                receiver: receiver,
                sender: user,
                message: msg + '   |  ' + date.toUTCString()
            });
        }
    });


    let files = {},
        struct = {
            name: null,
            type: null,
            size: 0,
            data: [],
            slice: 0
        };

    socket.on('slice upload', (data) => {
        if (!files[data.name]) {
            files[data.name] = Object.assign({}, struct, data);
            files[data.name].data = [];
        }
        //convert the ArrayBuffer to Buffer
        data.data = new Buffer(new Uint8Array(data.data));
        //save the data
        files[data.name].data.push(data.data);
        files[data.name].slice++;

        if (files[data.name].slice * 100000 >= files[data.name].size) {
            var fileBuffer = Buffer.concat(files[data.name].data);


            fs.writeFile(__dirname + '/tmp/' + data.name, fileBuffer, (err) => {
                delete files[data.name];
                if (err) {
                    console.log(err);
                    return socket.emit('upload error', err);
                }
                socket.emit('end upload');
            });
        } else {
            socket.emit('request slice upload', {
                currentSlice: files[data.name].slice
            });
        }
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