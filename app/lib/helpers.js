// does some stuff to help us across the server.

const crypto = require('crypto');
const config = require('./config');


// container for all the helpers.

const helpers = {};


// create a sha256 hash
helpers.hash = (clearPassword) => {
    if(typeof(clearPassword) == 'string' && clearPassword.length > 0) {
        return crypto.createHmac('sha256', config.hashingSecret).update(clearPassword).digest('hex');
    } else {
        return false;
    }
};

/**
 * Generates a randomimzed alphe-numeric string of a request character length.
 *
 * @param numberOfCharacters The number of characters to use in the random string (must be a number greater than 0).
 * @returns {string} The random string.
 * @throws Error if the numberOfCharacters argument provided was incorrectly stated.
 */
helpers.createRandomString = (numberOfCharacters) => {
    if(typeof(numberOfCharacters) === 'number' && numberOfCharacters > 0 ) {
        return Array.from(Array(numberOfCharacters), () => Math.floor(Math.random() * 36).toString(36)).join('');
    } else {
        throw new Error(`Illegal value for numberOfCharacters : ${numberOfCharacters}`);
    }
};

// Parse a JSON string to an object without throwing an exception.
helpers.parseJsonToObject = (str) => {
    try {
        return JSON.parse(str);
    } catch (e) {
        return {};
    }
};








module.exports = helpers;