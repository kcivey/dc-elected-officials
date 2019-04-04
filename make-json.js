#!/usr/bin/env node

const fs = require('fs');
const yaml = require('js-yaml');
const personDir = __dirname + '/data/person';
const file = __dirname + '/data/person.json';
const personData = {};

fs.readdirSync(personDir).forEach(file => {
    if (!/\.yaml$/.test(file)) {
        return;
    }
    const d = yaml.safeLoad(fs.readFileSync(personDir + '/' + file));
    personData[d.code] = d;
});

fs.writeFileSync(file, JSON.stringify(personData));
