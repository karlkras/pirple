/**
 * create and export configuration variables
 *
 */

// Container for all the environments.
const environments = {};

// Staging (default) environment;
environments.staging = {
    'httpPort' : 3000,
    'httpsPort' : 3001,
    'envName' : 'staging',
    'hashingSecret' : 'thisIsASecret',
    'maxChecks' : 5
};

// Production object
environments.production = {
    'httpPort' : 5000,
    'httpsPort' : 5001,
    'envName' : 'production',
    'hashingSecret' : 'thisIsASecret',
    'maxChecks' : 5
};

// Determine which environment was passed as a command-line argument
let currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : 'staging';


// check if the environment stated exists and export the module
module.exports = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] :
    environments.staging;
