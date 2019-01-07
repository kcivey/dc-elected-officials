#!/usr/bin/env node

var fs = require('fs'),
    yaml = require('js-yaml'),
    personDir = __dirname + '/data/person',
    file = __dirname + '/data/person.json',
    personData = {};

fs.readdirSync(personDir).forEach(function (file) {
    if (!/\.yaml$/.test(file)) {
        return;
    }
    var d = yaml.safeLoad(fs.readFileSync(personDir + '/' + file));
    personData[d.code] = d;
});

fs.writeFileSync(file, JSON.stringify(personData));
