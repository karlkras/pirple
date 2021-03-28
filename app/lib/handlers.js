// Handlers for the app.
// define the path handlers

// dependencies
const SERVER_STATES = require('./constants').SERVER_STATES;
const HANDLER_NAMES = require('./constants').HANDLER_NAMES;
const _data = require('./data');
const helpers = require("./helpers");
const config = require('./config');

// define the handlers
const handlers = {};

handlers._global = {};

handlers._global.validatePhone = (orgPhone) => {
    return typeof (orgPhone) == 'string' && orgPhone.replace(/\D+/g, "").trim().length === 10 ?
        orgPhone.replace(/\D+/g, "").trim() : false;
}

handlers._global.areAnyArgsFalse = (args) => {
    let hasFalse = false
    if(typeof(args) == 'object' && Object.keys(args).length > 0) {
        Object.keys(args).forEach((item) => {
            if(!args[item]) {
                hasFalse = true;
            }
        });
    }
    return hasFalse;
};

handlers._global.acceptableMethods = ['post', 'get', 'put', 'delete'];

handlers._checks = {};


// container for the tokens container.
handlers._tokens = {};

handlers._tokens.confirmedData = (data) => {
    const theData = {};

    theData.phone = handlers._global.validatePhone(data.phone);

    theData.password = typeof (data.password) == 'string' && data.password.trim().length > 0 ?
        data.password.trim() : false;

    return theData;
}

handlers._checks.CHECKS_LIMITS = {
    "minimum": 1,
    "maximum" : 5
}

handlers._checks.confirmedData = (data) => {
    const theData = {};

    theData.protocol = typeof (data.protocol) == 'string' && ['http', 'https'].includes(data.protocol.toLocaleLowerCase().trim()) ?
        data.protocol.toLocaleLowerCase().trim() : false;

    theData.url = typeof (data.url) == 'string' && data.url.trim().length > 0 ? data.url.trim() : false;

    theData.method = typeof (data.method) == 'string' && handlers._global.acceptableMethods.includes(data.method.toLocaleLowerCase().trim()) ?
        data.method.toLocaleLowerCase().trim() : false;

    theData.successCodes = typeof (data.successCodes) == 'object' &&
        data.successCodes instanceof Array &&
        data.successCodes.length > 0 ? data.successCodes : false;

    theData.timeoutSeconds = typeof (data.timeoutSeconds) == 'number' &&
        data.timeoutSeconds % 1 === 0 &&
        (data.timeoutSeconds >= 1) &&
        (data.timeoutSeconds <= config.maxChecks) ?
        data.timeoutSeconds : false;

    return theData;
}


handlers._tokens.getTokenTime = () => Date.now() + 1000 * 60 * 60;

handlers._tokens.createToken = (phone, numberOfCharacters) => {
    return {
        'phone': phone,
        'id': helpers.createRandomString(numberOfCharacters),
        'expires': handlers._tokens.getTokenTime()
    }
}

// Verify that a given token is currently valid for a given user.
handlers._tokens.verifyToken = (id, phone, callback) => {
    if(id) {
        // Lookup the token
        _data.read(HANDLER_NAMES.TOKENS, id, (err, tokenData) => {
            if (!err && tokenData) {
                if (phone) {
                    // Check only that the token has not expired...
                    callback(tokenData.phone === phone && tokenData.expires > Date.now());
                } else {
                    // Check that the token is the given user and has not expired...
                    callback(tokenData.expires > Date.now());
                }
            } else {
                callback(false);
            }
        });
    } else {
        callback(false);
    }
};

handlers._tokens.getToken = (tokenId, callback) => {
    const token = typeof (tokenId) == 'string' ? tokenId : false;
    if (token) {
        _data.read(HANDLER_NAMES.TOKENS, token, (err, tokenData) => {
            if(!err && tokenData)
                callback(tokenData);
            else
                callback(false);
        });
    } else {
        callback(false);
    }

};

