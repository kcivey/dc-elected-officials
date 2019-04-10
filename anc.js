const ancData = require('./data/anc.json');
let commissioners = null;

class Commissioner {

    constructor(data) {
        Object.assign(this, data);
    }

    vacant() {
        return this.lastName === 'Vacant' && !this.firstName;
    }

    fullName() {
        let name = this.firstName || '';
        if (this.lastName) {
            name += (name ? ' ' : '') + this.lastName;
        }
        if (this.suffix) {
            name += ' ' + this.suffix;
        }
        return name;
    }

    anc() {
        return this.smd.substr(0, 3);
    }

}

function getCurrentCommissioners() {
    if (!commissioners) {
        commissioners = Object.entries(ancData).reduce(function (acc, [key, data]) {
            acc[key] = new Commissioner(data);
            return acc;
        });
    }
    return commissioners;
}

function getCurrentCommissioner(smd) {
    return getCurrentCommissioners()[smd];
}

module.exports = {Commissioner, getCurrentCommissioners, getCurrentCommissioner};
