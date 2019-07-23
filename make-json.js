#!/usr/bin/env node

const fs = require('fs');
const yaml = require('js-yaml');
const camelizeObject = require('camelize');
const dataDir = __dirname + '/data';
const personDir = dataDir + '/person';
const personFile = dataDir + '/person.json';
const personData = {};
const ancYamlFile = dataDir + '/anc.yaml';
const ancJsonFile = dataDir + '/anc.json';

fs.readdirSync(personDir).forEach(file => {
    if (!/\.yaml$/.test(file)) {
        return;
    }
    const d = yaml.safeLoad(fs.readFileSync(personDir + '/' + file));
    personData[d.code] = camelizeObject(d);
});

fs.writeFileSync(personFile, JSON.stringify(personData));

const ancData = yaml.safeLoad(fs.readFileSync(ancYamlFile));
ancData.commissioners = Object.entries(ancData.commissioners).reduce(
    function (acc, [key, value]) {
        acc[key] = camelizeObject(value);
        return acc;
    },
    {}
);
fs.writeFileSync(ancJsonFile, JSON.stringify(ancData));
