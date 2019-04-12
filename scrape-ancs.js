#!/usr/bin/env node

const url = require('url');
const fs = require('fs');
const cheerio = require('cheerio');
const _ = require('lodash');
const yaml = require('js-yaml');
// const csvStringify = require('csv-stringify/lib/sync');
const request = require('./request');
const ancHomeUrl = 'https://anc.dc.gov/';
const ancYamlFile = __dirname + '/data/anc.yaml';

request(ancHomeUrl).then(html => cheerio.load(html))
    .then(getAncData)
    .then(writeYamlFile);

async function getAncData($) {
    const links = $('ul.menu-sub > li.leaf > a').get();
    const data = {};
    for (const a of links) {
        const $a = $(a);
        let m = $a.text().trim().match(/^ANC\s+[1-8][A-G]$/);
        if (!m) {
            continue;
        }
        const ancUrl = url.resolve(ancHomeUrl, $a.attr('href'));
        $ = await getCheerio(ancUrl);
        const headers = $('table > thead > tr > th')
            .map((i, th) => $(th).text().trim().toLowerCase())
            .get();
        const rows = $('table > tbody > tr').get();
        for (const row of rows) {
            const values = $(row).find('td')
                .map((i, th) => $(th).text().trim())
                .get();
            const record = _.zipObject(headers, values);
            if (!record.name) {
                continue;
            }
            m = record.name.match(/^(.+?)\s+Chairperson$/);
            if (m) {
                record.name = m[1];
                record.chair = true;
            }
            else {
                record.chair = false;
            }
            m = record.name.match(/^(.+?)\s+(\S+?)(?:,?\s+(Jr|Sr|I+V?)\.?)?$/);
            if (m) {
                record.first_name = m[1];
                record.last_name = m[2];
                record.suffix = m[3] || '';
            }
            else {
                record.last_name = record.name;
                record.first_name = '';
                record.suffix = '';
            }
            delete record.name;
            m = record.address.match(/^(.*?)\s*Washington,?\s*(?:DC\s*)?(\d+)$/);
            if (m) {
                record.address = m[1];
                record.zip = m[2];
            }
            else {
                record.zip = '';
            }
            data[record.smd] = record;
        }
    }
    return data;
}

function getCheerio(requestOptions) {
    return request(requestOptions)
        .then(html => cheerio.load(html));
}

function writeYamlFile(data) {
    return new Promise(function (resolve, reject) {
        fs.writeFile(ancYamlFile, yaml.safeDump(data), function (err) {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}

/*
function writeCsv(data) {
    process.stdout.write(csvStringify(
        Object.values(data),
        {
            header: true,
            columns: [
                'smd',
                'last_name',
                'first_name',
                'suffix',
                'chair',
                'address',
                'zip',
                'phone',
                'email',
            ],
        }
    ));
}
*/
