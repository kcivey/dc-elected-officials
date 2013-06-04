var fs = require('fs'),
    path = require('path'),
    byline = require('byline'),
    csv = require('csv'),
    moment = require('moment'),
    inFile = process.argv[2],
    stream = byline(fs.createReadStream(inFile)),
    outFile = path.join('data', 'ancs.csv'),
    csvHandle = csv().to(outFile, {
        columns: ['election_date', 'anc', 'name'],
        header: true
    }),
    headers;

stream.on('data', function (line) {
    var record = {},
        values, date, weekday, i;
    if (/^\s*Election Date/.test(line)) {
        headers = line.trim().split(/\s{2,}/);
    }
    else if (!headers) {
        // haven't reached beginning of table yet, so skip line
    }
    else if (/^Nov/.test(line)) {
        // Put '____' in empty columns as placeholder
        values = line.trim().replace(/  \s{23}/g, '  _____').split(/\s{2,}/);
        date = moment(values[0]);
        weekday = date.format('ddd');
        if (weekday != 'Tue') {
            console.log('%s is %s, not Tue', values[0], weekday);
        }
        record.election_date = date.format('YYYY-MM-DD');
        for (i = 1; i < values.length; i++) {
            record.anc = headers[i];
            record.name = values[i] || '';
            if (record.name != '_____') {
                csvHandle.write(record);
            }
        }
    }
    else if (!/\S/.test(line)) {
        // blank line
    }
    else if (/^\s*\d+\s*$/.test(line)) {
        // page number
    }
    else if (/^The shaded boxes|^\s*HISTORICAL LISTING|^\s*ANC\/SMD\s*|^Redistricting\.|^\s*COMMISIONERS/.test(line)) {
        // page header/footer
    }
    else {
        throw 'Unexpected line: ' + line;
    }
});
