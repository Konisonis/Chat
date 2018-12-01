const path = require('path');
const appDir = path.dirname(require.main.filename);


function activateRoutes(app,express) {
    //enable access to the public folder and simplify node modules paths
    app.use("/public", express.static(appDir + "/public"));
    app.use('/bootstrap-material', express.static(appDir + '/node_modules/bootstrap-material-design'));
    app.get('/socket.io-stream.js', (req, res, next) => {
        return res.sendFile(appDir + '/node_modules/socket.io-stream/socket.io-stream.js');
    });
    app.get('/DomainVerification.html', (req, res, next) => {
        return res.sendFile(appDir + '/DomainVerification.html');
    });
    app.get('/bootstrap-icons.scss', (req, res, next) => {
        return res.sendFile(appDir + '/node_modules/material-icons/iconfont/material-icons.scss');
    });
//routes
    app.get('/', (req, res) => {
        res.sendFile(appDir + '/views/index.html');
    });
}


module.exports = {activateRoutes};