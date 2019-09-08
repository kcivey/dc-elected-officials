const _ = require('lodash');
const moment = require('moment');
const personData = require('./data/person.json');
const anc = require('./lib/anc');
let councils = null;
let persons = null;

class Person {

    constructor(data) {
        Object.assign(this, data);
    }

    age(date) {
        let birth = this.birthDate;
        if (typeof birth === 'number' || /^c/.test(birth)) {
            birth += '-07-01';
            birth = birth.replace(/^c\s+/, '');
        }
        return moment(date).diff(moment(birth), 'd') / 365.2425;
    }

    experience(date, pattern) {
        const ymd = moment(date).format('YYYY-MM-DD');
        const regexp = new RegExp(pattern);
        let days = 0;
        this.positions.forEach(function (p) {
            if (p.start <= ymd && regexp.test(p.office)) {
                const end = p.end <= ymd ? moment(p.end) : moment(date);
                days += end.diff(moment(p.start), 'd');
            }
        });
        return days / 365.2425;
    }

    councilExperience(date) {
        return this.experience(date, 'Council');
    }

    mayoralExperience(date) {
        return this.experience(date, 'Mayor');
    }

}

class Council {

    constructor(date) {
        this.date = date;
        Object.assign(this, {
            members: [],
            add: [],
            remove: [],
        });
    }

    genderCount(gender) {
        return this.members.reduce(function (previousValue, currentPerson) {
            if (currentPerson.gender === gender) {
                previousValue++;
            }
            return previousValue;
        }, 0);
    }

    women() {
        return this.genderCount('F');
    }

    men() {
        return this.genderCount('M');
    }

    ages(date) {
        return this.members.map(person => person.age(date));
    }

    averageAge(date) {
        return this.ages(date).reduce((previous, current) => previous + current, 0) / this.members.length;
    }

    minAge(date) {
        return _.minBy(this.ages(date));
    }

    maxAge(date) {
        return _.maxBy(this.ages(date));
    }

    totalCouncilExperience(date) {
        return this.members
            .reduce((previousValue, currentPerson) => previousValue + currentPerson.councilExperience(date), 0);
    }

    totalMayoralExperience(date) {
        return this.members
            .reduce((previousValue, currentPerson) => previousValue + currentPerson.mayoralExperience(date), 0);
    }

    youngestMember() {
        return _.maxBy(this.members, m => new Date(m.birthDate));
    }

    oldestMember() {
        return _.minBy(this.members, m => new Date(m.birthDate));
    }

    changes() {
        const changes = [];
        const lost = _.difference(this.remove, this.add);
        const gained = _.difference(this.add, this.remove);
        const promoted = _.intersection(this.add, this.remove);
        const makeNameList = persons => persons.map(p => p.name).join(', ') + '.';
        if (lost.length) {
            changes.push('Lost: ' + makeNameList(lost));
        }
        if (gained.length) {
            changes.push('Gained: ' + makeNameList(gained));
        }
        if (promoted.length) {
            changes.push('Promoted: ' + makeNameList(promoted));
        }
        return changes;
    }

}

function getCouncils() {
    if (!councils) {
        councils = {};
        let members = [];
        getPersons().forEach(person => {
            person.positions.forEach(p => {
                if (!/Council/.test(p.office)) {
                    return;
                }
                if (p.start) {
                    if (!councils[p.start]) {
                        councils[p.start] = new Council(p.start);
                    }
                    councils[p.start].add.push(person);
                }
                else {
                    throw new Error('Missing start in ' + person.code);
                }
                if (p.end) {
                    if (!councils[p.end]) {
                        councils[p.end] = new Council(p.end);
                    }
                    councils[p.end].remove.push(person);
                }
            });
        });
        councils = _.pick(councils, Object.keys(councils).sort());
        councils.forEach(function (c) {
            members = _.union(_.difference(members, c.remove), c.add);
            c.members = members.slice(); // make copy before further modification
        });
    }
    return councils;
}

function getCurrentCouncil() {
    return _.last(getCouncils());
}

function getPersons() {
    if (!persons) {
        persons = Object.values(personData).map(data => new Person(data));
    }
    return persons;
}

module.exports = {Council, Person, getCouncils, getPersons, getCurrentCouncil, anc};
