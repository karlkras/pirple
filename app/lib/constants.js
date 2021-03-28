const SERVER_STATES = {
    'OK': 200,
    'BADREQUEST' : 400,
    'FORBIDDEN' : 403,
    'NOTFOUND': 404,
    'NOTALLOWED': 405,
    'INTERNALERROR' : 500
};

const handlerNames = {
    'USERS' : "users",
    'TOKENS' : 'tokens',
    'CHECKS' : 'checks'
}

module.exports = {
    'SERVER_STATES': SERVER_STATES,
    'HANDLER_NAMES' : handlerNames
};