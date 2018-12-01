/*
* Authors:
* "Robin Schramm 761392",
  "Konstantin Rosenberg 761385"
* */

const express = require('express');
const expressSession = require('express-session');
const app = express();

//Own modules
const security = require('./modules/security_module');
const routes = require('./modules/routes_module');
const sockets = require('./modules/socketio_module');



//Set cookie for session affinity
app.use(
    expressSession({
        key: 'JSESSIONID', // use a sticky session to make sockets work
        secret: 'arbitrary-secret',
        cookie: {
            maxAge: 24 * 60 * 60 * 1000, // 1 day
            secure: false
        },
        saveUninitialized: false,
        resave: false
    })
);

const http = require('http').Server(app);
const io = require('socket.io')(http);

//initialize sockets
sockets.activateSockets(io);

//activate routes
routes.activateRoutes(app,express);

//app security
security.secureApp(app);


let port = process.env.PORT || 3000;
//starts server on part 3000
http.listen(port, () => {
    console.log('listening on *: ' + port);
});