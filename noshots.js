/**
 * No Shots Plugin - Removes all Shots functionality from Lampa UI
 */

function startPlugin() {
    function init() {
        // Disable Shots content rows via storage (this prevents them from showing)
        Lampa.Storage.set('content_rows_shots_main', 'false')
        
        // Intercept ContentRows.add to block Shots rows from being added
        const originalAdd = Lampa.ContentRows.add
        Lampa.ContentRows.add = function(row) {
            // Check if this is a Shots-related content row
            if (row) {
                // Check by name
                if (row.name === 'shots_main') {
                    console.log('No Shots', 'Blocked Shots content row:', row.name)
                    return // Don't add this row
                }
                
                // Check by screen and call function content for bookmarks screen
                if (row.screen && Lampa.Arrays.isArray(row.screen) && row.screen.indexOf('bookmarks') >= 0) {
                    if (typeof row.call === 'function') {
                        const callStr = row.call.toString()
                        // Check if the call function references Shots-specific functions
                        // The Shots bookmarks row uses Favorite.get() and Created.get() from shots plugin
                        if (callStr.indexOf('shots_title_favorite') >= 0 || 
                            callStr.indexOf('shots_title_created') >= 0 ||
                            (callStr.indexOf('Favorite.get') >= 0 && callStr.indexOf('Created.get') >= 0 && 
                             callStr.indexOf('shots') >= 0)) {
                            // This is the Shots bookmarks row
                            console.log('No Shots', 'Blocked Shots bookmarks content row')
                            return // Don't add this row
                        }
                    }
                }
            }
            
            // Allow other rows to be added normally
            return originalAdd.call(this, row)
        }
        
        // Also intercept ContentRows.call to filter out any Shots rows that might have been added before this plugin loaded
        const originalCall = Lampa.ContentRows.call
        Lampa.ContentRows.call = function(screen, params, calls) {
            // Ensure Shots rows are disabled in storage
            Lampa.Storage.set('content_rows_shots_main', 'false')
            
            // Call original implementation
            const result = originalCall.call(this, screen, params, calls)
            
            // Filter out any Shots-related calls from the calls array
            if (Lampa.Arrays.isArray(calls)) {
                for (let i = calls.length - 1; i >= 0; i--) {
                    const callItem = calls[i]
                    if (callItem && typeof callItem === 'object') {
                        // Check if this is a Shots-related content row result
                        if (callItem.title === 'Shots' || 
                            (callItem.icon_svg && callItem.icon_svg.indexOf('sprite-shots') >= 0) ||
                            (callItem.results && Lampa.Arrays.isArray(callItem.results) && 
                             callItem.results.length > 0 && callItem.results[0].type === 'shot')) {
                            console.log('No Shots', 'Filtered out Shots content row from calls')
                            calls.splice(i, 1)
                        }
                    }
                }
            }
            
            return result
        }

        // Remove Shots menu button
        function removeShotsMenuButton() {
            // Wait for menu to be ready
            Lampa.Listener.follow('menu', (e) => {
                if (e.type === 'end' || e.type === 'start') {
                    setTimeout(() => {
                        // Remove any menu buttons containing "Shots" text or icon
                        const menu = Lampa.Menu.render()
                        if (menu && menu.length) {
                            menu.find('.menu__item').each(function() {
                                const $item = $(this)
                                const text = $item.find('.menu__text').text()
                                const hasShotsIcon = $item.find('use[xlink\\:href="#sprite-shots"]').length > 0
                                
                                if ((text && text.toLowerCase().indexOf('shots') >= 0) || hasShotsIcon) {
                                    console.log('No Shots', 'Removed Shots menu button')
                                    $item.remove()
                                }
                            })
                        }
                    }, 100)
                }
            })
            
            // Also check periodically for dynamically added buttons
            setInterval(() => {
                const menu = Lampa.Menu.render()
                if (menu && menu.length) {
                    menu.find('.menu__item').each(function() {
                        const $item = $(this)
                        const text = $item.find('.menu__text').text()
                        const hasShotsIcon = $item.find('use[xlink\\:href="#sprite-shots"]').length > 0
                        
                        if ((text && text.toLowerCase().indexOf('shots') >= 0) || hasShotsIcon) {
                            $item.remove()
                        }
                    })
                }
            }, 1000)
        }

        // Remove Shots button from full view
        function removeShotsFullViewButton() {
            Lampa.Listener.follow('full', (e) => {
                if (e.type === 'complite') {
                    const render = e.object.activity.render()
                    if (render && render.length) {
                        // Remove Shots view button from buttons container
                        const shotsButton = render.find('.shots-view-button, [class*="shots-view"], .view--online.shots-view-button')
                        if (shotsButton.length) {
                            console.log('No Shots', 'Removed Shots button from full view')
                            shotsButton.remove()
                        }
                        
                        // Also check buttons container specifically
                        const buttonsContainer = render.find('.buttons--container')
                        if (buttonsContainer.length) {
                            buttonsContainer.find('.shots-view-button, [class*="shots-view"], .view--online.shots-view-button').remove()
                        }
                    }
                }
            })
            
            // Also intercept Select.show to filter out Shots items from Watch menu
            if (Lampa.Select && Lampa.Select.show) {
                const originalSelectShow = Lampa.Select.show
                Lampa.Select.show = function(options) {
                    if (options && Lampa.Arrays.isArray(options.items)) {
                        // Filter out Shots items from the menu
                        options.items = options.items.filter(item => {
                            // Check if item is Shots-related
                            if (item.btn) {
                                const btn = $(item.btn)
                                const isShots = btn.hasClass('shots-view-button') || 
                                               btn.hasClass('view--online') && btn.find('use[xlink\\:href="#sprite-shots"]').length > 0 ||
                                               btn.find('.shots-view-button__title').length > 0 ||
                                               (item.title && item.title.toLowerCase().indexOf('shots') >= 0)
                                
                                if (isShots) {
                                    console.log('No Shots', 'Filtered out Shots item from Watch menu')
                                    return false
                                }
                            }
                            
                            // Also check by title or icon
                            if (item.title && item.title.toLowerCase().indexOf('shots') >= 0) {
                                return false
                            }
                            
                            if (item.icon && item.icon.indexOf('sprite-shots') >= 0) {
                                return false
                            }
                            
                            return true
                        })
                    }
                    
                    return originalSelectShow.call(this, options)
                }
            }
            
            // Periodically check and remove Shots buttons
            setInterval(() => {
                $('.shots-view-button, .view--online.shots-view-button, [class*="shots-view"]').remove()
                $('.buttons--container .shots-view-button, .buttons--container .view--online.shots-view-button').remove()
            }, 500)
        }

        // Remove Shots components
        function removeShotsComponents() {
            // Remove component registrations if possible
            if (Lampa.Component && Lampa.Component.remove) {
                ['shots_list', 'shots_card', 'shots_channel'].forEach(compName => {
                    try {
                        Lampa.Component.remove(compName)
                        console.log('No Shots', 'Removed component:', compName)
                    } catch (e) {
                        // Component.remove might not exist, that's okay
                    }
                })
            }
        }

        // Hide Shots CSS and UI elements
        function hideShotsUI() {
            // Add CSS to hide all Shots-related elements
            $('body').append(`
                <style id="no-shots-styles">
                    /* Hide Shots content rows */
                    .content-rows [data-type="favorite"][data-title*="Shots"],
                    .content-rows [data-type="created"][data-title*="Shots"],
                    .line[data-name="shots_main"],
                    .line[data-type*="shots"],
                    
                    /* Hide Shots buttons */
                    .shots-view-button,
                    .full-start__button.shots-view-button,
                    [class*="shots-view"],
                    
                    /* Hide Shots player elements */
                    .shots-player-segments,
                    .shots-player-recorder,
                    .shots-player--recording,
                    [class*="shots-player"],
                    [data-controller="player_panel"]:has(circle[fill="#FF0707"]),
                    [data-controller="player_panel"]:has(circle[fill="#ff0707"]),
                    [data-controller="player_panel"]:has(circle[fill="red"]),
                    .player-panel__settings + [data-controller="player_panel"],
                    
                    /* Hide Shots modals and overlays */
                    .shots-modal,
                    .shots-lenta,
                    [class*="shots-modal"],
                    [class*="shots-lenta"],
                    
                    /* Hide any other Shots elements */
                    [class*="shots-"],
                    [id*="shots-"],
                    [data-shots]
                    {
                        display: none !important;
                        visibility: hidden !important;
                    }
                </style>
            `)
            
            // Also use JavaScript to remove elements that might not be caught by CSS
            setInterval(() => {
                $('[class*="shots-"], [id*="shots-"], [data-shots], .shots-view-button, .shots-player-segments, .shots-player-recorder, .shots-modal, .shots-lenta').remove()
                // Remove red Shots button from player panel (it's a div, not button)
                $('[data-controller="player_panel"]').each(function() {
                    const $btn = $(this)
                    const hasRedCircle = $btn.find('circle[fill="#FF0707"]').length > 0 || 
                                        $btn.find('circle[fill="#ff0707"]').length > 0 ||
                                        $btn.find('circle[fill="red"]').length > 0 ||
                                        ($btn.find('svg circle').length === 2 && $btn.find('svg circle').eq(1).attr('fill') === '#FF0707')
                    if (hasRedCircle) {
                        $btn.remove()
                    }
                })
            }, 200)
        }

        // Remove Shots from player
        function removeShotsPlayerIntegration() {
            // Function to remove Shots button from player panel
            function removeShotsPlayerButton() {
                // The button is a div with class "button selector" and data-controller="player_panel"
                // It's added after .player-panel__settings
                const selector = '[data-controller="player_panel"]'
                
                // Check in PlayerPanel if available
                if (Lampa.PlayerPanel && Lampa.PlayerPanel.render) {
                    const panel = Lampa.PlayerPanel.render()
                    panel.find(selector).each(function() {
                        const $btn = $(this)
                        // Check if it has the red circle SVG (Shots button)
                        const hasRedCircle = $btn.find('circle[fill="#FF0707"]').length > 0 || 
                                            $btn.find('circle[fill="#ff0707"]').length > 0 ||
                                            $btn.find('circle[fill="red"]').length > 0 ||
                                            $btn.find('svg circle').length === 2 && $btn.find('svg circle').eq(1).attr('fill') === '#FF0707'
                        if (hasRedCircle) {
                            console.log('No Shots', 'Removed Shots record button from player panel')
                            $btn.remove()
                        }
                    })
                    // Also remove by class if it has shots-related classes
                    panel.find('.shots-player-segments, [class*="shots-player"]').remove()
                }
                
                // Also check globally in case it's not in the panel yet
                $(selector).each(function() {
                    const $btn = $(this)
                    // Check if it has the red circle SVG (Shots button)
                    const hasRedCircle = $btn.find('circle[fill="#FF0707"]').length > 0 || 
                                        $btn.find('circle[fill="#ff0707"]').length > 0 ||
                                        $btn.find('circle[fill="red"]').length > 0 ||
                                        ($btn.find('svg circle').length === 2 && $btn.find('svg circle').eq(1).attr('fill') === '#FF0707')
                    if (hasRedCircle) {
                        console.log('No Shots', 'Removed Shots record button (global search)')
                        $btn.remove()
                    }
                })
            }
            
            // Intercept PlayerPanel.render to catch when button is added
            if (Lampa.PlayerPanel && Lampa.PlayerPanel.render) {
                const originalRender = Lampa.PlayerPanel.render
                Lampa.PlayerPanel.render = function() {
                    const result = originalRender.call(this)
                    // Remove button after render
                    setTimeout(removeShotsPlayerButton, 10)
                    return result
                }
            }
            
            // Listen for player events and remove Shots elements
            Lampa.Listener.follow('player', (e) => {
                if (e.type === 'render' || e.type === 'ready' || e.type === 'open' || e.type === 'start') {
                    setTimeout(() => {
                        // Remove Shots segments from player
                        $('.shots-player-segments, .shots-player-recorder, [class*="shots-player"]').remove()
                        // Remove Shots button from player panel
                        removeShotsPlayerButton()
                    }, 50)
                }
            })
            
            // Also listen for PlayerPanel events if available
            if (Lampa.PlayerPanel && Lampa.PlayerPanel.listener) {
                Lampa.PlayerPanel.listener.follow('render', () => {
                    setTimeout(removeShotsPlayerButton, 10)
                })
            }
            
            // Also periodically check and remove Shots elements from player (more frequent)
            setInterval(() => {
                $('.shots-player-segments, .shots-player-recorder, [class*="shots-player"]').remove()
                removeShotsPlayerButton()
            }, 200)
        }

        // Initialize all removal functions
        removeShotsMenuButton()
        removeShotsFullViewButton()
        removeShotsComponents()
        hideShotsUI()
        removeShotsPlayerIntegration()

        console.log('No Shots', 'Initialized - All Shots functionality will be removed')
    }

    // Wait for app to be ready
    if (window.appready) {
        init()
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type == 'ready') init()
        })
    }
}

startPlugin()
