const {describe, it} = require('mocha');
const {expect} = require('chai');
const dceo = require('..');

describe(
    'Person',
    function () {
        it(
            'getPersons',
            function () {
                const persons = dceo.getPersons();
                expect(persons).to.be.an('array').of.length(59);
                const person = persons[0];
                expect(person).to.be.instanceOf(dceo.Person);
                expect(person.age()).to.be.a('number');
                expect(person.experience()).to.be.a('number');
                expect(person.experience()).to.be.at.least(person.councilExperience() + person.mayoralExperience());
            }
        );
    }
);
