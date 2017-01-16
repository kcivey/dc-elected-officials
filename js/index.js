(function ($) {

    function Person(data) {
        _.extend(this, data);
    }
    _.extend(Person.prototype, {

        age: function (date) {
            var birth = this.birth_date;
            if (typeof birth == 'number' || /^c/.test(birth)) {
                birth += '-07-01';
                birth = birth.replace(/^c\s+/, '');
            }
            return moment(date).diff(moment(birth, 'YYYY-MM-DD'), 'd') / 365.2425;
        },

        experience: function (date) {
            var ymd = moment(date).format('YYYY-MM-DD'),
                days = 0;
            this.positions.forEach(function (p) {
                if (p.start <= ymd && /Council/.test(p.office)) {
                    var end = p.end <= ymd ? moment(p.end, 'YYYY-MM-DD') : moment(date);
                    days += end.diff(moment(p.start, 'YYYY-MM-DD'), 'd');
                }
            });
            return days / 365.2425;
        }
    });

    function Council() {
        _.extend(this, {
            members: [],
            add: [],
            remove: []
        });
    }
    _.extend(Council.prototype, {

        genderCount: function(gender) {
            return this.members.reduce(function (previousValue, currentPerson) {
                if (currentPerson.gender == gender) {
                    previousValue++;
                }
                return previousValue;
            }, 0);
        },

        women: function() {
            return this.genderCount('F');
        },

        men: function() {
            return this.genderCount('M');
        },

        averageAge: function averageAge(date) {
            return this.members.map(function (person) {
                    return person.age(date);
                }).reduce(function (previous, current) {
                    return previous + current;
                }, 0) / this.members.length;
        },

        totalExperience: function totalExperience(date) {
            return this.members.reduce(function (previousValue, currentPerson) {
                return previousValue + currentPerson.experience(date);
            }, 0);
        }
    });

    $.getJSON('data/person.json', process);

    function process(personData) {
        var councils = {},
            members = [];
        _.each(personData, function (data) {
            var person = new Person(data);
            person.positions.forEach(function (p) {
                if (!/Council/.test(p.office)) {
                    return;
                }
                if (p.start) {
                    if (!councils[p.start]) {
                        councils[p.start] = new Council();
                    }
                    councils[p.start].add.push(person);
                }
                else {
                    throw 'Missing start in ' + person.code;
                }
                if (p.end) {
                    if (!councils[p.end]) {
                        councils[p.end] = new Council();
                    }
                    councils[p.end].remove.push(person);
                }
            });
        });
        councils = _.pick(councils, _.keys(councils).sort());
        _.each(councils, function (c, date) {
            members = _.union(_.difference(members, c.remove), c.add);
            c.members = members.slice();
        });
        draw(councils);
    }

    function draw(councils) {
        var data = [],
            prevCouncil, date;
        _.each(councils, function (council, ymd) {
            date = new Date(ymd + 'T12:00');
            if (prevCouncil) {
                data.push([
                    new Date(date.getTime() - 1),
                    prevCouncil.men(),
                    prevCouncil.women(),
                    prevCouncil.totalExperience(date),
                    prevCouncil.averageAge(date)
                ]);
            }
            data.push([
                date,
                council.men(),
                council.women(),
                council.totalExperience(date),
                council.averageAge(date)
            ]);
            prevCouncil = council;
        });
        date = new Date();
        data.push([
            date,
            prevCouncil.men(),
            prevCouncil.women(),
            prevCouncil.totalExperience(date),
            prevCouncil.averageAge(date)
        ]);
        new Dygraph(
            'women-graph',
            function () {
                return data.map(function (row) {
                    return [row[0], row[1], row[2]];
                });
            },
            {
                axes: {
                    x: {
                        valueFormatter: function (millis) {
                            return moment(millis).utc().format('YYYY-MM-DD');
                        }
                    }
                },
                fillGraph: true,
                labels: ['Date', 'Men', 'Women'],
                labelsUTC: true,
                stackedGraph: true,
                title: 'Gender Representation on DC Council'
            }
        );
        new Dygraph(
            'experience-graph',
            function () {
                return data.map(function (row) {
                    return [row[0], row[3]];
                });
            },
            {
                axes: {
                    x: {
                        valueFormatter: function (millis) {
                            return moment(millis).utc().format('YYYY-MM-DD');
                        }
                    }
                },
                fillGraph: true,
                labels: ['Date', 'Experience'],
                labelsUTC: true,
                title: 'Total Years of Experience of DC Council'
            }
        );
        new Dygraph(
            'age-graph',
            function () {
                return data.map(function (row) {
                    return [row[0], row[4]];
                });
            },
            {
                axes: {
                    x: {
                        valueFormatter: function (millis) {
                            return moment(millis).utc().format('YYYY-MM-DD');
                        }
                    }
                },
                fillGraph: true,
                labels: ['Date', 'Average Age'],
                labelsUTC: true,
                title: 'Average Age of DC Council'
            }
        );
    }

})(jQuery);
