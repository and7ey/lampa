(function () {
    "use strict";
    var pluginSVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 24 24" fill="#ffffff"><path d="M6 21H3a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1zm7 0h-3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v17a1 1 0 0 1-1 1zm7 0h-3a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1z"/></svg>';

    var manifest = {
        type: "other",
        version: "0.2.6",
        name: "Статистика",
        description: "Плагин для ведения статистики использования Лампы",
        component: "stats",
    };

    function startPlugin() {

        Lampa.Manifest.plugins = manifest;

        // not used currently
        // Lampa.Timeline.listener.follow('view', function (e) {
        //   console.log('Stats', 'view', e);
        // });

        // Lampa.Player.listener.follow('start', function (e) {
        //   console.log('Stats', 'player start', e);
        // });

        // Lampa.Player.listener.follow('destroy', function (e) {
        //   console.log('Stats', 'player destroy', e);
        // });

        // *** REACTIONS ***
        function updateReactions(json1, json2) {
            // if record doesn't exist in json2, then reaction is ignored - there is no way to calculate hash
            for (var key in json1.value) {
                if (json1.value.hasOwnProperty(key)) {
                    var id = key.split("_")[1]; // 'movie_519182' -> '519182'

                    for (var json2Key in json2) {
                        if (json2.hasOwnProperty(json2Key) && json2[json2Key].id == id) {
                            json2[json2Key]["r"] = json1.value[key];
                            console.log("Stats", "New reaction(s) found for movie " + id, json1.value[key]);
                            break;
                        }
                    }
                }
            }

            return json2;
        }

        // monitor reactions
        Lampa.Storage.listener.follow("change", function (e) {
            if (e.name == "mine_reactions") {
                console.log("Stats", "Storage change - mine_reactions", e);
                // {
                //  "name": "mine_reactions",
                // "value": {
                //   "movie_519182": [
                //     "nice",
                //     "fire"
                //   ],
                //   "movie_533535": [
                //     "think"
                //   ],
                //   "tv_156484": [
                //     "fire"
                //   ]
                // }
                // }
                var movies_watched = Lampa.Storage.get("stats_movies_watched", {});
                var movies_watched_updated = updateReactions(e, movies_watched);
                Lampa.Storage.set("stats_movies_watched", movies_watched_updated);
            } else if (e.name == "stats_movies_watched") {
                console.log("Stats", "Storage change - stats_movies_watched", e);
                // Lampac sync
                goExport("stats_movies_watched");
            }
        });

        // *** SEARCH HISTORY ***
        // Lampa.Storage.listener.follow("change", function (e) {
        //     if (e.name == "search_history") {
        //         console.log("Stats", "storage change - search_history", e);
        //     }
        // });




        // *** MOVIES WATCHED ***

        // monitor movies watched
        // 1 - store movie data when movie card is shown
        Lampa.Listener.follow("full", function (e) {
            if (e.type == "complite") {
                console.log("Stats", "full complite", e);
                if (e.data && e.data.movie) {
                    var card = e.data.movie; // sample json for tv series: https://pastebin.com/aV4dkKyW
                    console.log("Stats", "card", card);

                    if (card.seasons) {
                        // let hash = Lampa.Utils.hash(element.season ? [element.season,element.episode,object.movie.original_title].join('') : object.movie.original_title);  // tv
                        var hash = Lampa.Utils.hash(card.original_name ? [1, 1, card.original_name].join("") : card.original_title);
                    } else {
                        var hash = Lampa.Utils.hash(card.original_name ? [1, 1, card.original_name].join("") : card.original_title); // movie
                    }

                    console.log("Stats", "hash", hash);

                    var hash_to_movie = Lampa.Storage.get("stats_movies_watched", {});
                    hash_to_movie[hash] = hash_to_movie[hash] || {};

                    var obj = {
                        id: card.id,
                        ot: card.original_name || card.original_title,
                        t: card.title,
                        g: card.genres.map(function(g){ return g.id; }), // keep ids only
                        i: card.img,
                        ty: card.seasons ? "tv" : "movie",
                        y: new Date().getFullYear()
                    };

                    for (var k in obj) {
                        if (obj.hasOwnProperty(k)) {
                            hash_to_movie[hash][k] = obj[k];
                        }
                    }                    
                    Lampa.Storage.set("stats_movies_watched", hash_to_movie);
                }
            }
        });

        // monitor movies watched
        // 2 - store movie watch progress (timeline)
        Lampa.Timeline.listener.follow("update", function (e) {
            console.log("Stats", "timeline update", e);
            if (e.data) {
                // {"data": { "hash": "277429999", "road": {"duration": 6617.36075, "time": 217.738667, "percent": 3, "profile": 378159}}}
                try {
                    var hash = e.data.hash;
                    var percent = e.data.road.percent;
                    var time = e.data.road.time;
                    // var profile = e.data.road.profile;

                    var movies_watched = Lampa.Storage.get("stats_movies_watched", {});
                    var movie = movies_watched[hash]; // add movie watched percent
                    movie["p"] = percent;
                    movie["d"] = Date.now();
                    movie["ti"] = time;
                    console.log("Stats", "movie", movie);
                    Lampa.Storage.set("stats_movies_watched", movies_watched);
                } catch (e) {
                    console.log("Stats", "timeline update error", e);
                }
            }
        });
    }


    // *** GENERATE STATS ***
    function getMovieDetails(movie) {
        return {
            id: movie.id,
            ot: movie.ot,
            t: movie.t,
            i: movie.i,
            ty: movie.ty,
        };
    }

    function analyzeMovies(json, year, ignoreSeries = true) {
        console.log('Stats', 'Starting to analyze movies data...', json, year, ignoreSeries);
        
        // ignore series
        var filteredJson = {};
        if (ignoreSeries) {
            for (var key in json) {
                if (json[key].ty !== "tv") {
                    filteredJson[key] = json[key];
                }
            }
        } else {
            filteredJson = json;
        }

        // filter records by the given year
        var filteredJsonYear = {};
        for (var key in filteredJson) {
            if (filteredJson[key].y == year) {
                filteredJsonYear[key] = filteredJson[key];
            }
        }
        filteredJson = filteredJsonYear;

        console.log('Stats', 'Movies list after filterings', JSON.stringify(filteredJson, null, 2));

        var watchedMovies = 0;
        var watchedExamples = [];
        var watchedFullList = [];
        var genreCounts = {};
        var unwatchedMovies = 0;
        var unwatchedFullList = [];
        var unwatchedExamples = [];
        var moviesWithReactions = 0;
        var moviesWithReactionsFullList = [];
        var reactionCounts = {};
        var cardsViewedOnly = 0;
        var cardsViewedOnlyExamples = [];
        var cardsViewedOnlyFullList = [];
        var dayCounts = {};
        var seasonCounts = {};
        var monthCounts = {};
        var firstMovieOfYear = null;
        var totalTime = 0;
        var maxTime = 0;
        var maxTimeMovie = null;

        if (Object.keys(filteredJson).length !== 0) {
            for (var key in filteredJson) {
                // calculate watchedMovies and unwatchedMovies
                var movie = filteredJson[key];
                console.log('Stats', 'Processing movie...', movie.t);
                console.log('Stats', 'Counting number of watched movies...');
                if (movie.p && movie.p > 90) {
                    watchedMovies++;
                    if (watchedExamples.length < 3) {
                        watchedExamples.push(getMovieDetails(movie));
                    }
                    watchedFullList.push(getMovieDetails(movie));

                    if (movie.d && (!firstMovieOfYear || movie.d < firstMovieOfYear.date)) {
                        firstMovieOfYear = {
                            date: movie.d,
                            movie: getMovieDetails(movie),
                        };
                    }
                }
                console.log('Stats', 'Counting number of unfinished movies...');
                if (movie.p && movie.p <= 90) {
                    unwatchedMovies++;
                    if (unwatchedExamples.length < 3) {
                        unwatchedExamples.push(getMovieDetails(movie));
                    }
                    unwatchedFullList.push(getMovieDetails(movie));
                }

                // calculate moviesWithReactions
                console.log('Stats', 'Counting movies with reactions...');
                if (movie.r && movie.r.length > 0) {
                    moviesWithReactions++;
                    moviesWithReactionsFullList.push(getMovieDetails(movie));
                }
                

                // calculate cardsViewedOnly
                console.log('Stats', 'Counting watched cards...');
                if (!movie.d) {
                    cardsViewedOnly++;
                    if (cardsViewedOnlyExamples.length < 3) {
                        cardsViewedOnlyExamples.push(getMovieDetails(movie));
                    }
                    cardsViewedOnlyFullList.push(getMovieDetails(movie));
                }

                // calculate genres
                console.log('Stats', 'Calculating popular genres...');
                if (movie.g && movie.d && movie.p && movie.p > 90) { // consider watched movies only
                    movie.g.forEach(function (genre) {
                        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
                    });
                }

                console.log('Stats', 'Counting number of movies watched each day and each month...');
                if (movie.d) {
                    var date = new Date(movie.d);
                    var day = (date.getDay() + 6) % 7 + 1; // convert 0-6 (Sun-Sat) to 1-7 (Mon-Sun)
                    var month = date.getMonth() + 1;
                    var year = date.getFullYear();

                    // calculate number of movies per day and per month
                    dayCounts[day] = (dayCounts[day] || 0) + 1;
                    monthCounts[month] = (monthCounts[month] || 0) + 1;
                }

                // count number of each reaction, will be used later
                console.log('Stats', 'Count number of each reaction...');
                if (movie.r) {
                    movie.r.forEach(function (reaction) {
                        reactionCounts[reaction] = (reactionCounts[reaction] || 0) + 1;
                    });
                }

                // count total time watched
                console.log('Stats', 'Count total watch time...', movie.ti);
                if (movie.ti) {
                    totalTime += movie.ti;

                    // count max movie time watched
                    if (movie.ti > maxTime) {
                        maxTime = movie.ti;
                        maxTimeMovie = movie;
                    }
                }
            }

            console.log('Stats', 'Choosing most popular genre...');
            var topGenre = null;
            if (Object.keys(genreCounts).length !== 0) {
                var topGenre = Object.keys(genreCounts)
                .sort(function (a, b) {
                    return genreCounts[b] - genreCounts[a];
                })
                .slice(0, 1);
            }
            console.log('Stats', 'Most popular genre is', topGenre);

            console.log('Stats', 'Choosing most popular reaction...');
            var mostPopularReaction = null;
            if (Object.keys(reactionCounts).length !== 0) {
                var mostPopularReaction = Object.keys(reactionCounts).sort(function (a, b) {
                    return reactionCounts[b] - reactionCounts[a];
                })[0];
            }
            console.log('Stats', 'Most popular reaction is', mostPopularReaction);

            console.log('Stats', 'Choosing most popular day...');
            var mostPopularDay = null;
            if (Object.keys(dayCounts).length !== 0) {
                var mostPopularDay = Object.keys(dayCounts).sort(function (a, b) {
                    return dayCounts[b] - dayCounts[a];
                })[0];
            }
            console.log('Stats', 'Most popular day is', mostPopularDay);

            console.log('Stats', 'Choosing most popular month...');
            var mostPopularMonth = null;
            if (Object.keys(monthCounts).length !== 0) {
                var mostPopularMonth = Object.keys(monthCounts).sort(function (a, b) {
                    return monthCounts[b] - monthCounts[a];
                })[0];
            }
            console.log('Stats', 'Most popular month is', mostPopularMonth);
        } else {
            console.log('Stats', 'No data in filtered movies list');
        }

        console.log('Stats', 'Generating result json...');
        try {
            var result = {
                year: year,
                watchedMovies: {
                    count: watchedMovies,
                    examples: watchedExamples,
                    list: watchedFullList
                },
                topGenre: topGenre ? {
                    genre: Lampa.Api.sources.tmdb.getGenresNameFromIds("movie", [topGenre[0]])[0].toLowerCase(), // TODO: TV series not supported
                    examples: topGenre.map(function (genre) {
                        var example = Object.values(filteredJson).find(function (movie) {
                            return movie.g.includes(Number(genre));
                        });
                        return getMovieDetails(example);
                    }),
                } : null,
                unwatchedMovies: {
                    count: unwatchedMovies,
                    examples: unwatchedExamples,
                    list: unwatchedFullList
                },
                moviesWithReactions: moviesWithReactions,
                moviesWithReactionsList: moviesWithReactionsFullList,
                mostPopularReaction: mostPopularReaction, 
                cardsViewedOnly: {
                    count: cardsViewedOnly, 
                    examples: cardsViewedOnlyExamples,
                    list: cardsViewedOnlyFullList
                },
                mostPopularDay: mostPopularDay ? Lampa.Lang.translate("week_" + mostPopularDay).toLowerCase() : null,
                mostPopularMonth: mostPopularMonth ? Lampa.Lang.translate("month_" + mostPopularMonth).toLowerCase().substring(0,3) : null,
                firstMovieOfYear: firstMovieOfYear
                ? {
                  date: Lampa.Utils.parseTime(firstMovieOfYear.date).short.toLowerCase(),
                  movie: firstMovieOfYear.movie,
              }
              : null,
                totalTime: Math.floor(totalTime / 3600), // seconds to hours
                maxTimeMovie: maxTimeMovie
                ? {
                          time: Math.floor(maxTime / 60), // seconds to minutes
                          movie: getMovieDetails(maxTimeMovie),
                      }
                      : null,
                  };
                  console.log('Stats', 'Result json generated');
              } catch (err) {
                console.log('Stats', 'Failed to generate json', err);
            }

            return result;
        }

    // *** MENU ***
        console.log('Stats', 'Starting to create menu elements...');

        Lampa.SettingsApi.addComponent({
            component: "stats",
            icon: pluginSVG,
            name: "Статистика",
        });

    // TEMP - doesn't work
    // setTimeout(() => {
    //   var parentContainer = document.querySelector('.settings__body .scroll__body > div');
    //   var statsElement = document.querySelector('.settings__body .settings-folder[data-component="stats"]');
    //   parentContainer.insertBefore(statsElement, parentContainer.firstChild);
    // }, 2000);


        var currentDate = new Date();
        var currentMonth = currentDate.getMonth() + 1; 
        var currentDay = currentDate.getDate();
        var currentYear = currentDate.getFullYear();

        var statsYear = null;

    if (currentMonth === 12 && currentDay >= 14 && currentDay <= 31) { // from Dec 14 to Dec 31
        statsYear = currentYear;
    } else if (currentMonth === 1 && currentDay >= 1 && currentDay <= 15) { // from Jan 1 to Jan 15
        statsYear = currentYear - 1;
    }

    console.log('Stats', 'Detected the year to work with', statsYear);
    console.log('Stats', 'The current month is', currentMonth);
    console.log('Stats', 'The current day is', currentDay);

    var statsDebug = Lampa.Storage.get("stats_debug", false);

    if (statsDebug) {
        console.log('Stats', 'Debug mode is enabled');
        
        if (!statsYear) {
            statsYear = currentYear;
        }

        Lampa.SettingsApi.addParam({
            component: 'stats',
            param: {
                type: 'title'
            },
            field: {
                name: 'Отладка',
            }
        });  

        Lampa.SettingsApi.addParam({
            component: "stats",
            param: {
                type: "button",
            },
            field: {
                name: "Удалить кэш",
            },
            onChange: () => {
                Lampa.Storage.set("stats_movies_watched", {});
                Lampa.Storage.set("stats_gists", {});
                Lampa.Noty.show("Данные плагина Статистика удалены");
            }
        });

        Lampa.SettingsApi.addParam({
            component: "stats",
            param: {
                type: "button",
            },
            field: {
                name: "JSON",
            },
            onChange: () => {
                var stats = Lampa.Storage.get("stats_movies_watched");
                if (!stats) {
                    Lampa.Noty.show("Отсутствуют данные для отображения статистики");
                } else {
                    var result = analyzeMovies(stats, currentYear); // always display current year data
                    var result_str = JSON.stringify(result, null, 2);
                    console.log("Stats", "Here is the result", result);

                    let modal = $('<div class="about"><div class="about__rules"><pre>' + result_str + "</pre></div></div>");

                    Lampa.Modal.open({
                        title: "Статистика " + currentYear,
                        html: modal,
                        size: "medium",
                        onBack: () => {
                            Lampa.Modal.close();
                            Lampa.Controller.toggle("settings_component");
                        },
                    });
                }
            },
        });

        Lampa.SettingsApi.addParam({
            component: 'stats',
            param: {
                type: 'title'
            },
            field: {
                name: 'Статистика',
            }
        });          
    }


    /*
     * param  iNumber Integer Число на основе которого нужно сформировать окончание
     * param  aEndings Array Массив слов или окончаний для чисел (1, 4, 5),
     *         например ['яблоко', 'яблока', 'яблок']
     * return String
     */
    function getNumEnding(iNumber, aEndings) {
        var sEnding, i;
        iNumber = iNumber % 100;
        if (iNumber >= 11 && iNumber <= 19) {
            sEnding = aEndings[2];
        } else {
            i = iNumber % 10;
            switch (i) {
            case 1:
                sEnding = aEndings[0];
                break;
            case 2:
            case 3:
            case 4:
                sEnding = aEndings[1];
                break;
            default:
                sEnding = aEndings[2];
            }
        }
        return sEnding;
    }

    // generate menu with stats
    var stats = Lampa.Storage.get("stats_movies_watched");
    if (stats && Object.keys(stats).length > 0) {
        console.log("Stats", "Data found", JSON.stringify(stats, null, 2));
        
        var result = analyzeMovies(stats, currentYear); // always display current year data

        console.log("Stats", "Data to be used for menu generation", JSON.stringify(result, null, 2));

        try {
            Lampa.SettingsApi.addParam({
                component: "stats",
                param: {
                    type: "static",
                },
                field: {
                    name: result["firstMovieOfYear"].movie.t,
                    description: "первый фильм 2025 года",
                }
            });
        } catch (err) {
            console.log('Stats', 'Failed to display first movie of the year');
        }

    
        function transformMoviesToCards(data) {
            var result = [];
            var keys = Object.keys(data);

            for (var i = 0; i < keys.length; i++) {
                var item = data[keys[i]];

                var poster_path = null;
                if (item.i) {
                    var url = item.i.split('?')[0]; // убираем query string
                    var parts = url.split('/');
                    // parts = ["http:", "", "imagetmdb.com", "t", "p", "w300", "xxx.jpg"]
                    poster_path = '/' + parts.slice(6).join('/');
                }

                result.push({
                    id: item.id,
                    original_title: item.ot,
                    poster_path: poster_path,
                    title: item.t,
                    source: "tmdb"
                });
            }

            return result;
        }        

        function full(params, oncomplete, onerror) {
            // https://github.com/yumata/lampa-source/blob/main/src/utils/reguest.js
            // https://github.com/yumata/lampa-source/blob/main/plugins/collections/api.js
            var moviesList = [];
            if (params.component === 'stats_watched_movies') {
                moviesList = transformMoviesToCards(result["watchedMovies"]["list"]);
            } else if (params.component === 'stats_watched_movies_with_reactions') {
                moviesList = transformMoviesToCards(result["moviesWithReactionsList"]);
            } else if (params.component === 'stats_unwatched_movies') {
                moviesList = transformMoviesToCards(result["unwatchedMovies"]["list"]);
            } else if (params.component === 'stats_cards_viewed_only') {
                moviesList = transformMoviesToCards(result["cardsViewedOnly"]["list"]);
            }
            oncomplete({
                "secuses": true,
                "page": 1,
                "results": moviesList
            });
        }

        function component(object) {
            var comp = new Lampa.InteractionCategory(object);
            comp.create = function() {
                full(object, this.build.bind(this), this.empty.bind(this));
            };
            comp.nextPageReuest = function(object, resolve, reject) {
                full(object, resolve.bind(comp), reject.bind(comp));
            };
            return comp;
        }
        
        Lampa.Component.add('stats_watched_movies', component);
        Lampa.Component.add('stats_watched_movies_with_reactions', component);
        Lampa.Component.add('stats_unwatched_movies', component);
        Lampa.Component.add('stats_cards_viewed_only', component);
        try {
            Lampa.SettingsApi.addParam({
                component: "stats",
                param: {
                    type: "button",
                    name: "stats_button_watched_movies"
                },
                field: {
                    name: result["watchedMovies"].count,
                    description: getNumEnding(result["watchedMovies"].count, ["фильм просмотрен", "фильма просмотрено", "фильмов просмотрено"]),
                },
                onChange: () => {
                    Lampa.Activity.push({
                        url: '',
                        title: 'Просмотренные фильмы',
                        component: 'stats_watched_movies',
                        page: 1
                    });        
                }
            });
        } catch (err) {
            console.log('Stats', 'Failed to watched movies count');
        }


        try {
            Lampa.SettingsApi.addParam({
                component: "stats",
                param: {
                    type: "button",
                    name: "stats_button_movies_with_reactions"
                },
                field: {
                    name: result["moviesWithReactions"],
                    description: getNumEnding(result["moviesWithReactions"].count, ["фильм", "фильма", "фильмов"]) + " с оценкой",
                },
                onChange: () => {
                    Lampa.Activity.push({
                        url: '',
                        title: 'Фильмы с оценкой',
                        component: 'stats_watched_movies_with_reactions',
                        page: 1
                    });                    
                }                
            });
        } catch (err) {
            console.log('Stats', 'Failed to display number of reactions');
        }

        try {
            Lampa.SettingsApi.addParam({
                component: "stats",
                param: {
                    type: "button",
                    name: "stats_button_unwatched_movies"
                },
                field: {
                    name: result["unwatchedMovies"].count,
                    description: getNumEnding(result["unwatchedMovies"].count, ["фильм недосмотрен", "фильма недосмотрено", "фильмов недосмотрено"]),
                },
                onChange: () => {
                    Lampa.Activity.push({
                        url: '',
                        title: 'Недосмотренные фильмы',
                        component: 'stats_unwatched_movies',
                        page: 1
                    });                    
                }
            });
        } catch (err) {
            console.log('Stats', 'Failed to display not finished movies count');
        }


        try {
            Lampa.SettingsApi.addParam({
                component: "stats",
                param: {
                    type: "button",
                    name: "stats_button_cards_viewed_only"
                },
                field: {
                    name: result["cardsViewedOnly"].count,
                    description: getNumEnding(result["cardsViewedOnly"].count, ["карточка фильма просмотрена", "карточки фильмов просмотрено", "карточек фильмов просмотрено"]),
                },
                onChange: () => {
                    Lampa.Activity.push({
                        url: '',
                        title: 'Просмотренные карточки',
                        component: 'stats_cards_viewed_only',
                        page: 1
                    });                    
                }
            });
        } catch (err) {
            console.log('Stats', 'Failed to display number of cards viewed');
        }
        
        try {
            Lampa.SettingsApi.addParam({
                component: "stats",
                param: {
                    type: "static",
                },
                field: {
                    name: result["topGenre"].genre,
                    description: "самый популярный жанр",
                }
            });
        } catch (err) {
            console.log('Stats', 'Failed to display most popular genre');
        }

        try {
            if (result["mostPopularReaction"]) {
                Lampa.SettingsApi.addParam({
                    component: "stats",
                    param: {
                        type: "static",
                    },
                    field: {
                        name: Lampa.Lang.translate("reactions_" + result["mostPopularReaction"]).toLowerCase(),
                        description: "самая частая реакция",
                    }
                });
            } else {
                console.log('Stats', 'No most popular reaction found');
            }
        } catch (err) {
            console.log('Stats', 'Failed to display most popular reaction');
        }

        try {
            if (result["mostPopularDay"]) {
                Lampa.SettingsApi.addParam({
                    component: "stats",
                    param: {
                        type: "static",
                    },
                    field: {
                        name: result["mostPopularDay"],
                        description: "самый популярный день для просмотра фильмов",
                    }
                });
            } else {
                console.log('Stats', 'No most popular day found');
            }                
        } catch (err) {
            console.log('Stats', 'Failed to display most popular day');
        }            

        try {
            if (result["mostPopularMonth"]) {
                Lampa.SettingsApi.addParam({
                    component: "stats",
                    param: {
                        type: "static",
                    },
                    field: {
                        name: result["mostPopularMonth"],
                        description: "самый популярный месяц для просмотра фильмов",
                    }
                });
            } else {
                console.log('Stats', 'No most popular month found');
            }                     
        } catch (err) {
            console.log('Stats', 'Failed to display most popular month');
        }            

        try {
            Lampa.SettingsApi.addParam({
                component: "stats",
                param: {
                    type: "static",
                },
                field: {
                    name: result["totalTime"] + " ч.",
                    description: "общее время просмотра фильмов",
                }
            });
        } catch (err) {
            console.log('Stats', 'Failed to display total time');
        }            

        try {
            Lampa.SettingsApi.addParam({
                component: "stats",
                param: {
                    type: "static",
                },
                field: {
                    name: result["maxTimeMovie"].movie.t,
                    description: "самый длинный просмотренный фильм (" + result["maxTimeMovie"].time + " мин.)",
                }
            });
        } catch (err) {
            console.log('Stats', 'Failed to display longest movie');
        }        
    } else {
        Lampa.SettingsApi.addParam({
            component: "stats",
            param: {
                type: "static",
            },
            field: {
                name: "нет данных",
                description: "данные появляются после некоторого времени использования Лампы",
            }
        });
    }

    Lampa.SettingsApi.addParam({
        component: 'stats',
        param: {
            type: 'title'
        },
        field: {
            name: 'О плагине',
        }
    });  
    var enableDebugModeCounter = 0;
    Lampa.SettingsApi.addParam({
        component: "stats",
        param: {
            type: "button",
        },
        field: {
            name: manifest.version,
            description: "версия"
        },
        onChange: () => {
            enableDebugModeCounter++;
            if (enableDebugModeCounter == 7) {
                statsDebug = Lampa.Storage.get("stats_debug", false);
                if (!statsDebug) {
                    Lampa.Noty.show("Плагин Статистика: режим разработчика включен");
                } else {
                    Lampa.Noty.show("Плагин Статистика: режим разработчика выключен");
                }
                Lampa.Storage.set("stats_debug", !statsDebug);
                enableDebugModeCounter = 0;
            }
        }
    });
    console.log('Stats', 'Finished to create menu elements');

    // *** HEAD BUTTON ***
    function addHeadButton() {
        console.log('Stats', 'Starting to create head button...');
        
        $("#head_stats").remove();

        var headButton = '<div id="head_stats" class="head__action selector stats-data">' + pluginSVG + "</div>";

        $("#app > div.head > div > div.head__actions").append(headButton);
        // $('.head__actions').eq(0).append(headButton);

        $("#head_stats").insertAfter('div[class="head__action selector open--settings"]');

        $("#head_stats").on("hover:enter hover:click hover:touch", function () {

            var statsGists = Lampa.Storage.get("stats_gists", null);
            if (statsGists && statsGists.hasOwnProperty(statsYear)) {
                // data already generated
                console.log('Stats', 'Data has already been generated and uploaded', statsGists[statsYear]);

                var url = "https://lampab.github.io/#" + statsGists[statsYear];
                var modal = $('<div><div class="stats__qr" style="text-align: center; margin-bottom: 20px"><img src="https://quickchart.io/qr?margin=2&size=200&text=' + encodeURI(url) + '"></img></div><div class="broadcast__text">' + url + '</div></div>');

                // display modal and progress bar there
                Lampa.Modal.open({
                    title: 'Итоги ' + statsYear + ' года с Лампой',
                    html: modal,
                    size: 'medium',
                    onBack: () => {
                        Lampa.Modal.close();
                    },
                });

                try {
                    Lampa.Utils.copyTextToClipboard(url, () => {});
                    Lampa.Noty.show("Ссылка на итоги года скопирована в буфер обмена");
                } catch (e) {}


            } else {
                console.log('Stats', 'Generating data and uploading it for the first time for year', statsYear);

                var modal = $('<div><div class="stats__qr" style="text-align: center; margin-bottom: 20px"></div><div class="broadcast__scan"><div></div></div><div class="broadcast__text"></div></div>');

                // display modal and progress bar there
                Lampa.Modal.open({
                    title: 'Итоги ' + statsYear + ' года с Лампой',
                    html: modal,
                    size: 'medium',
                    onBack: () => {
                        Lampa.Modal.close();
                    },
                });

                var texts = ["анализируем данные", "считаем фильмы", "складываем время", "отправляем данные", "генерируем страницу с итогами", "создаем QR"];
                var currentIndex = 0;

                function updateText() {
                    try {
                        // consider case when modal is closed
                        var textElement = document.querySelector(".broadcast__text");
                        textElement.textContent = texts[currentIndex];
                        currentIndex++;
                        if (currentIndex >= texts.length) {
                            clearInterval(intervalId);
                        }
                    } catch (e) {}
                }
                var intervalId = setInterval(updateText, 2000);
                updateText();

                function updateLoader(intervalId, text) {
                    clearInterval(intervalId);
                    var textElement = document.querySelector(".broadcast__text");
                    textElement.innerHTML = text;
                    var loader = document.querySelector(".broadcast__scan");
                    loader.remove();
                }

                var stats_movies_analyzed = null;
                var stats_movies = Lampa.Storage.get("stats_movies_watched");
                if (!stats_movies) {
                    updateLoader(intervalId, "Отсутствуют данные для формирования итогов");
                } else {
                    stats_movies_analyzed = analyzeMovies(stats_movies, statsYear);
                }

                // upload data
                function createGist(stats) {
                    console.log("Stats", "Creating Gist...");
                    var network = new Lampa.Reguest();
                    var gistToken = "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";
                    // https://docs.github.com/en/rest/gists/gists
                    network.silent(
                        "https://api.github.com/gists",
                        (data) => {
                            // success
                            // {
                            //   "url": "https://api.github.com/gists/3a96be52ad8cb0daf1189fd2b08de883",
                            //   "id": "3a96be52ad8cb0daf1189fd2b08de883",
                            //   "html_url": "https://gist.github.com/3a96be52ad8cb0daf1189fd2b08de883",
                            //   ...
                            // }
                            if (data && data.id) {
                                console.log("Stats", "Gist created", data.id);

                                // var url = 'https://gist.githubusercontent.com/lamp-a/' + data.id + '/raw';
                                var url = "https://lampab.github.io/#" + data.id;

                                updateLoader(intervalId, url);
                                try {
                                    Lampa.Utils.copyTextToClipboard(url, () => {});
                                    Lampa.Noty.show("Ссылка на итоги года скопирована в буфер обмена");
                                } catch (e) {}

                                var imgElement = document.querySelector(".stats__qr");
                                // https://quickchart.io/documentation/qr-codes/
                                imgElement.innerHTML = '<img src="https://quickchart.io/qr?margin=2&size=200&text=' + encodeURI(url) + '">';

                                var gists = Lampa.Storage.get("stats_gists", {});
                                gists[statsYear] = data.id;
                                Lampa.Storage.set("stats_gists", gists);
                            } else {
                                console.log("Stats", "Failed to add gist", data);
                                updateLoader(intervalId, "не удалось загрузить данные в Gist");
                            }
                        },
                        (data) => {
                            // error
                            console.log("Stats", "Failed to create gist", data);
                            updateLoader(intervalId, "не удалось загрузить данные в Gist");
                        },
                        JSON.stringify({
                            files: {
                                "data.js": {
                                    content: "var json = " + "\n" + JSON.stringify(stats, null, 2),
                                },
                            },
                        }),
                        {
                            beforeSend: {
                                name: "Authorization",
                                value: "bearer " + gistToken,
                            },
                            headers: {
                                Accept: "application/vnd.github+json",
                                "X-GitHub-Api-Version": "2022-11-28",
                            },
                        }
                        );
                }
                createGist(stats_movies_analyzed);
            }
        });
        console.log('Stats', 'Finished to create head button');
}
    if (statsYear) { // the button should be added only from Dec 14 to Jan 15
        console.log("Stats", "New Year time, head button to be shown");
        addHeadButton();
    }

    // *** CLEANUP ***
    function filterJsonByYear(json, year) {
        console.log("Stats", "Removing old entries...");

        var filteredJson = {};

        for (var key in json) {
            if (json.hasOwnProperty(key)) {
                var entry = json[key];

                if (entry.y >= year) {
                    // leave records with date equal or later than given year
                    filteredJson[key] = entry;
                }
            }
        }

        return filteredJson;
    }

    function cleanupStorage() {
        console.log("Stats", "Checking if clean up is needed...");
        var statsCleanup = Lampa.Storage.get("stats_cleanup", {});

        var currentDate = new Date();
        var currentYear = currentDate.getFullYear();
        var previousYear = currentYear - 1;
        var currentMonth = currentDate.getMonth() + 1;

        if (!statsCleanup[previousYear]) {
            // no clean up made before
            if (currentMonth >= 2) {
                // if it is February or later
                var watchedMovies = Lampa.Storage.get("stats_movies_watched", {});
                var cleanedMovies = filterJsonByYear(watchedMovies, currentYear);
                Lampa.Storage.set("stats_movies_watched", cleanedMovies);

                statsCleanup[previousYear] = true;
                Lampa.Storage.set("stats_cleanup", statsCleanup);
            }
        }
    }


    // *** SYNC (based on lampac's sync.js) ***
    function account(url) {
        url = url + '';
        if (url.indexOf('account_email=') == -1) {
            var email = Lampa.Storage.get('account_email');
            if (email) url = Lampa.Utils.addUrlComponent(url, 'account_email=' + encodeURIComponent(email));
        }
        if (url.indexOf('uid=') == -1) {
            var uid = Lampa.Storage.get('lampac_unic_id', '');
            if (uid) url = Lampa.Utils.addUrlComponent(url, 'uid=' + encodeURIComponent(uid));
        }
        return url;
    }    

    function goExport(path) {
        var value = {};

        value['stats_movies_watched'] = Lampa.Storage.get("stats_movies_watched", {});

        var url = account('http://192.168.1.125:9118/storage/set?path=' + path);
        console.log('Stats', 'Syncing data - export', url);
        $.ajax({
            url: url,
            // url: account('storage/set?path=' + path),
            type: 'POST',
            data: JSON.stringify(value),
            async: true,
            cache: false,
            contentType: false,
            processData: false,
            success: function(j) {
                console.log('Stats', 'Syncing data - export: success');
                if (j.success && j.fileInfo) {
                    localStorage.setItem('lampac_' + path, j.fileInfo.changeTime);
                } else {
                    console.log('Stats', 'Lampac Storage export', 'error', j);
                    console.log('Stats', 'Lampac user id (uid) or Cub account are required to sync data');
                }
            },
            error: function() {
                console.log('Stats', 'Lampac Storage export', 'error');
            }
        });
    }

    function goImport(path) {
        var network = new Lampa.Reguest();
        var url = account('http://192.168.1.125:9118/storage/get?path=' + path);
        console.log('Stats', 'Syncing data - import', url);
        network.silent(url, function(j) {
        // network.silent(account('storage/get?path=' + path), function(j) {
            if (j.success && j.fileInfo && j.data) {
                if (j.fileInfo.changeTime != Lampa.Storage.get('lampac_' + path, '0')) {
                    var data = JSON.parse(j.data);
                    if (data.stats_movies_watched !== "undefined") {
                        var remoteData = data["stats_movies_watched"];

                        var localData = Lampa.Storage.get("stats_movies_watched", {});

                        var hash, itemData, itemLocal;
                        for (hash in remoteData) {
                            itemData = remoteData[hash];
                            itemLocal = localData[hash];

                            if (!itemLocal) {
                                localData[hash] = itemData; // new record
                            } else {
                                if (typeof itemData.p !== "undefined") {
                                    if (typeof itemLocal.p === "undefined" || itemLocal.p < itemData.p) {
                                        itemLocal.p = itemData.p;
                                    }
                                }
                            }
                        }
                        Lampa.Storage.set("stats_movies_watched", localData);

                    }   
                    localStorage.setItem('lampac_' + path, j.fileInfo.changeTime);
                }
            } else if (j.msg && j.msg == 'outFile') {
                goExport(path);
            }
        });
    }    

    goImport('stats_movies_watched');



    if (window.appready) {
        try {
            console.log('Stats', 'Starting the plugin...');
            cleanupStorage();
            startPlugin();
        } catch (err) {
            console.log('Stats', 'Something went wrong', err);
        }
    } else {
        Lampa.Listener.follow("app", function (e) {
            console.log("Stats", "app", e);
            if (e.type == "ready") {
                cleanupStorage();
                startPlugin();
            }
        });
    }
})();
