(function() {
    'use strict';
    var network = new Lampa.Reguest();

    function getRandomKinopoiskTechKey() {
        const keys = ['8c8e1a50-6322-4135-8875-5d40a5420d86', 'f1d94351-2911-4485-b037-97817098724e', '8c8e1a50-6322-4135-8875-5d40a5420d86'];
        const randomIndex = Math.floor(Math.random() * keys.length);
        return keys[randomIndex];
    }

    function calculateProgress(total, current) {
        if(total == current) {
            Lampa.Noty.show('Обновление списка фильмов Кинопоиска завершено (' + String(total) + ')');
            if(Lampa.Storage.get('kinopoisk_launched_before', false) == false) {
                Lampa.Storage.set('kinopoisk_launched_before', true);
                Lampa.Activity.push({
                    url: '',
                    title: 'Кинопоиск',
                    component: 'kinopoisk',
                    page: 1
                });
            }
        }
    }

    function processKinopoiskData(data) {
        // use cache
        if(data && data.data.userProfile && data.data.userProfile.userData && data.data.userProfile.userData.plannedToWatch) {
            var kinopoiskMovies = Lampa.Storage.get('kinopoisk_movies', []);
            var receivedMovies = data.data.userProfile.userData.plannedToWatch.movies.items;
            var receivedMoviesCount = receivedMovies.length;
            var moviesCount = data.data.userProfile.userData.plannedToWatch.movies.total;
            console.log('Kinopoisk', "Total planned to watch movies found: " + String(moviesCount));
            console.log('Kinopoisk', "Movies received count: " + String(receivedMoviesCount));
            if(receivedMoviesCount == 0) {
                Lampa.Noty.show('В списке "Буду смотреть" Кинопоиска нет фильмов');
            }
            const receivedMovieIds = new Set(receivedMovies.map(m => String(m.movie.id)));
            // filter out movies that are no longer present in receivedMovies
            kinopoiskMovies = kinopoiskMovies.filter(movie => receivedMovieIds.has(String(movie.kinopoisk_id)));
            Lampa.Storage.set('kinopoisk_movies', JSON.stringify(kinopoiskMovies));
            let processedItems = 1;
            receivedMovies.forEach(m => {
                const existsInLocalStorage = kinopoiskMovies.some(km => km.kinopoisk_id === String(m.movie.id));
                if (!existsInLocalStorage) {
                    // get movie data
                    var title = m.movie.title.localized || m.movie.title.original;
                    console.log('Kinopoisk', 'Getting details for movie: ' + String(m.movie.id) + ', movie title: ' + title);
                    // getting imdb id based on kinopoisk id
                    // network.silent('https://kinopoiskapiunofficial.tech/api/v2.2/films/' + String(m.movie.id), function(data) {
                    network.silent('https://api.alloha.tv/?token=04941a9a3ca3ac16e2b4327347bbc1&kp=' + String(m.movie.id), function(data) {
                        if (data && data.data) {
                            var movieIMDBid = data.data.id_imdb;
                            var movieTMDBid = data.data.id_tmdb ? data.data.id_tmdb : null;
                            var movieTitle = data.data.original_name ? data.data.original_name : data.data.name;
                            if (data.data.category == 1) {
                                var movieType = 'movie';
                            } else { // 2
                                var movieType = 'tv';
                            }
                            var movieYear = data.data.year;
                            if (movieTMDBid) {
                                console.log('Kinopoisk', 'TMDB movie id found: ' + String(movieTMDBid) + ' for kinopoisk id: ' + String(m.movie.id));
                                var url = Lampa.Utils.protocol() + 'tmdb.'+ Lampa.Manifest.cub_domain +'/3/' + movieType + '/' + String(movieTMDBid) + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=ru';
                            } else {
                                if (movieType === 'movie') {
                                    console.log('Kinopoisk', 'No IMDB movie id found for kinopoisk id: ' + String(m.movie.id) + ', will search by movie title: ' + movieTitle);
                                    var url = Lampa.Utils.protocol() + 'tmdb.'+ Lampa.Manifest.cub_domain +'/3/search/movie?query=' + encodeURIComponent(movieTitle) + '&api_key=4ef0d7355d9ffb5151e987764708ce96&year=' + String(movieYear) + '&language=ru';
                                } else { // TV_SERIES
                                    console.log('Kinopoisk', 'No IMDB movie id found for kinopoisk id: ' + String(m.movie.id) + ', will search by tv series title: ' + movieTitle);
                                    var url = Lampa.Utils.protocol() + 'tmdb.'+ Lampa.Manifest.cub_domain +'/3/search/tv?query=' + encodeURIComponent(movieTitle) + '&api_key=4ef0d7355d9ffb5151e987764708ce96&year=' + String(movieYear) + '&language=ru';
                                }
                            }
                            // getting movie details
                            network.silent(url, function(data) {
                                if(data) {
                                    if (movieTMDBid) {
                                        var movieItem = data;
                                    } else {
                                        if (data.movie_results && data.movie_results[0]) {
                                            var movieItem = data.movie_results[0];
                                        } else if(data.tv_results && data.tv_results[0]) {
                                            var movieItem = data.tv_results[0];
                                        } else if(data.results && data.results[0]) {
                                            var movieItem = data.results[0];
                                        }
                                    }
                                    if(movieItem) {

                                        // console.log('Kinopoisk', 'Movie details received: ' + JSON.stringify(movieItem));
                                        console.log('Kinopoisk', 'TMDB id found: ' + movieItem.id + ' for IMDB movie id: ' + movieIMDBid + ', kinopoisk id: ' + String(m.movie.id));

                                        var movieDateStr = movieItem.release_date || movieItem.first_air_date; // film or tv series
                                        var movieDate = new Date(movieDateStr);

                                        if (movieDate <= new Date()) {                                            
                                            movieItem.kinopoisk_id = String(m.movie.id);
                                            movieItem.source = "tmdb";
                                            kinopoiskMovies = Lampa.Storage.get('kinopoisk_movies', []); // re-read data if another process modified it
                                            kinopoiskMovies.unshift(movieItem);
                                            Lampa.Storage.set('kinopoisk_movies', JSON.stringify(kinopoiskMovies));
                                        } else {
                                            console.log('Kinopoisk', 'Movie or TV with kinopoisk id ' + String(m.movie.id) + ' not released yet, release date:', movieDate);    
                                            if (Lampa.Storage.get('kinopoisk_add_to_favorites', false)) { // add to favorites
                                                Lampa.Favorite.add('wath', movieItem, 100);
                                            }
                                        }
                                        
                                    } else {
                                        console.log('Kinopoisk', 'No result found for ' + movieTitle + ', ' + movieYear, data);
                                    }
                                } else {
                                    console.log('Kinopoisk', 'No movie found by IMDB id: ' + String(movieIMDBid));
                                }
                                calculateProgress(receivedMoviesCount, processedItems++);
                            }, function(data) {
                                console.log('Kinopoisk', 'apitmdb.cub.red error, data: ' + String(data));
                                calculateProgress(receivedMoviesCount, processedItems++);
                            });
                        } else {
                            console.log('Kinopoisk', 'No movie found for kinopoisk id: ' + String(m.movie.id) + ', movie: ' + title);
                            calculateProgress(receivedMoviesCount, processedItems++);
                        }
                    }, function(data) {
                        console.log('Kinopoisk', 'kinopoiskapiunofficial error, data: ' + String(data));
                        calculateProgress(receivedMoviesCount, processedItems++);
                    }, false, {
                        type: 'get' //,
                        // headers: {
                        //     'X-API-KEY': getRandomKinopoiskTechKey()
                        // }
                    });
                } else {
                    console.log('Kinopoisk', 'Reading data from local storage for movie: ' + String(m.movie.id))
                    calculateProgress(receivedMoviesCount, processedItems++);
                }
            })
        } else {
            Lampa.Noty.show('Невозможно обработать данные, полученные от Кинопоиска');
            console.log('Kinopoisk', 'processKinopoiskData - ');
            console.log('Kinopoisk', data);
        }
    }

    function getKinopoiskData() {
        console.log('Kinopoisk', 'Starting to get Kinopoisk data...');
        var oauth = Lampa.Storage.get('kinopoisk_access_token');
        // google script is used to act as CORS proxy
        network.silent('https://script.google.com/macros/s/AKfycbwQhxl9xQPv46uChWJ1UDg6BjSmefbSlTRUoSZz5f1rZDRvdhAGTi6RHyXwcSeyBtPr/exec?oauth=' + oauth, function(data) { // on success
            processKinopoiskData(data);
        }, function(data) { // on error
            console.log('Kinopoisk', 'Error, google script', data);
        });
    }

    function full(params, oncomplete, onerror) {
        // https://github.com/yumata/lampa-source/blob/main/src/utils/reguest.js
        // https://github.com/yumata/lampa-source/blob/main/plugins/collections/api.js
        var oauth = Lampa.Storage.get('kinopoisk_access_token');
        if(oauth) {
            getKinopoiskData();
        }
        oncomplete({
            "secuses": true,
            "page": 1,
            "results": Lampa.Storage.get('kinopoisk_movies', [])
        });
    }

    function clear() {
        network.clear();
    }
    var Api = {
        full: full,
        clear: clear
    };

    function component(object) {
        var comp = new Lampa.InteractionCategory(object);
        comp.create = function() {
            Api.full(object, this.build.bind(this), this.empty.bind(this));
        };
        comp.nextPageReuest = function(object, resolve, reject) {
            Api.full(object, resolve.bind(comp), reject.bind(comp));
        };
        return comp;
    }
    // getting/refreshing oauth kinopoisk token
    function getToken(device_code, refresh) {
        var client_id = 'b8b9c7a09b79452094e12f6990009934';
        if(!refresh) {
            var token_data = {
                'grant_type': 'device_code',
                'code': device_code,
                'client_id': client_id,
                'client_secret': '0e7001e272944c05ae5a0df16e3ea8bd'
            }
        } else { // refresh token
            var token_data = {
                'grant_type': 'refresh_token',
                'refresh_token': device_code, // pass refresh token as device_code
                'client_id': client_id,
                'client_secret': '0e7001e272944c05ae5a0df16e3ea8bd'
            }
        }
        network.silent('https://oauth.yandex.ru/token', function(data) { // on token success
            if(data.access_token) {
                Lampa.Storage.set('kinopoisk_access_token', data.access_token);
                Lampa.Storage.set('kinopoisk_refresh_token', data.refresh_token);
                Lampa.Storage.set('kinopoisk_token_expires', data.expires_in * 1000 + Date.now());
                Lampa.Modal.close();
                getUserEmail();
                getKinopoiskData();
            } else {
                Lampa.Noty.show('Не удалось получить token');
                console.log('Kinopoisk', 'Error during OAuth', data.error);
            }
        }, function(data) { // on token error
            Lampa.Noty.show(data.responseJSON.error_description);
            console.log('Kinopoisk', 'Token error', data);
        }, token_data);
    }
    // getting oauth user_code
    // https://yandex.ru/dev/id/doc/ru/codes/screen-code-oauth
    function getDeviceCode() {
        // generating unique device id
        const uuid4 = () => {
            const ho = (n, p) => n.toString(16).padStart(p, 0);
            const data = crypto.getRandomValues(new Uint8Array(16));
            data[6] = (data[6] & 0xf) | 0x40;
            data[8] = (data[8] & 0x3f) | 0x80;
            const view = new DataView(data.buffer);
            return `${ho(view.getUint32(0), 8)}${ho(view.getUint16(4), 4)}${ho(view.getUint16(6), 4)}${ho(view.getUint16(8), 4)}${ho(view.getUint32(10), 8)}${ho(view.getUint16(14), 4)}`; /// Compile the canonical textual form from the array data
        };
        Lampa.Storage.set('kinopoisk_deviceid', uuid4());
        var client_id = 'b8b9c7a09b79452094e12f6990009934';
        var device_code_data = {
            'client_id': client_id,
            'device_id': Lampa.Storage.get('kinopoisk_deviceid', '')
        }
        network.silent('https://oauth.yandex.ru/device/code', function(data) { // on device code success
            if(data.user_code && data.device_code) {
                // Lampa.Utils.copyTextToClipboard(data.user_code, ()=>{});
                // ask user to authorize
                let modal = $('<div><div class="about">Перейдите по ссылке https://ya.ru/device на любом устройстве и введите код<br><br><b>' + data.user_code + '</b><br><br></div><br><div class="broadcast__device selector" style="textalign: center">Готово</div></div>')
                Lampa.Modal.open({
                    title: 'Авторизация',
                    html: modal,
                    align: 'center',
                    onBack: () => {
                        Lampa.Modal.close()
                    },
                    onSelect: () => { // on button click
                        getToken(data.device_code, false);
                    }
                })
            } else {
                Lampa.Noty.show('Не удалось получить user_code');
                console.log('Kinopoisk', 'Failed to get user_code', data.error);
            }
        }, function(data) { // on device code error
            Lampa.Noty.show(data.responseJSON.error_description);
            console.log('Kinopoisk', 'Failed to get device code', data);
        }, device_code_data);
    }

    function getUserEmail() {
        network.silent('https://login.yandex.ru/info?format=json', function(data) {
            if (data.default_email) {
                Lampa.Storage.set('kinopoisk_email', data.default_email);

                $('div[data-name="kinopoisk_auth"]').find('.settings-param__name').text(data.default_email); // NOT WORKING?
            } else {
                Lampa.Noty.show('Не удалось получить email пользователя');
                console.log('Kinopoisk', 'Failed to get user email', data.error);                
            }
        }, function(data) { // on device code error
            Lampa.Noty.show(data.responseText);
            console.log('Kinopoisk', 'Failed to get user email', data);
        }, false, {
            type: 'get',
            headers: {
                'Authorization': 'OAuth ' + Lampa.Storage.get('kinopoisk_access_token')
            }
        });
        
    }


    function startPlugin() {
        var manifest = {
            type: 'video',
            version: '0.4.0',
            name: 'Кинопоиск',
            description: '',
            component: 'kinopoisk'
        };
        Lampa.Manifest.plugins = manifest;
        Lampa.Component.add('kinopoisk', component);
        if(Lampa.Storage.get('kinopoisk_access_token', '') !== '' && Lampa.Storage.get('kinopoisk_token_expires', 0) < Date.now()) { // refresh token needed
            console.log('Kinopoisk', 'Token should be refreshed')
            getToken(Lampa.Storage.get('kinopoisk_refresh_token', ''), true);
        }

        function add() {
            var button = $("<li class=\"menu__item selector\">\n            <div class=\"menu__ico\">\n                <svg width=\"239\" height=\"239\" viewBox=\"0 0 239 239\" fill=\"currentColor\" xmlns=\"http://www.w3.org/2000/svg\" xml:space=\"preserve\"><path fill=\"currentColor\" d=\"M215 121.415l-99.297-6.644 90.943 36.334a106.416 106.416 0 0 0 8.354-29.69z\" /><path fill=\"currentColor\" d=\"M194.608 171.609C174.933 197.942 143.441 215 107.948 215 48.33 215 0 166.871 0 107.5 0 48.13 48.33 0 107.948 0c35.559 0 67.102 17.122 86.77 43.539l-90.181 48.07L162.57 32.25h-32.169L90.892 86.862V32.25H64.77v150.5h26.123v-54.524l39.509 54.524h32.169l-56.526-57.493 88.564 46.352z\" /><path d=\"M206.646 63.895l-90.308 36.076L215 93.583a106.396 106.396 0 0 0-8.354-29.688z\" fill=\"currentColor\"/></svg>\n            </div>\n            <div class=\"menu__text\">".concat(manifest.name, "</div>\n        </li>"));
            button.on('hover:enter', function() {
                if(Lampa.Storage.get('kinopoisk_access_token', '') == '') { // initial authorization needed
                    getDeviceCode();
                }
                Lampa.Activity.push({
                    url: '',
                    title: manifest.name,
                    component: 'kinopoisk',
                    page: 1
                });
            });
            $('.menu .menu__list').eq(0).append(button);
            // $('.head__actions').eq(0).append(button);
        }
        if(window.appready) add();
        else {
            Lampa.Listener.follow('app', function(e) {
                if(e.type == 'ready') add();
            });
        }
        // SETTINGS
        if(!window.lampa_settings.kinopoisk) { // re-use kinopoisk_ratings element, if exists
            Lampa.SettingsApi.addComponent({
                component: 'kinopoisk',
                icon: '<svg width=\"239\" height=\"239\" viewBox=\"0 0 239 239\" fill=\"currentColor\" xmlns=\"http://www.w3.org/2000/svg\" xml:space=\"preserve\"><path fill=\"currentColor\" d=\"M215 121.415l-99.297-6.644 90.943 36.334a106.416 106.416 0 0 0 8.354-29.69z\" /><path fill=\"currentColor\" d=\"M194.608 171.609C174.933 197.942 143.441 215 107.948 215 48.33 215 0 166.871 0 107.5 0 48.13 48.33 0 107.948 0c35.559 0 67.102 17.122 86.77 43.539l-90.181 48.07L162.57 32.25h-32.169L90.892 86.862V32.25H64.77v150.5h26.123v-54.524l39.509 54.524h32.169l-56.526-57.493 88.564 46.352z\" /><path d=\"M206.646 63.895l-90.308 36.076L215 93.583a106.396 106.396 0 0 0-8.354-29.688z\" fill=\"currentColor\"/></svg>',
                name: 'Кинопоиск'
            });
        }
        Lampa.SettingsApi.addParam({
            component: 'kinopoisk',
            param: {
                type: 'title'
            },
            field: {
                name: 'Аккаунт',
            }
        })
        var kinopoisk_email = Lampa.Storage.get('kinopoisk_email', false);
        Lampa.SettingsApi.addParam({
            component: 'kinopoisk',
            param: {
                type: 'button',
                name: 'kinopoisk_auth'
            },
            field: {
                name: kinopoisk_email ? kinopoisk_email : 'Авторизоваться',
            },
            onChange: () => {
                if (Lampa.Storage.get('kinopoisk_email', false)) { // user authorized
                    Lampa.Select.show({
                        title: 'Выйти из аккаунта',
                        items: [{
                            title: 'Да',
                            confirm: true
                        }, {
                            title: 'Нет'
                        }],
                        onSelect: (a) => {
                            if(a.confirm) {
                                Lampa.Storage.set('kinopoisk_email', '');
                                Lampa.Storage.set('kinopoisk_access_token', '');
                                Lampa.Storage.set('kinopoisk_refresh_token', '');
                                // Lampa.Storage.set('kinopoisk_movies', []);
                                Lampa.Storage.set('kinopoisk_token_expires', 0); 
                                $('div[data-name="kinopoisk_auth"]').find('.settings-param__name').text('Авторизоваться');                           
                            }

                            Lampa.Controller.toggle('settings_component');
                        },
                        onBack: ()=>{
                            Lampa.Controller.toggle('settings_component');
                        },
                    })
                } else { // user not authorized
                    Lampa.Controller.toContent(); // hide settings menu
                    getDeviceCode(); // start auth process
                }
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'kinopoisk',
            param: {
                type: 'title'
            },
            field: {
                name: 'Список Буду смотреть',
            }
        })
        Lampa.SettingsApi.addParam({
            component: 'kinopoisk',
            param: {
                name: 'kinopoisk_add_to_favorites',
                type: 'trigger',
                default: false
            },
            field: {
                name: 'Добавлять в Избранное',
                description: 'Будущие, еще не вышедшие релизы добавляются в список Позже'
            }
        })        
        Lampa.SettingsApi.addParam({
            component: 'kinopoisk',
            param: {
                type: 'button',
                name: 'kinopoisk_delete_cache'
            },
            field: {
                name: 'Очистить кэш фильмов',
                description: 'Необходимо при возникновении проблем'
            },
            onChange: () => {
                Lampa.Storage.set('kinopoisk_movies', []);
                Lampa.Noty.show('Кэш Кинопоиска очищен');
            }
        });        
    }
    if(!window.kinopoisk_ready) startPlugin();
})();
