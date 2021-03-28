/*
 * Library for storing and editing data
 */

// Dependencies
const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

// Container for the module (to be exported)

const lib = {};

// Base directory of the data folder
lib.basedir = path.join(__dirname, '/../.data/');
// write data to a file
lib.create = (dir, file, data, callback) => {
    // open the file for writing
    fs.open(`${lib.basedir}${dir}/${file}.json`, 'wx', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            // Convert data to string
            const stringData = JSON.stringify(data);
            // write to file and close it
            fs.writeFile(fileDescriptor, stringData, (err) => {
                if (!err) {
                    fs.close(fileDescriptor, (err) => {
                        if (!err) {
                            callback(false);
                        } else {
                            callback('Error closing new file');
                        }
                    });
                } else {
                    callback('Error writing to new file');
                }
            })
        } else {
            callback('Could not create new file, it may already exist');
        }
    })
};

// Read data from a file
lib.read = (dir, file, callback) => {
    fs.readFile(`${lib.basedir}${dir}/${file}.json`, 'utf8', (err, data) => {
        if(!err && data) {
            const parsedData = helpers.parseJsonToObject(data);
            callback(false, parsedData);
        } else {
            callback(err, data);
        }
    });
};

// Update data inside a file
lib.update = (dir, file, data, callback) => {
    // open the file for writing
    fs.open(`${lib.basedir}${dir}/${file}.json`, 'r+', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            const stringData = JSON.stringify(data);
            // truncate the file...
            fs.ftruncate(fileDescriptor, (err) => {
                if (!err) {
                    // Write to the file and close it.
                    fs.writeFile(fileDescriptor, stringData, (err) => {
                        if (!err) {
                            fs.close(fileDescriptor, (err) => {
                                if (!err) {
                                    callback(false);
                                } else {
                                    callback('Error closing the file.')
                                }
                            })

                        } else {
                            callback('Error writing to the file.')
                        }
                    });

                } else {
                    callback('Error truncating file');
                }
            })

        } else {
            callback('Could not open the file for updating, it may not exist yet.');
        }
    });

};
// deleting a file
lib.delete = (dir, file, callback) => {
    // unlink the file
    fs.unlink(`${lib.basedir}${dir}/${file}.json`, (err) => {
        if(!err) {
            callback(false);
        } else {
            callback('unable to delete file');
        }
    });
}


// Export the module
module.exports = lib;