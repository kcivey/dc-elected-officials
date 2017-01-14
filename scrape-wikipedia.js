var url = require('url'),
    fs = require('fs'),
    cheerio = require('cheerio'),
    yaml = require('js-yaml'),
    moment = require('moment'),
    getPage = require('./get-page'),
    personDir = __dirname + '/data/person',
    categoryUrl = 'https://en.wikipedia.org/wiki/Category:Members_of_the_Council_of_the_District_of_Columbia';

getPage(categoryUrl, function (err, body) {
    if (err) {
        throw err;
    }
    var $ = cheerio.load(body);
    $('div.mw-category a').each(function () {
        var $a = $(this),
            personUrl = url.resolve(categoryUrl, $a.attr('href')),
            personName = $a.attr('title').replace(/\s+\([^)]*\)$/, '');
        if (/^List of/.test(personName)) {
            return;
        }
        getPage(personUrl, function (err, body) {
            processPerson(personName, personUrl, body);
        });
    });
});

function processPerson(personName, personUrl, body) {
    var reversedName = personName.replace(/^(.+?)\s+(\S+)(, [JS]r\.)?$/, '$2, $1$3'),
        personCode = reversedName.toLowerCase().replace(/\W+/g, '_').replace(/^_|_$/g, ''),
        $ = cheerio.load(body),
        data = {
            code: personCode,
            name: personName,
            wikipedia: personUrl,
            birth_date: $('span.bday').text(),
            death_date: $('span.dday,span.deathdate').text(),
            positions: []
        },
        filename = personDir + '/' + personCode + '.yaml',
        m;
    console.log(personCode, personName, personUrl);
    if (!data.birth_date) {
        if (m = body.toString().match(/\(born ([A-Z][a-z]+ \d\d?, \d{4})|\(([A-Z][a-z]+ \d\d?, \d{4})\W+([A-Z][a-z]+ \d\d?, \d{4})\)/)) {
            data.birth_date = moment(m[1] || m[2], 'MMMM D, YYYY').format('YYYY-MM-DD');
            if (m[3]) {
                data.death_date = moment(m[3], 'MMMM D, YYYY').format('YYYY-MM-DD');
            }
        }
    }
    if (!data.birth_date) {
        delete data.birth_date;
    }
    if (!data.death_date) {
        delete data.death_date;
    }
    $('table.succession-box tr').each(function () {
        var cells = $(this).find('td'),
            start, end, parts, dates, office;
        if (cells.length !== 3) {
            return;
        }
        parts = cells.eq(1).html().split(/\s*<br\s*\/?>\s*/);
        dates = parts.pop();
        office = parts.join(' ').replace(/<[^>]*>/g, '');
        if (m = dates.match(/(([A-Z][a-z]+ \d\d?, )?(?:19|20)\d\d)\W+(([A-Z][a-z]+ \d\d?, )?(?:19|20)\d\d|present|)/)) {
            start = m[2] ? moment(m[1], 'MMMM D, YYYY').format('YYYY-MM-DD') : m[1];
            end = m[4] ? moment(m[3], 'MMMM D, YYYY').format('YYYY-MM-DD') : (!m[3] || m[3] == 'present' ? null : m[3]);
        }
        else if (dates.match(/^(?:19|20)\d\d$/)) {
            start = end = dates;
        }
        else {
            console.log(parts);
            throw 'Unexpected date format: ' + dates;
        }
        if (/nominee/i.test(office)) {
            return;
        }
        data.positions.push({
            office: office,
            start: start,
            end: end
        });
    });
    fs.writeFileSync(personDir + '/' + personCode + '.html', body);
    fs.writeFileSync(filename, yaml.safeDump(data));
}