handlers[HANDLER_NAMES.CHECKS] = (data, callback) => {
    if (handlers._global.acceptableMethods.includes(data.method)) {
        handlers._checks[data.method](data, callback);
    } else {
        callback(SERVER_STATES.NOTALLOWED);
    }
}

/**
 * Checks - post
 * Required data - protocol, url, method, successCodes, timeoutSeconds
 * Optional data - none
 * @param data
 * @param callback
 */
handlers._checks.post = (data, callback) => {
    const theConfirmedData = handlers._checks.confirmedData(data.payload);
    const areRequirementsMet = !handlers._global.areAnyArgsFalse(theConfirmedData);
    if(areRequirementsMet) {
        // look up the user by token information.
        handlers._tokens.getToken(data.headers.token, (tokenData) => {
            if(tokenData) {
                // so now get the user...
                _data.read(HANDLER_NAMES.USERS, tokenData.phone, (err, userData) => {
                    if(!err && userData) {
                        const userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ?
                            userData.checks : [];
                        // verify that user has less than the maximum checks.
                        if(userChecks.length < config.maxChecks) {
                            // create the check object, and include the user's phone...
                            const checkObject = {
                                "id" : helpers.createRandomString(20),
                                'userPhone' : tokenData.phone,
                                "url" : theConfirmedData.url,
                                "method" : theConfirmedData.method,
                                "successCodes" : theConfirmedData.successCodes,
                                "timeoutSeconds" : theConfirmedData.timeoutSeconds
                            };
                            _data.create(HANDLER_NAMES.CHECKS, checkObject.id, checkObject, (err) => {
                                if(!err) {

                                } else {
                                    callback(SERVER_STATES.INTERNALERROR, {"Error" : `Could not create new check.`});
                                }
                            })
                            callback(SERVER_STATES.OK);
                        } else {
                            callback(SERVER_STATES.BADREQUEST, {"Error" : `The user already has the maximum number - (${config.maxChecks}) - of checks.`})
                        }

                    } else {
                        callback(SERVER_STATES.FORBIDDEN);
                    }
                })

            } else {
                callback(SERVER_STATES.FORBIDDEN);
            }
        });
    } else {
        callback(SERVER_STATES.BADREQUEST, {'Errpr' : `Missing required inputs, or inputs are invalid`})
    }

}

handlers._checks.get = (data, callback) => {
    callback(SERVER_STATES.OK);
}

handlers._checks.put = (data, callback) => {
    callback(SERVER_STATES.OK);
}

handlers._checks.delete = (data, callback) => {
    callback(SERVER_STATES.OK);
}

handlers[HANDLER_NAMES.TOKENS] = (data, callback) => {
    if (handlers._global.acceptableMethods.includes(data.method)) {
        handlers._tokens[data.method](data, callback);
    } else {
        callback(SERVER_STATES.NOTALLOWED);
    }
}

// Tokens - post
// Required data: phone, password
// optional data: none
handlers._tokens.post = (data, callback) => {
    //check that all required fields are filled out
    const theConfirmedData = handlers._tokens.confirmedData(data.payload);
    const areIncomplete = handlers._global.areAnyArgsFalse(theConfirmedData);

    if (!areIncomplete) {
        // Look up the user associated with the phone number... must exist.
        _data.read(HANDLER_NAMES.USERS, theConfirmedData.phone, (err, userData) => {
            // if err, this means the token doesn't exist. we can proceed.
            if (!err && userData) {
                // get the sent password and compare it to the stored password.
                if (userData.password === helpers.hash(theConfirmedData.password)) {
                    // if valid, create a new token with a random name. Set expiration date 1 hour in the future.
                    let tokenObject;
                    try {
                        tokenObject = handlers._tokens.createToken(theConfirmedData.phone, 20);
                        // store the token
                        _data.create(HANDLER_NAMES.TOKENS, tokenObject.id, tokenObject, (err) => {
                            if (!err) {
                                callback(SERVER_STATES.OK, tokenObject);
                            } else {
                                console.error(err);
                                callback(SERVER_STATES.INTERNALERROR, {'Error': `Couldn't create the new token`})
                            }
                        });
                    } catch (error) {
                        console.error(error.message);
                        callback(SERVER_STATES.INTERNALERROR, {'Error': `Couldn't create the new token`})
                    }
                } else {
                    callback(SERVER_STATES.BADREQUEST, {"Error": `Password did not match the user's current stored password`});
                }
            } else {
                callback(SERVER_STATES.BADREQUEST, {"Error": `Could not find the specified user`});
            }
        });

    } else {
        callback(SERVER_STATES.BADREQUEST, {'Error': 'Error with payload. Requires phone and password'});
    }
};

