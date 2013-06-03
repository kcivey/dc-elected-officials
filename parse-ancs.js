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
        values, i;
    if (/^\s*Election Date/.test(line)) {
        headers = line.trim().split(/\s{2,}/);
    }
    else if (/^Nov/.test(line)) {
        values = line.trim().split(/\s{2,}/);
        record.election_date = moment(values[0]).format('YYYY-MM-DD');
        for (i = 1; i < values.length; i++) {
            record.anc = headers[i];
            record.name = values[i] || '';
            csvHandle.write(record);
        }
    }
});
