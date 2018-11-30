const csp = require('content-security-policy');
const helmet = require("helmet");


// content-security-policy
const cspPolicy = {
    'report-uri': '/reporting',
    'default-src': csp.SRC_NONE,
    'script-src': [ csp.SRC_SELF, csp.SRC_DATA ]
};

const globalCSP = csp.getCSP(csp.STARTER_OPTIONS);
const localCSP = csp.getCSP(cspPolicy);



function secureApp(app){

    app.use(helmet()); // Add Helmet as a middleware


// This will apply the security policy to all requests if no local policy is set
    app.use(globalCSP);

// This will apply the local security policy just to this path, overriding the global policy
    app.get('/local', localCSP, (req, res) => {
    });


}

module.exports = {secureApp};