// Tokens - get
// Required data: id
handlers._tokens.get = (data, callback) => {
    // Check that the id is valid.
    const id = typeof (data.queryStringObject.id) === 'string' && data.queryStringObject.id.length === 20 ?
        data.queryStringObject.id : false;
    if (id) {
        _data.read(HANDLER_NAMES.TOKENS, id, (err, tokenData) => {
            if (!err && tokenData) {
                callback(SERVER_STATES.OK, tokenData);
            } else {
                callback(SERVER_STATES.NOTFOUND, {'Error': "Token not found"})
            }
        });
    } else {
        callback(SERVER_STATES.BADREQUEST, {'Error': 'Invalid or missing required field'});
    }
};

// Tokens - put
// Required data: id, extend
// optional data: none
handlers._tokens.put = (data, callback) => {
    const id = typeof (data.payload.id) === 'string' && data.payload.id.trim().length === 20 ?
        data.payload.id.trim() : false;
    // noinspection RedundantConditionalExpressionJS
    const extend = typeof (data.payload.extend) === 'boolean' && data.payload.extend === true ? true : false;
    if (id && extend) {
        // first get the token...
        _data.read(HANDLER_NAMES.TOKENS, id, (err, tokenData) => {
            if (!err && tokenData) {
                // check if token has already expired... if not extend.
                if (tokenData.expires > Date.now()) {
                    tokenData.expires = handlers._tokens.getTokenTime();
                    _data.update(HANDLER_NAMES.TOKENS, id, tokenData, (err) => {
                        if (!err) {
                            callback(SERVER_STATES.OK);
                        } else {
                            console.error(err);
                            callback(SERVER_STATES.INTERNALERROR, {'Error': `Unable to update token.`})
                        }
                    });
                } else {
                    callback(SERVER_STATES.BADREQUEST, {'Error': 'Requested token has expired'});
                }

            } else {
                callback(SERVER_STATES.NOTFOUND, {'Error': `Token ${id} not found`});
            }
        });
    } else {
        callback(SERVER_STATES.BADREQUEST, {'Error': `Nothing to do.`});
    }
};

/**
 * Delete
 * required field : id
 *
 * @param data
 * @param callback
 */
handlers._tokens.delete = (data, callback) => {
    const id = parseDeleteKey(data.trimmedPath, 20);
    if (id) {
        // see if it exists...
        _data.read(HANDLER_NAMES.TOKENS, id, (err) => {
            if (err) {
                callback(SERVER_STATES.NOTFOUND, {'Error': `Token with id of ${id} not found.`});
            } else {
                _data.delete(HANDLER_NAMES.TOKENS, id, (err) => {
                    if (!err) {
                        callback(SERVER_STATES.OK);
                    } else {
                        console.error(err);
                        callback(SERVER_STATES.INTERNALERROR, {'Error': 'Unable to delete token.'})
                    }
                });
            }
        })
    } else {
        callback(SERVER_STATES.BADREQUEST, {"Error": `Missing required data.`})
    }
};


// container for the users sub methods
handlers._users = {};

