/*
* Authors:
* "Robin Schramm 761392",
  "Konstantin Rosenberg 761385"
* */

const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const cookieParser = require('cookie-parser');
const sharedsession = require("express-socket.io-session");

//Own modules
const security = require('./modules/security_module');
const routes = require('./modules/routes_module');
const sockets = require('./modules/socketio_module');
const redisModule = require('./modules/redis_module');



//activate to recognize active session
io.use(sharedsession(redisModule.session));

//Set cookie for session affinity
app.use(redisModule.session);

//initialize sockets
sockets.activateSockets(io);


//activate routes
routes.activateRoutes(app, express);

//app security
security.secureApp(app);


let port = process.env.PORT || 3000;
//starts server on part 3000
http.listen(port, () => {
    console.log('listening on *: ' + port);
});