const {describe, it} = require('mocha');
const {expect} = require('chai');
const dceo = require('..');

describe(
    'Council',
    function () {
        it(
            'getCouncils',
            function () {
                const councils = dceo.getCouncils();
                expect(councils).to.be.an('object');
                expect(Object.keys(councils)).to.be.an('array').of.length(46);
                const firstDate = Object.keys(councils)[0];
                expect(firstDate).to.equal('1975-01-02');
                const council = councils[firstDate];
                expect(council.members).to.be.an('array').of.length(13);
                expect(council.date).to.equal('1975-01-02');
                expect(council).to.be.instanceOf(dceo.Council);
                expect(council.men()).to.equal(10);
                expect(council.women()).to.equal(3);
                expect(council.ages()).to.be.an('array').of.length(13);
                expect(council.ages()[0]).to.be.a('number');
                expect(council.totalCouncilExperience()).to.be.a('number');
                expect(council.totalMayoralExperience()).to.be.a('number');
                expect(council.averageAge()).to.be.a('number');
                expect(council.minAge()).to.be.a('number');
                expect(council.maxAge()).to.be.a('number');
                const youngest = council.youngestMember();
                expect(youngest).to.be.instanceOf(dceo.Person);
                expect(youngest.name).to.equal('David Clarke');
                expect(council.oldestMember().name).to.equal('Polly Shackleton');
                expect(council.changes()).to.be.an('array').of.length(1);
            }
        );
    }
);
