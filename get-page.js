// Kluge to avoid redownloading during development

var fs = require('fs'),
    path = require('path'),
    crypto = require('crypto'),
    request = require('request');

module.exports = function (url, callback) {
    var hash = crypto.createHash('md5').update(url).digest('hex'),
        file = path.join(__dirname, 'cache', hash);
    if (fs.existsSync(file)) {
        fs.readFile(file, callback);
    }
    else {
        request(url, function (err, response, body) {
            if (err) {
                return callback(err);
            }
            if (response.statusCode != 200) {
                return callback('status code ' + response.statusCode);
            }
            fs.writeFile(file, body, function (err) {
                if (err) {
                    return callback(err);
                }
                callback(null, body);
            });
        })
    }
};
