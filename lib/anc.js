const ancData = require('../data/anc.json');
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
        return this.smd.substr(0, 2);
    }

}

function getCurrentCommissioners() {
    if (!commissioners) {
        // Convert plain objects to Commissioner objects
        commissioners = Object.entries(ancData.commissioners).reduce(
            function (acc, [smd, data]) {
                acc[smd] = new Commissioner(data);
                return acc;
            },
            {}
        );
    }
    return commissioners;
}

function getCurrentCommissioner(smd) {
    return getCurrentCommissioners()[smd];
}

function updated() {
    return ancData.updated;
}

module.exports = {Commissioner, getCurrentCommissioners, getCurrentCommissioner, updated};
