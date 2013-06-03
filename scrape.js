var fs = require('fs'),
    path = require('path'),
    crypto = require('crypto'),
    url = require('url'),
    request = require('request'),
    cheerio = require('cheerio'),
    moment = require('moment'),
    csv = require('csv'),
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
    $('#main_content .list_items a').each(function () {
        var officeUrl = url.resolve(mainUrl, $(this).attr('href'));
        if (/\.pdf$/.test(officeUrl)) {
            return; // skip PDFs for now
        }
        getPage(officeUrl, processOfficePage);
    });
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
    return moment(d).format('YYYY-MM-DD');
}

// Kluge to avoid redownloading during development
function getPage(url, callback) {
    var hash = crypto.createHash('md5').update(url).digest('hex'),
        file = path.join(__dirname, 'cache', hash);
    if (fs.existsSync(file)) {
        fs.readFile(file, callback);
    }
    else {
        request(url, function (err, response, body) {
            if (err) {
                return callback(err);
            }
            if (response.statusCode != 200) {
                return callback('status code ' + response.statusCode);
            }
            fs.writeFile(file, body, function (err) {
                if (err) {
                    return callback(err);
                }
                callback(null, body);
            });
        })
    }
}
