/*
 * Primary file for the API
 *
 */

// Dependencies

const http = require("http");
const https = require("https");
const url = require("url");
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./lib/config');
const handlers = require('./lib/handlers');
const helpers = require("./lib/helpers");
const SERVER_STATES = require('./lib/constants').SERVER_STATES;
const fs = require('fs');

// Instantiating the http server
const httpServer = http.createServer((req, res) => {
    unifiedServer(req, res);
});

// Start the http server.
httpServer.listen(config.httpPort, () => {
    console.log(`The server is running on port ${config.httpPort} in '${config.envName}' mode now\n`);
});

// Instantiating the https server
const httpsServerOptions = {
    'key': fs.readFileSync('./https/key.pem'),
    'cert': fs.readFileSync('./https/cert.pem')
};
const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
    unifiedServer(req, res);
});

// Start the https server.
httpsServer.listen(config.httpsPort, () => {
    console.log(`The server is running on port ${config.httpsPort} in '${config.envName}' mode now\n`);
});


// All the server logic for both http and https servers.
const unifiedServer = (req, res) => {
    // Get the URL and parse it
    const parsedUrl = url.parse(req.url, true);

    if (req.url === '/favicon.ico') {
        res.writeHead(SERVER_STATES.OK, {'Content-Type': 'image/x-icon'});
        res.end();
        return;
    }
    // Get the path
    const trimmedPath = parsedUrl.pathname.replace(/^\/+|\/+$/g, '');

    // get the http method
    const method = req.method.toLocaleLowerCase();

    // get the query string
    const queryStringObject = parsedUrl.query;

    // get the headers
    const headers = req.headers;

    // get the payload if any
    const decoder = new StringDecoder('utf-8');
    let payload = '';
    req.on('data', (data) => {
        payload += decoder.write(data);
    });

    req.on('end', () => {
        payload += decoder.end();

        // Choose the handler this request is should go to. If one is not found
        // send to the notfound handler.
        // fo appease the / case condition.
        let checkPath = trimmedPath;
        if(checkPath.indexOf('/') !== -1) {
            checkPath = trimmedPath.substr(0, trimmedPath.indexOf('/'));
        }
        const chosenHandler = typeof (router[checkPath]) !== 'undefined' ? router[checkPath] :
            handlers.notFound;

        // construct the data object to send to the handler
        const data = {
            'trimmedPath': trimmedPath,
            'queryStringObject': queryStringObject,
            'method': method,
            'headers': headers,
            'payload': helpers.parseJsonToObject(payload)
        };
        // route the request specified in the router.
        chosenHandler(data, (status, payload) => {
            // Use the status code called back by the handler, or default to 200
            status = typeof (status) == 'number' ? status : SERVER_STATES.OK;

            //  Use the payload called back by the handler, or default to an empty object.
            payload = typeof (payload) == 'object' ? payload : {};
            // convert the payload object into a string
            const payloadString = JSON.stringify(payload);

            // return the response
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(status);
            res.end(payloadString);
            // Log the request path
            console.log('Returning this response: ', status, payloadString);
        });
    });

    // define a request router
    const router = {
        'ping': handlers.ping,
        'users' : handlers.users,
        'tokens': handlers.tokens,
        'checks' : handlers.checks
    };

};


