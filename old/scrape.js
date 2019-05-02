#!/usr/bin/env node

var path = require('path'),
    url = require('url'),
    cheerio = require('cheerio'),
    async = require('async'),
    moment = require('moment'),
    csv = require('csv'),
    getPage = require('./get-page'),
    mainUrl = 'http://www.dcboee.org/candidate_info/historic_officials/history.asp',
    outFile = path.join('data', 'officials.csv'),
    csvHandle = csv().to(outFile, {
        columns: ['election_date', 'office', 'name', 'party', 'final_reason'],
        header: true
    });

getPage(mainUrl, processMainPage);

function processMainPage(err, body) {
    if (err) {
        throw err;
    }
    var $ = cheerio.load(body);
    async.eachSeries(
        $('#main_content .list_items a'),
        function (a, next) {
            var officeUrl = url.resolve(mainUrl, $(a).attr('href'));
            if (/\.pdf$/.test(officeUrl)) {
                setImmediate(next); // skip PDFs for now
                return;
            }
            getPage(officeUrl, function(err, body) {
                console.log(officeUrl);
                processOfficePage(err, body);
                next(err);
            });
        },
        function (err) {
            if (err) {
                throw err;
            }
            console.log('Finished');
        }
    );
}

function processOfficePage(err, body) {
    if (err) {
        throw err;
    }
    var $ = cheerio.load(body),
        office = $('h3').text().trim();
    $('#main_content table').eq(0).find('tr').each(function () {
        var $row = $(this),
            record = {office: office, party: ''},
            $cells, dates, finalReason, i, weekday;
        if ($row.hasClass('row_header')) {
            // skip header
        }
        else {
            $cells = $row.find('td');
            $cells.find('sup').remove();
            $cells.eq(2).find('br').replaceWith(', ');
            record.name = $cells.eq(0).text().trim()
                .replace(/\s*\((\w+)\)$/, function (m0, m1) {
                    record.party = m1;
                    return '';
                });
            dates = [$cells.eq(1).text().trim()];
            dates = dates.concat($cells.eq(2).text().trim().split(/,\s*/))
                .filter(function (d) { return d != ''; })
                .map(convertDate);
            finalReason = $cells.eq(3).text().trim().replace(/\s+/, ' ')
                .replace(/\b\d+-\d+-\d+\b/, convertDate);
            for (i = 0; i < dates.length; i++) {
                record.election_date = dates[i];
                weekday = moment(record.election_date).format('ddd');
                if (weekday != 'Tue') {
                    console.log(record.election_date + ' is ' + weekday +
                        ', not Tue');
                }
                record.final_reason = i == dates.length - 1 ? finalReason : '';
                csvHandle.write(record);
            }
        }
    });
}

function convertDate(d) {
    return moment(d, 'M-D-YY').format('YYYY-MM-DD');
}