handlers._users.confirmedData = (data) => {
    const theData = {};
    theData.firstName = typeof (data.firstName) == 'string' && data.firstName.trim().length > 0 ?
        data.firstName.trim() : false;

    theData.lastName = typeof (data.lastName) == 'string' && data.lastName.trim().length > 0 ?
        data.lastName.trim() : false;

    theData.phone = handlers._global.validatePhone(data.phone);

    theData.password = typeof (data.password) == 'string' && data.password.trim().length > 0 ?
        data.password.trim() : false;

    theData.tosAgreement = typeof (data.tosAgreement) == 'boolean' && data.tosAgreement === true ?
        data.tosAgreement : false;

    return theData;
}

handlers._users.getConfirmedPutItems = (data) => {
    const confirmedItems = {};
    if (data.firstName) {
        confirmedItems.firstName = data.firstName;
    }
    if (data.lastName) {
        confirmedItems.lastName = data.lastName;
    }
    if (data.password) {
        confirmedItems.password = data.password;
    }
    return confirmedItems;
}

// users handler
handlers[HANDLER_NAMES.USERS] = (data, callback) => {
    if (handlers._global.acceptableMethods.includes(data.method)) {
        handlers._users[data.method](data, callback);
    } else {
        callback(SERVER_STATES.NOTALLOWED);
    }
}


// Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
handlers._users.post = (data, callback) => {
    //check that all required fields are filled out

    const theConfirmedData = handlers._users.confirmedData(data.payload);
    const areRequirementsComplete = !handlers._global.areAnyArgsFalse(theConfirmedData);
    if (areRequirementsComplete) {
        // make sure the user doesn't already exist.
        _data.read(HANDLER_NAMES.USERS, theConfirmedData.phone, (err) => {
            if (err) {
                // user doesn't exist, we can proceed...
                // hash the password
                const hashedPassword = helpers.hash(theConfirmedData.password);
                if (hashedPassword) {
                    const userObject = {
                        'firstName': theConfirmedData.firstName,
                        'lastName': theConfirmedData.lastName,
                        'phone': theConfirmedData.phone,
                        'tosAgreement': theConfirmedData.tosAgreement,
                        'password': hashedPassword
                    };
                    _data.create(HANDLER_NAMES.USERS, theConfirmedData.phone, userObject, (err) => {
                        if (err) {
                            callback(SERVER_STATES.INTERNALERROR, {"Error": 'There was a problem creating the user'});
                        } else {
                            callback(SERVER_STATES.OK, {"Success": 'User created successfully'})
                        }
                    });
                } else {
                    callback(SERVER_STATES.INTERNALERROR, {'Error': `Unable to hash the user's credentials`});
                }

            } else {
                // user already exists, throw an error.
                callback(SERVER_STATES.BADREQUEST, {"Error": `User with phone ${theConfirmedData.phone} already exists.`});
            }
        });
    } else {
        callback(SERVER_STATES.BADREQUEST, {'Error': 'Error with payload. Requires firstName, lastName, phone, password, and tosAgreement'});
    }
};


// Users - get
// required data: phone
// optional data: none
handlers._users.get = (data, callback) => {
    // Check that the phone number is valid.
    const phone = handlers._global.validatePhone(data.queryStringObject.phone);
    if (phone) {
        // Get the token from the headers
        const token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
        if (token) {
            // verify that the given token is valid for the phone number.
            handlers._tokens.verifyToken(token, phone, (tokenValid) => {
                if (tokenValid) {
                    _data.read(HANDLER_NAMES.USERS, phone, (err, data) => {
                        if (data) {
                            // remove the hashed password before returning to the requester.
                            delete data.password;
                            callback(SERVER_STATES.OK, data);
                        } else {
                            callback(SERVER_STATES.NOTFOUND, {'Error': "User not found"});
                        }
                    });
                } else {
                    callback(SERVER_STATES.FORBIDDEN, {'Error': `Access denied.`});
                }
            });
        } else {
            callback(SERVER_STATES.BADREQUEST, {"Error": "Token not provided"});
        }

    } else {
        callback(SERVER_STATES.BADREQUEST, {'Error': 'Invalid or missing required field'});
    }
};


