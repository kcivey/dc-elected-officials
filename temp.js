var moment = require('moment'),
    _ = require('underscore'),
    personData = require('./data/person.json'),
    councils = {};

_.each(personData, function (person) {
    person.positions.forEach(function (p) {
        if (!/Council/.test(p.office)) {
            return;
        }
        if (p.start) {
            if (!councils[p.start]) {
                councils[p.start] = {add: {}, remove: {}};
            }
            councils[p.start].add[person.code] = p.office;
        }
        else {
            throw 'Missing start in ' + person.code;
        }
        if (p.end) {
            if (!councils[p.end]) {
                councils[p.end] = {add: {}, remove: {}};
            }
            councils[p.end].remove[person.code] = p.office;
        }
    });
});

councils = _.pick(councils, _.keys(councils).sort());

var councilList = [];
_.each(councils, function (c, date) {
    var mdate = moment(date, 'YYYY-MM-DD'),
        text = '[new Date(' + mdate.format('YYYY') + ', ' + (mdate.format('M') - 1) + ', ' + mdate.format('D') + '), ';
    if (councilList.length) {
        console.log(text, totalExperience(councilList, mdate) + '],');
    }
    _.keys(c.remove).forEach(function (key) {
        console.log('Lost', key, experience(personData[key], mdate));
    });
    _.keys(c.add).forEach(function (key) {
        console.log('Gained', key, experience(personData[key], mdate));
    });
    councilList = _.union(_.difference(councilList, _.keys(c.remove)), _.keys(c.add));
    console.log(text, totalExperience(councilList, mdate) + '],');
});
console.log('[new Date(), ' + totalExperience(councilList, moment()) + ']');

function women(councilList) {
    return councilList.reduce(function (previousValue, currentKey) {
        if (personData[currentKey].gender == 'F') {
            previousValue++;
        }
        return previousValue;
    }, 0);
}

function men(councilList) {
    return councilList.reduce(function (previousValue, currentKey) {
        if (personData[currentKey].gender == 'M') {
            previousValue++;
        }
        return previousValue;
    }, 0);
}

function averageAge(councilList, date) {
    return councilList.map(function (key) {
        return age(personData[key], date);
    }).reduce(function (previous, current) {
        return previous + current;
    }, 0) / councilList.length;
}

function age(person, date) {
    var birth = person.birth_date;
    if (typeof birth == 'number' || /^c/.test(birth)) {
        birth += '-07-01';
        birth = birth.replace(/^c\s+/, '');
    }
    return date.diff(moment(birth, 'YYYY-MM-DD'), 'd') / 365.2425;
}

function totalExperience(councilList, date) {
    return councilList.reduce(function (previousValue, currentKey) {
            return previousValue + experience(personData[currentKey], date);
        }, 0);
}

function experience(person, date) {
    var ymd = date.format('YYYY-MM-DD'),
        days = 0;
    person.positions.forEach(function (p) {
        if (p.start <= ymd && /Council/.test(p.office)) {
            var end = p.end <= ymd ? moment(p.end, 'YYYY-MM-DD') : date;
            days += end.diff(moment(p.start, 'YYYY-MM-DD'), 'd');
        }
    });
    return days / 365.2425;
}