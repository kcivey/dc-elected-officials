#!/usr/bin/env node

const fs = require('fs');
const assert = require('assert');
const cheerio = require('cheerio');
const _ = require('lodash');
const yaml = require('js-yaml');
const request = require('./lib/request');
const ancHomeUrl = 'https://oanc.dc.gov/landing-page/ancs-ward';
const ancYamlFile = __dirname + '/data/anc.yaml';

request(ancHomeUrl).then(html => cheerio.load(html))
    .then(getAncData)
    .then(writeYamlFile)
    .catch(console.error);

async function getAncData($home) {
    const links = $home('div.anc-item > div.uk-padding-remove > a').get();
    assert(links.length > 40, `Only ${links.length} ANCs found`);
    const data = {};
    for (const a of links) {
        const $a = $home(a);
        let m = $a.text()
            .trim()
            .match(/^ANC\s+[1-8][A-G]$/);
        if (!m) {
            continue;
        }
        console.log(m[0]);
        const ancUrl = new URL($a.attr('href'), ancHomeUrl).toString();
        const $ = await getCheerio(ancUrl); // eslint-disable-line require-atomic-updates
        const headers = $('table > thead > tr > th')
            .map(function (i, th) {
                return $(th).text()
                    .trim()
                    .toLowerCase();
            })
            .get();
        const rows = $('table > tbody > tr').get();
        assert(rows.length > 1, `Only ${rows.length} SMDs found`);
        for (const row of rows) {
            const values = $(row).find('td')
                .map(function (i, th) {
                    return $(th).text()
                        .trim();
                })
                .get();
            const record = _.zipObject(headers, values);
            if (!record.name) {
                continue;
            }
            m = record.name.match(/^(.+?)\s*((?:Vice )?Chairperson|Secretary|Treasurer)$/);
            if (m) {
                record.name = m[1];
                record.title = m[2];
                record.chair = m[2] === 'Chairperson';
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
            if (record.phone) {
                // Standardize phone number format
                m = record.phone.match(/^\W*(\d{3})\W+(\d{3})\W+(\d{4})\W*$/);
                if (m) {
                    record.phone = m[1] + '-' + m[2] + '-' + m[3];
                }
            }
            else { // phone is missing on some ANC pages
                record.phone = '';
            }
            if (/protected]$/.test(record.email)) {
                record.email = record.smd + '@anc.dc.gov';
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

function writeYamlFile(commissioners) {
    const oldYaml = fs.readFileSync(ancYamlFile);
    const oldCommissioners = yaml.safeLoad(oldYaml).commissioners;
    try {
        assert.deepStrictEqual(commissioners, oldCommissioners);
        return false; // unchanged
    }
    catch (err) {
        console.warn('Commissioners have changed');
    }
    const data = {
        updated: new Date().toISOString()
            .substr(0, 10),
        commissioners,
    };
    fs.writeFileSync(ancYamlFile, yaml.safeDump(data));
    return true;
}
