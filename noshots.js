/**
 * Plugin to remove all Shots functionality from Lampa UI
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
                        // Remove Shots view button
                        const shotsButton = render.find('.shots-view-button, [class*="shots-view"]')
                        if (shotsButton.length) {
                            console.log('No Shots', 'Removed Shots button from full view')
                            shotsButton.remove()
                        }
                    }
                }
            })
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
                <style id="remove-shots-styles">
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
            }, 500)
        }

        // Remove Shots from player
        function removeShotsPlayerIntegration() {
            // Listen for player events and remove Shots elements
            Lampa.Listener.follow('player', (e) => {
                if (e.type === 'render' || e.type === 'ready' || e.type === 'open') {
                    setTimeout(() => {
                        // Remove Shots segments from player
                        $('.shots-player-segments, .shots-player-recorder, [class*="shots-player"]').remove()
                        // Also remove from player panel
                        if (Lampa.PlayerPanel && Lampa.PlayerPanel.render) {
                            Lampa.PlayerPanel.render().find('.shots-player-segments, [class*="shots-player"]').remove()
                        }
                    }, 100)
                }
            })
            
            // Also periodically check and remove Shots elements from player
            setInterval(() => {
                $('.shots-player-segments, .shots-player-recorder, [class*="shots-player"]').remove()
                if (Lampa.PlayerPanel && Lampa.PlayerPanel.render) {
                    Lampa.PlayerPanel.render().find('.shots-player-segments, [class*="shots-player"]').remove()
                }
            }, 1000)
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
