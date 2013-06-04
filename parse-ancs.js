var fs = require('fs'),
    path = require('path'),
    byline = require('byline'),
    csv = require('csv'),
    moment = require('moment'),
    inFile = process.argv[2],
    stream = byline(fs.createReadStream(inFile)),
    outFile = path.join('data', 'ancs.csv'),
    csvHandle = csv().to(outFile, {
        columns: ['election_date', 'anc', 'last_name', 'first_name', 'suffix'],
        header: true
    }),
    nameRe = /^("?[A-Z][\w'."() -]+?) ((?:(?:V[ao]n(?: ?[Dd]e[nr])?|D[aeiu]|L[ae]) )?[A-Z][\w'-]+)(?:[, ]+(Jr|Sr|I{1,3}|IV|VI{0,3})\.?)?$/,
    headers;

stream.on('data', function (line) {
    var record = {},
        values, date, weekday, i, name, m;
    if (/^\s*Election Date/.test(line)) {
        headers = line.trim().split(/\s{2,}/);
    }
    else if (!headers) {
        // haven't reached beginning of table yet, so skip line
    }
    else if (/^Nov/.test(line)) {
        // Fix up:
        line = line.replace(/,\s*/g, ', ')
            // Add extra space after suffixes that's sometimes missing:
            .replace(/ (I{1,3}|[JS]r\.?) /g, ' $1  ')
            // Horrible kluge to put extra space around long names that otherwise get combined with following name sometimes:
            .replace(/(Velma V\. Dzidzienyo|Yasmin Romero Castillo|Hazel C\. Adams-Shango|Robin Hammond Marlin|L\. Yvonne \(L\.Y\.\) Moore|Deborah S\. Bandzerwicz|William \(Bill\) Arrington)/, ' $1 ')
            .replace(/( [A-Z])(?:[. ]|, ?)(\w\w)/g, '$1. $2') // badly formatted initials:
            .replace(/OtisWilliams/, 'Otis Williams') // missing space
            .replace(/("\S+):/, '$1"') // typo for quote
            .replace(/Ren.e L\. Bowser/, 'Renee L. Bowser') // charset problem
            // Put '____' in empty columns as placeholder:
            .replace(/  \s{22} /g, '  _____ ');
        values = line.trim().split(/\s{2,}/);
        date = moment(values[0]);
        weekday = date.format('ddd');
        if (weekday != 'Tue') {
            console.log('%s is %s, not Tue', values[0], weekday);
        }
        record.election_date = date.format('YYYY-MM-DD');
        for (i = 1; i < values.length; i++) {
            record.anc = headers[i];
            name = (values[i] || '').replace(/_+/, '');
            if (name) {
                if (name == 'No candidate')  {
                    record.last_name = name;
                    record.first_name = '';
                    record.suffix = '';
                }
                else if (m = name.match(nameRe)) {
                    record.last_name = m[2];
                    record.first_name = m[1] || '';
                    record.suffix = m[3] || '';
                }
                else {
                    console.log('Unexpected name format: ', name);
                }
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
