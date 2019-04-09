#!/usr/bin/env node

const url = require('url');
const cheerio = require('cheerio');
const _ = require('lodash');
const csvStringify = require('csv-stringify/lib/sync');
const request = require('./request');
const ancHomeUrl = 'https://anc.dc.gov/';

request(ancHomeUrl).then(html => cheerio.load(html))
    .then(getAncData)
    .then(function (data) {
        console.log(csvStringify(
            data,
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
    });

async function getAncData($) {
    const links = $('ul.menu-sub > li.leaf > a').get();
    const data = [];
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
                record.chair = 'Y';
            }
            else {
                record.chair = '';
            }
            m = record.name.match(/^\s*(\S.*?)\s+(\S+?)(?:,? (Jr|Sr|I+V?)\.?)?\s*$/);
            if (m) {
                record.first_name = m[1];
                record.last_name = m[2];
                record.suffix = m[3];
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
            data.push(record);
        }
    }
    return data;
}

function getCheerio(requestOptions) {
    return request(requestOptions)
        .then(html => cheerio.load(html));
}
