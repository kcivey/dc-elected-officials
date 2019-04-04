#!/usr/bin/env node

const url = require('url');
const cheerio = require('cheerio');
const request = require('./request');
const ancHomeUrl = 'https://anc.dc.gov/';

request(ancHomeUrl).then(html => cheerio.load(html))
    .then(process);

async function process($) {
    const links = $('ul.menu-sub > li.leaf > a').get();
    for (const a of links) {
        const $a = $(a);
        const anc = $a.text().trim();
        let m = anc.match(/^ANC\s+([1-8][A-G])$/);
        if (!m) {
            continue;
        }
        const ancUrl = url.resolve(ancHomeUrl, $a.attr('href'));
        $ = await getCheerio(ancUrl);
        console.log(anc);
    }
}

function getCheerio(requestOptions) {
    return request(requestOptions)
        .then(html => cheerio.load(html));
}