/**
 * users: put
 * required data: phone (identifies the user)
 * optional data: firstName, lastName, password (as least one optional must be specified)
 *
 * @param data
 * @param callback
 */
handlers._users.put = (data, callback) => {
    // check for the required field
    const theConfirmedData = handlers._users.getConfirmedPutItems(
        handlers._users.confirmedData(data.payload));
    const phone = handlers._global.validatePhone(data.payload.phone);
    if (phone) {
        // Get the token from the headers
        const token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
        if (token) {
            handlers._tokens.verifyToken(token, phone, (tokenValid) => {
                if (tokenValid) {
                    if (Object.keys(theConfirmedData).length > 0) {
                        // need to check that the user exists...
                        _data.read(HANDLER_NAMES.USERS, phone, (err, userData) => {
                            if (!err && userData) {
                                Object.keys(theConfirmedData).forEach((item) => {
                                    if (item === 'password') {
                                        userData[item] = helpers.hash(theConfirmedData[item]);
                                    } else {
                                        userData[item] = theConfirmedData[item];
                                    }
                                });
                                _data.update(HANDLER_NAMES.USERS, phone, userData, (err) => {
                                    if (!err) {
                                        callback(SERVER_STATES.OK);
                                    } else {
                                        console.error(err);
                                        callback(SERVER_STATES.INTERNALERROR, {"Error": "Unable to update user"});
                                    }
                                });
                            } else {
                                callback(SERVER_STATES.NOTFOUND, {"Error": "User not found"});
                            }
                        })
                    } else {
                        callback(SERVER_STATES.BADREQUEST, {"Error": "Nothing to update"});
                    }
                } else {
                    callback(SERVER_STATES.FORBIDDEN, {'Error': `Access denied.`})
                }
            });
        } else {
            callback(SERVER_STATES.BADREQUEST, {"Error": "Token not provided"});
        }
    } else {
        callback(SERVER_STATES.BADREQUEST, {"Error": "No phone number for ID provided"});
    }

};

/**
 * Delete
 *
 * required field : phone
 * @param data
 * @param callback
 */
handlers._users.delete = (data, callback) => {
    const phone = parseDeleteKey(data.trimmedPath, 10);
    if (phone) {
        // Get the token from the headers
        const token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
        if (token) {
            handlers._tokens.verifyToken(token, phone, (tokenValid) => {
                if (tokenValid) {
                    // see if it exists...
                    _data.read(HANDLER_NAMES.USERS, phone, (err) => {
                        if (err) {
                            callback(SERVER_STATES.NOTFOUND, {'Error': `User with phone ${phone} not found.`});
                        } else {
                            _data.delete(HANDLER_NAMES.USERS, phone, (err) => {
                                if (!err) {
                                    callback(SERVER_STATES.OK);
                                } else {
                                    console.log(err);
                                    callback(SERVER_STATES.INTERNALERROR, {'Error': 'Unable to delete user.'})
                                }
                            });
                        }
                    });
                } else {
                    callback(SERVER_STATES.FORBIDDEN, {'Error': `Access denied.`})
                }
            });
        } else {
            callback(SERVER_STATES.BADREQUEST, {"Error": "Token not provided"});
        }
    } else {
        callback(SERVER_STATES.BADREQUEST, {"Error": `Phone number either not provided or incorrect format.`})
    }
};

const parseDeleteKey = (path, length = null) => {
    let id = "";
    if (path.indexOf('/') !== -1) {
        id = path.substr(path.indexOf('/') + 1);
    }
    if (length !== null) {
        return typeof (id) === 'string' && id.trim().length === length ?
            id.trim() : false;
    } else {
        return typeof (id) === 'string' ? id.trim() : false;
    }
}


// ping handler
handlers.ping = (data, callback) => {
    callback(SERVER_STATES.OK);
};

// not found handler
handlers.notFound = (data, callback) => {
    callback(SERVER_STATES.NOTFOUND);
};


module.exports = handlers;
