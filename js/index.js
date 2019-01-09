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

        experience: function (date, includeMayor) {
            var ymd = moment(date).format('YYYY-MM-DD'),
                regexp = new RegExp('Council' + (includeMayor ? '|Mayor' : '')),
                days = 0;
            this.positions.forEach(function (p) {
                if (p.start <= ymd && regexp.test(p.office)) {
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

        genderCount: function (gender) {
            return this.members.reduce(function (previousValue, currentPerson) {
                if (currentPerson.gender == gender) {
                    previousValue++;
                }
                return previousValue;
            }, 0);
        },

        women: function () {
            return this.genderCount('F');
        },

        men: function () {
            return this.genderCount('M');
        },

        ages: function (date) {
            return this.members.map(function (person) {
                return person.age(date);
            });
        },

        averageAge: function (date) {
            return this.ages(date).reduce(function (previous, current) {
                    return previous + current;
                }, 0) / this.members.length;
        },

        minAge: function (date) {
            return _.min(this.ages(date));
        },

        maxAge: function (date) {
            return _.max(this.ages(date));
        },

        totalExperience: function (date, includeMayor) {
            return this.members.reduce(function (previousValue, currentPerson) {
                return previousValue + currentPerson.experience(date, includeMayor);
            }, 0);
        },

        changes: function () {
            var texts = [];
            if (this.remove.length) {
                texts.push('− ' + _.pluck(this.remove, 'name').join(', '));
            }
            if (this.add.length) {
                texts.push('+ ' + _.pluck(this.add, 'name').join(', '));
            }
            return texts.join('\n');
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
                        councils[p.start].date = p.start;
                    }
                    councils[p.start].add.push(person);
                }
                else {
                    throw 'Missing start in ' + person.code;
                }
                if (p.end) {
                    if (!councils[p.end]) {
                        councils[p.end] = new Council();
                        councils[p.end].date = p.end;
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

    function dataRow(council, date) {
        return {
            date: date,
            men: council.men(),
            women: council.women(),
            experience: council.totalExperience(date),
            experienceWithMayor: council.totalExperience(date, true),
            averageAge: council.averageAge(date),
            minAge: council.minAge(date),
            maxAge: council.maxAge(date)
        };
    }

    function millisToYmd(millis) {
        return moment(millis).utc().format('YYYY-MM-DD');
    }

    function draw(councils) {
        var data = [],
            today = moment().format('YYYY-MM-DD'),
            options = {
                maintainAspectRatio: false,
                spanGaps: false,
                elements: {
                    line: {
                        tension: 0
                    }
                },
                scales: {
                    xAxes: [{
                        type: 'time',
                        time: {
                            min: '1975-01-01',
                            max: today,
                            stepSize: 20
                        }
                    }],
                    yAxes: [{
                        stacked: true
                    }]
                }
            },
            prevCouncil;
        _.each(councils, function (council, ymd) {
            if (prevCouncil) {
                data.push(dataRow(prevCouncil, ymd));
            }
            data.push(dataRow(council, ymd));
            prevCouncil = council;
        });

        data.push(dataRow(prevCouncil, today));
        new Chart(
            'women-chart',
            {
                type: 'line',
                data: {
                    datasets: [
                        {
                            label: 'Women',
                            data: data.map(function (d) { return {x: d.date, y: d.women}; }),
                            pointRadius: 0
                        },
                        {
                            label: 'Men',
                            data: data.map(function (d) { return {x: d.date, y: d.men}; }),
                            pointRadius: 0
                        }
                    ]

                },
                options: options
            }
        );
        /*
        new Chart(
            'experience-chart',
            function () {
                return data.map(function (row) {
                    return [row.date, row.experience, row.experienceWithMayor];
                });
            },
            _.extend({}, baseOptions, {
                labels: ['Date', 'Experience', 'Including Mayoral'],
                labelsDiv: 'experience-legend',
                title: 'Total Years of Experience of DC Council'
            })
        );
        new Chart(
            'age-chart',
            function () {
                return data.map(function (row) {
                    return [row.date, row.averageAge, row.minAge, row.maxAge];
                });
            },
            _.extend({}, baseOptions, {
                labels: ['Date', 'Average Age', 'Min', 'Max'],
                labelsDiv: 'age-legend',
                title: 'Average Age of DC Council'
            })
        );
        */
    }
})(jQuery);
