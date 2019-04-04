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
                    'SMD',
                    'Name',
                    'Chair',
                    'Address',
                    'Zip',
                    'Phone',
                    'Email',
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
            .map((i, th) => $(th).text().trim())
            .get();
        const rows = $('table > tbody > tr').get();
        for (const row of rows) {
            const values = $(row).find('td')
                .map((i, th) => $(th).text().trim())
                .get();
            const record = _.zipObject(headers, values);
            if (!record['Name']) {
                continue;
            }
            m = record['Name'].match(/^(.+?)\s+Chairperson$/);
            if (m) {
                record['Name'] = m[1];
                record['Chair'] = 'Y';
            }
            else {
                record['Chair'] = '';
            }
            m = record['Address'].match(/^(.*?)\s*Washington,?\s*(?:DC\s*)?(\d+)$/);
            if (m) {
                record['Address'] = m[1];
                record['Zip'] = m[2];
            }
            else {
                record['Zip'] = '';
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
