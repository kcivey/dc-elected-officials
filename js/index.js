(function () {
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
            return moment(date).diff(moment(birth), 'd') / 365.2425;
        },

        experience: function (date, pattern) {
            var ymd = moment(date).format('YYYY-MM-DD'),
                regexp = new RegExp(pattern),
                days = 0;
            this.positions.forEach(function (p) {
                if (p.start <= ymd && regexp.test(p.office)) {
                    var end = p.end <= ymd ? moment(p.end) : moment(date);
                    days += end.diff(moment(p.start), 'd');
                }
            });
            return days / 365.2425;
        },

        councilExperience: function (date) {
            return this.experience(date, 'Council');
        },

        mayoralExperience: function (date) {
            return this.experience(date, 'Mayor');
        }
    });

    function Council(date) {
        this.date = date;
        _.extend(this, {
            members: [],
            add: [],
            remove: []
        });
    }
    _.extend(Council.prototype, {

        genderCount: function (gender) {
            return this.members.reduce(function (previousValue, currentPerson) {
                if (currentPerson.gender === gender) {
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

        totalCouncilExperience: function (date) {
            return this.members.reduce(function (previousValue, currentPerson) {
                return previousValue + currentPerson.councilExperience(date);
            }, 0);
        },

        totalMayoralExperience: function (date) {
            return this.members.reduce(function (previousValue, currentPerson) {
                return previousValue + currentPerson.mayoralExperience(date);
            }, 0);
        },

        youngestMember: function (date) {
            return _.max(this.members, function (m) { return new Date(m.birth_date); }).name;
        },

        oldestMember: function (date) {
            return _.min(this.members, function (m) { return new Date(m.birth_date); }).name;
        },

        changes: function () {
            var texts = [],
                lost = _.difference(this.remove, this.add),
                gained = _.difference(this.add, this.remove),
                promoted = _.intersection(this.add, this.remove);
            if (lost.length) {
                texts.push('Lost: ' + _.pluck(lost, 'name').join(', ') + '.');
            }
            if (gained.length) {
                texts.push('Gained: ' + _.pluck(gained, 'name').join(', ') + '.');
            }
            if (promoted.length) {
                texts.push('Promoted: ' + _.pluck(promoted, 'name').join(', ') + '.');
            }
            return texts.join('<br/>');
        }
    });

    fetch('data/person.json')
      .then(function (res) { return res.json(); })
      .then(process);

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
                        councils[p.start] = new Council(p.start);
                    }
                    councils[p.start].add.push(person);
                }
                else {
                    throw 'Missing start in ' + person.code;
                }
                if (p.end) {
                    if (!councils[p.end]) {
                        councils[p.end] = new Council(p.end);
                    }
                    councils[p.end].remove.push(person);
                }
            });
        });
        councils = _.pick(councils, _.keys(councils).sort());
        _.each(councils, function (c, date) {
            members = _.union(_.difference(members, c.remove), c.add);
            c.members = members.slice(); // make copy before further modification
        });
        draw(councils);
    }

    function dataRow(council, date) {
        return {
            date: date,
            men: council.men(),
            women: council.women(),
            councilExperience: council.totalCouncilExperience(date),
            mayoralExperience: council.totalMayoralExperience(date),
            averageAge: council.averageAge(date),
            minAge: council.minAge(date),
            maxAge: council.maxAge(date)
        };
    }

    function draw(councils) {
        var data = [],
            prevCouncil;
        _.each(councils, function (council, ymd) {
            if (prevCouncil) {
                data.push(dataRow(prevCouncil, ymd));
            }
            data.push(dataRow(council, ymd));
            prevCouncil = council;
        });
        /*
        now = new Date();
        date = moment(prevCouncil.date).add(180, 'd').toDate();
        if (now.getTime() > date.getTime()) {
            date = now;
        }
        */
        data.push(dataRow(prevCouncil, moment().format('YYYY-MM-DD')));
        var xConfig = {
                type : 'timeseries',
                tick: {
                    format: '%Y',
                    values: _.range(1975, 2021, 2).map(function (y) { return y + '-01-01'; })
                },
                padding: 0
            },
            baseConfig = {
                padding: {
                    right: 10
                },
                point: {
                    show: false,
                    sensitivity: 100
                },
                tooltip: {
                    format: {
                        title: function (x) {
                            return moment(x).format('D MMM YYYY');
                        },
                        value: function (value) {
                            return Array.isArray(value) ? _.uniq(value).map(function (item) {
                                return item % 1 ? item.toFixed(2) : item;
                            }).join(' ⮕ ') : value;
                        }
                    },
                    contents: function (d, defaultTitleFormat, defaultValueFormat, color) {
                        var newD = [],
                          ymd = moment(d[0].x).format('YYYY-MM-DD'),
                          html, text;
                        d.forEach(function (item) {
                            var last = newD.length && newD[newD.length - 1];
                            if (last && last.id === item.id) {
                                last.value.push(item.value);
                            } else {
                                newD.push(_.extend({}, item, {value: [item.value]}));
                            }
                        });
                        html = c3.chart.internal.fn.getTooltipContent.call(this, newD, defaultTitleFormat, defaultValueFormat, color);
                        if (councils[ymd]) {
                            text = councils[ymd].changes();
                            if (d[0].id === 'averageAge') {
                                text += '<br/>Youngest: ' + councils[ymd].youngestMember(ymd) + '.<br/>Oldest: ' +
                                    councils[ymd].oldestMember(ymd) + '.';
                            }
                            if (text) {
                                html = html.replace('</table>', '<tr><td colspan="2">' + text + '</td></tr></table>');
                            }
                        }
                        return html;
                    }
                },
                zoom: {
                    enabled: true,
                    type: 'scroll'
                }
            };
        var charts = [
        c3.generate(_.extend(baseConfig, {
            bindto: '#women-graph',
            data: {
                x: 'date',
                type: 'area',
                groups: [['women', 'men']],
                colors: {
                    women: '#018571',
                    men: '#80cdc1'
                },
                names: {
                    women: 'Women',
                    men: 'Men'
                },
                columns: [
                    ['date'].concat(_.pluck(data, 'date')),
                    ['women'].concat(_.pluck(data, 'women')),
                    ['men'].concat(_.pluck(data, 'men'))
                ]
            },
            axis: {
                x: xConfig,
                y: {
                    max: 13,
                    tick: {
                        values: _.range(0, 14, 2),
                        outer: false
                    },
                    padding: 0
                }
            }
        })),
        c3.generate(_.extend(baseConfig, {
            bindto: '#experience-graph',
            data: {
                x: 'date',
                type: 'area',
                groups: [['councilExperience', 'mayoralExperience']],
                order: null,
                colors: {
                    councilExperience: '#a6611a',
                    mayoralExperience: '#dfc27d'
                },
                names: {
                    councilExperience: 'Years on Council',
                    mayoralExperience: 'Years as Mayor'
                },
                columns: [
                    ['date'].concat(_.pluck(data, 'date')),
                    ['councilExperience'].concat(_.pluck(data, 'councilExperience')),
                    ['mayoralExperience'].concat(_.pluck(data, 'mayoralExperience'))
                ]
            },
            axis: {
                x: xConfig,
                y: {
                    max: 155,
                    tick: {
                        values: _.range(0, 160, 20),
                        outer: false
                    },
                    padding: 0
                }
            }
        })),
        c3.generate(_.extend(baseConfig, {
            bindto: '#age-graph',
            data: {
                x: 'date',
                type: 'line',
                names: {
                    averageAge: 'Average',
                    minAge: 'Youngest',
                    maxAge: 'Oldest'
                },
                columns: [
                    ['date'].concat(_.pluck(data, 'date')),
                    ['averageAge'].concat(_.pluck(data, 'averageAge')),
                    ['minAge'].concat(_.pluck(data, 'minAge')),
                    ['maxAge'].concat(_.pluck(data, 'maxAge'))
                ]
            },
            axis: {
                x: xConfig,
                y: {
                    min: 25,
                    max: 85,
                    padding: 0,
                    outer: false
                }
            }
        }))
        ];
        // Flush (redraw) is needed for some reason to get widths right
        charts.forEach(function (chart) { chart.flush(); });
    }
})();
