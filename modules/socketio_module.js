const fs = require('fs');
const ss = require('socket.io-stream');
const database = require('./database_module');
const moodService = require('./mood_module');
const faceRecognition = require('./face_recognition_module');
const {URL} = require("url");
const sharedsession = require("express-socket.io-session");


const connectionString = 'rediss://admin:FNMPXESFEWLOUXKH@portal31-10.bmix-eude-yp-b9583787-c860-4775-bf63-8b1bd8af652f.4244332677.composedb.com:18717';


const redis = require("redis");


let sub = redis.createClient(connectionString, {
    tls: {servername: new URL(connectionString).hostname}
});

let pub = redis.createClient(connectionString, {
    tls: {servername: new URL(connectionString).hostname}
});


sub.subscribe('public message');
sub.subscribe('private message');
sub.subscribe('user login');
sub.subscribe('user disconnected');


sub.on('message', (channel, message) => {
    try {
        let data = JSON.parse(message);


        switch (channel) {

            case 'public message':
                Object.entries(myConnectedUsers).forEach(([key, value]) => {  //key => username, value=> socket
                    let userSocket = myConnectedUsers[key];
                    if (userSocket) {
                        userSocket.emit('chat message', data); // Only sends message to logged in users not to all
                    }
                });
                break;
            case 'user login':
                userConnects(data);
                break;
            case 'user disconnected':
                userDisconnects(data.name);
                break;
            case 'private message':
                let receiverSocket = myConnectedUsers[data.receiver];
                if (receiverSocket) {
                    receiverSocket.emit('private message', data);
                }
                break;

        }
    } catch (err) {
        console.log(err);
    }
});


//table to access sockets with username ==> {username:socket}
let myConnectedUsers = {};

//For building a list of users in scaled-out mode
let allConnectedUsers = {};


function activateSockets(io) {

    //Socket.io
    io.on('connection', (socket) => {
        let data = socket.handshake.session.userdata;
        if(data){
            let image = data.image ? new Buffer(data.image.data,'base64'): undefined;
            socket.emit('chat dispatch',{success:true,image:image},data.username);
            myConnectedUsers[data.username] = socket;
            socket.user = data.username;
            socket.emit('user list', createListWithUserNames());
            let userData = JSON.stringify({name:data.username, image:data.image});
            pub.publish('user login',userData );
        }

        //new user registration
        socket.on('registration', (username, password, callback) => {
            try {//status status.success is true if registration was successfull
                database.register(username, password, socket.image).then((status) => {
                    callback(status.success, status.message);
                });

            } catch (err) {
                console.log(err);
            }
        });
        //on receiving a profile picture
        ss(socket).on('profile picture', (stream, data) => {
            try {
                let path = './pictures/' + data.name;
                //faceRecognition.hasFace(stream);
                let writeStream = fs.createWriteStream(path);
                stream.pipe(writeStream);

                writeStream.on('finish', () => {
                    faceRecognition.hasFace(path).then((result) => {
                        if (result) {
                            socket.image = readImageFile(path);
                        } else {
                            socket.image = undefined;
                        }
                        fs.unlink(path, () => {
                        });
                        socket.emit('picture with face', result);

                    });
                });
            } catch (err) {
                console.log('There was a problem with the picture valiation');
                console.log(err);
            }
        });
        //-------------------handle login
        //new client log-in
        socket.on('login', (username, password, callback) => {

            //if username is already taken
            try {
                //username already in use, the user is already logged in or not valid
                if (myConnectedUsers[username] || socket.user || !username) {
                    callback(false);
                } else {
                    //username has been accepted and login was successful
                    database.login(username, password).then((status) => {
                        if (status.success) {
                            socket.user = username;
                            socket.image = status.image;
                            //tell the client then login was successful
                            callback(status);
                            myConnectedUsers[username] = socket;
                            socket.emit('user list', createListWithUserNames());
                            let joinMessage = JSON.stringify({name: username, image: socket.image});

                            socket.handshake.session.userdata = {username:username,password:password,image:socket.image};
                            socket.handshake.session.save();

                            pub.publish('user login', joinMessage);

                        } else {
                            callback(status);
                        }
                    });
                }
            }
            catch (err) {
                console.log(err);
            }
        });

        //-------------------Handle disconnect
        //on client disconnect
        socket.on('disconnect', () => {
            removeUser(socket);
            let data = JSON.stringify({name: socket.user});
            pub.publish('user disconnected', data);
        });

        //-------------------Streaming files

        //receiving a public file
        ss(socket).on('public file', (stream, data) => {
            Object.entries(myConnectedUsers).forEach(([key, userSocket]) => { //key => username, value=> socket
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
            Object.entries(myConnectedUsers).forEach(([key, userSocket]) => { //key => username, value=> socket
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

            //pub.publish('a nice channel','Hallo redis Welt');

            //Feature to shoot down a client
            if (message === 'shutdown') {
                throw 'Shut down';
            }


            let user = socket.user;
            if (corrupMessage(message)) {
                message = '';
            }

            if (socket.user && message) {
                moodService.getMood(message).then((mood) => {
                    let chatMessage = JSON.stringify({
                        timeStamp: new Date().toUTCString(),
                        sender: user,
                        message: message,
                        mood: mood
                    });
                    pub.publish('public message', chatMessage);
                });
            }
        });

        //Send a message only to one specific client
        socket.on('private message', (message, receiver) => {
            //myConnectedUsers contains the sockets from each logged in user

            if (corrupMessage(message)) {
                message = '';
            }


            let user = socket.user;
            if (message && user) {
                moodService.getMood(message).then((mood) => {
                    let data = {
                        receiver: receiver,
                        sender: user,
                        message: message,
                        timeStamp: new Date().toUTCString(),
                        mood: mood
                    };
                    //sender receives same message
                    socket.emit('private message', data);
                    data = JSON.stringify(data);
                    pub.publish('private message', data);
                });
            }
        });


    });

}

//remove Socket from myConnectedUsers JSON-Object
function removeUser(socket) {
    if (myConnectedUsers[socket.user]) {
        delete myConnectedUsers[socket.user];
    }
}

//notfy clinets that a user has disconnected
function userDisconnects(user) {
    if (allConnectedUsers[user]) {
        delete allConnectedUsers[user];
    }
    Object.entries(myConnectedUsers).forEach(([key, socket]) => { //key => username, value=> socket
        if (socket) {
            socket.emit('user left', user);
            socket.emit('chat message', {timeStamp: new Date().toUTCString(), sender: user, message: 'DISCONNECTED'}); //TODO put 'user left' and chat message togehter
        }
    });
}

//notify clients that a new user has connected
function userConnects(data) {
    data.image = new Buffer(data.image.data,'base64');
    Object.entries(myConnectedUsers).forEach(([key, socket]) => { //key => username, value=> socket
        if (socket) {
            socket.emit('chat message', {timeStamp: new Date().toUTCString(), sender: data.name, message: 'CONNECTED'});
            socket.emit('user joined', data);
        }
    });
    allConnectedUsers[data.name] = data;
}

function createListWithUserNames() {
    let list = [];
    Object.entries(allConnectedUsers).forEach(([key, value]) => { //key => username, value=> {name,image}
        list.push({name: key, image: value.image});
    });
    return list;
}

function readImageFile(file) {
    // read binary data from a file:
    const bitmap = fs.readFileSync(file);
    const buf = new Buffer(bitmap).toString('base64');
    return buf;
}

function corrupMessage(message) {
    return message.includes('<script' || 'script>' || 'scr=' || 'href=');
}


module.exports = {activateSockets};