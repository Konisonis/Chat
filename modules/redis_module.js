const {URL} = require("url");
const redis = require("redis");
const expressSession = require('express-session');
const RedisStore = require('connect-redis')(expressSession);

const connectionString = 'redis://admin:FNMPXESFEWLOUXKH@portal31-10.bmix-eude-yp-b9583787-c860-4775-bf63-8b1bd8af652f.4244332677.composedb.com:18717';


//Session store for Redis
let rClient = redis.createClient(connectionString, {
    tls: {servername: new URL(connectionString).hostname}
});
let sessionStore = new RedisStore({client:rClient});


//session cookie
const session = expressSession({
    store:sessionStore,
    key: 'JSESSIONID', // use a sticky session to make sockets work
    secret: 'arbitrary-secret',
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        secure: false
    },
    saveUninitialized: true,
    resave: true
});

//Redis Pub client
let pub = redis.createClient(connectionString, {
    tls: {servername: new URL(connectionString).hostname}
});

//Redis Sub client
let sub = redis.createClient(connectionString, {
    tls: {servername: new URL(connectionString).hostname}
});

module.exports = {session,pub,sub};

