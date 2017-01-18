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
            baseOptions = {
                axes: {
                    x: {
                        valueFormatter: millisToYmd
                    }
                },
                fillGraph: true,
                legend: 'always',
                legendFormatter: function (data) {
                    var html = defaultLegendFormatter(data),
                        council;
                    if (data.x != null) {
                        council = councils[millisToYmd(data.x)];
                        html += '<p>' + council.changes().replace('\n', '<br>') + '</p>';
                    }
                    return html;
                },
                labelsUTC: true
            },
            prevCouncil, date, now;
        _.each(councils, function (council, ymd) {
            date = new Date(ymd + 'T12:00');
            if (prevCouncil) {
                data.push(dataRow(prevCouncil, new Date(date.getTime() - 1)));
            }
            data.push(dataRow(council, date));
            prevCouncil = council;
        });
        now = new Date();
        date = moment(prevCouncil.date).add(180, 'd').toDate();
        if (now.getTime() > date.getTime()) {
            date = now;
        }
        else {
            baseOptions.underlayCallback = function(canvas, area, g) {
                var left = g.toDomCoords(now, 0)[0];
                canvas.fillStyle = 'rgba(224, 224, 224, 1)';
                canvas.fillRect(left, area.y, area.w, area.h);
            };
        }
        data.push(dataRow(prevCouncil, date));
        new Dygraph(
            'women-graph',
            function () {
                return data.map(function (row) {
                    return [row.date, row.men, row.women];
                });
            },
            _.extend({}, baseOptions, {
                includeZero: true,
                labels: ['Date', 'Men', 'Women'],
                labelsDiv: 'women-legend',
                stackedGraph: true,
                title: 'Gender Representation on DC Council'
            })
        );
        new Dygraph(
            'experience-graph',
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
        new Dygraph(
            'age-graph',
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
    }

    // Copied from dygraphs source
    function defaultLegendFormatter(data) {
        var g = data.dygraph;

        // TODO(danvk): deprecate this option in place of {legend: 'never'}
        // XXX should this logic be in the formatter?
        if (g.getOption('showLabelsOnHighlight') !== true) return '';

        var sepLines = g.getOption('labelsSeparateLines');
        var html;

        if (typeof data.x === 'undefined') {
            // TODO: this check is duplicated in generateLegendHTML. Put it in one place.
            if (g.getOption('legend') != 'always') {
                return '';
            }

            html = '';
            for (var i = 0; i < data.series.length; i++) {
                var series = data.series[i];
                if (!series.isVisible) continue;

                if (html !== '') html += sepLines ? '<br/>' : ' ';
                html += "<span style='font-weight: bold; color: " + series.color + ";'>" + series.dashHTML + " " + series.labelHTML + "</span>";
            }
            return html;
        }

        html = data.xHTML + ':';
        for (var i = 0; i < data.series.length; i++) {
            var series = data.series[i];
            if (!series.isVisible) continue;
            if (sepLines) html += '<br>';
            var cls = series.isHighlighted ? ' class="highlight"' : '';
            html += "<span" + cls + "> <b><span style='color: " + series.color + ";'>" + series.labelHTML + "</span></b>:&#160;" + series.yHTML + "</span>";
        }
        return html;
    }
})(jQuery);
