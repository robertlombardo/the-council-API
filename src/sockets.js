const {getEmpireFacetItem} = require('@tools')

const sockets_by_player_id = {}

// mocked DB
const rooms = {
    the_square_0: {
        description: `The center of the square. Around a fountain of cool, clear water flowing over marble blocks are sets of benches, grass lawns and flower beds.`,
        exits: {
            north: {
                to: `the_square_n`
            },
            south: {
                to: `the_square_s`
            },
            east: {
                to: `the_square_e`
            },
            west: {
                to: `the_square_w`
            },
        },
    },
    the_square_n: {
        description: `The north end of the square.`,
        exits: {
            south: {
                to: `the_square_0`
            },
        },
    },
    the_square_s: {
        description: `The south end of the square.`,
        exits: {
            north: {
                to: `the_square_0`
            },
        },
    },
    the_square_e: {
        description: `The east end of the square.`,
        exits: {
            west: {
                to: `the_square_0`
            },
        },
    },
    the_square_w: {
        description: `The west end of the square.`,
        exits: {
            east: {
                to: `the_square_0`
            },
        },
    },
}

exports.init = app => {
    const options = {
        origins    : `localhost:* dev.thecouncil.io:* qa.thecouncil.io:* thecouncil.io:*`,
        transports : [`websocket`]
    }

    const server = require('http').createServer( app )

    var port = process.env.PORT || 8081;
    server.once(`listening`, () => {
        console.info(`\nThe Commons - API server is listening on port: ${port}`)
    });
    server.listen(port)

    const io = require('socket.io').listen(server, options)

    io.sockets.on(`connection`, socket => {

        socket.on(`disconnect`, data => {
            const {player} = socket
            if (player) {
                if (player.room.players) delete player.room.players[player.id]
                socket.to(player.room_id).emit(`player_left_room`, {player, exit_key: `void`})

                socket.leave(player.room_id)
                delete sockets_by_player_id[player.id]
            }
        })

        socket.on(`error`, data => {
            console.error({socket_err: data})
        })

        socket.on(`player_say`, data => {
            io.in(socket.player.room_id).emit(`player_said`, {
                player  : socket.player,
                text    : data.command_body,
            })
        })

        socket.on(`player_go`, data => {
            const {player} = socket
            const old_room = Object.assign({}, player.room)
            const exit_key = data.command_body
            const exit     = old_room.exits[exit_key]

            if (exit) {
                const old_room_id = player.room_id
                const new_room_id = exit.to

                socket.join(new_room_id)
                io.in(old_room_id).emit(`player_left_room`, {player, exit_key})
                socket.leave(old_room_id)

                player.room_id = new_room_id
                player.room    = rooms[new_room_id]

                const {id, display_name} = player
                player.room.players = (player.room.players || []).concat({id, display_name})

                socket.emit(`player_state`, player)
                socket.to(new_room_id).emit(`player_joined_room`, {player})
            } 
        })

        socket.on(`build_construct`, data => {
            try {
                const {
                    construct_key,
                    product_key,
                }                      = data
                const {empire}         = socket.player
                const construct        = socket.player.empire.constructs[construct_key]
                const {cost}           = construct
                const cost_facet_items = {}

                if (construct.build_start_time) return socket.emit(`already_building`, {construct_key})

                // check whether the player has all required resources to build
                for (let cost_key in cost) {
                    cost_facet_items[cost_key] = getEmpireFacetItem(empire, cost_key)
                    
                    if (cost_facet_items[cost_key].count < cost[cost_key]) return socket.emit(`not_enough_resources`, {
                        command: `build_construct`,
                        construct_key, 
                    })
                }

                // exact the costs & kick off construct build
                for (let cost_key in cost) cost_facet_items[cost_key].count -= cost[cost_key]
                construct.build_start_time  = new Date().getTime()
                construct.build_product_key = product_key 

                return socket.emit(`construct_build_started`, {construct_key, player: socket.player})

            } catch (build_construct_err) {
                console.error({build_construct_err})
                socket.emit(`error`, {build_construct_err})
            }
        })

        socket.emit(`connected`)

        // mocked get player data
        setTimeout(() => {
            const now = new Date().getTime()

            const test_uid = Math.floor(Math.random() * 100)
            const player = socket.player = {
                id              : test_uid,
                display_name    : `test_user_${test_uid}`,
                gender          : `male`,
                chat_text_color : `#ffffff`,
                room_id         : `the_square_0`,
                room            : rooms[`the_square_0`],
                empire          : {
                    constructs: {
                        camps     : {
                            count      : 2,
                            build_time : 1000,
                            cost       : {
                                food  : 50,
                                wood  : 20,
                                pelts : 10,
                            },
                            products   : {
                                hunters: {
                                    count        : 1,
                                    last_product : now,
                                    interval     : 30 * 1000,
                                },
                                gatherers: {
                                    count        : 1,
                                    last_product : now,
                                    interval     : 20 * 1000,
                                },
                            }
                        },
                    },
                    citizens: {
                        hunters   : {
                            count    : 1,
                            products : {
                                food: {
                                    count       : 1,                                    
                                    last_product: now,
                                    interval    : 11 * 1000,
                                },
                                pelts: {
                                    count       : 1,                                    
                                    last_product: now,
                                    interval    : 17 * 1000,
                                },
                            }
                        },
                        gatherers : {
                            count    : 3,
                            products : {
                                food: {
                                    count        : 1,
                                    last_product : now,
                                    interval     : 7 * 1000,
                                },
                                wood: {
                                    count        : 1,
                                    last_product : now,
                                    interval     : 6 * 1000,
                                },
                            }
                        },
                    },
                    resources: {
                        food      : {count: 47},
                        wood      : {count: 15},
                        pelts     : {count: 4},
                        leather   : {count: 2},
                    }
                }
            }
            sockets_by_player_id[test_uid] = socket

            const {id, display_name} = player
            if (!player.room.players) player.room.players = {}
            player.room.players[id] = {display_name}

            socket.emit(`player_state`, player)

            socket.join(player.room_id)
            socket.to(player.room_id).emit(`player_joined_room`, {player})
        }, 500)
    })
}

const UPDATE_INTERVAL = 200 // ms
let last_update       = new Date().getTime()
let now, delta
const update = () => {
    now         = new Date().getTime()
    delta       = now - last_update
    last_update = now

    for (let socket_key in sockets_by_player_id) {
        const socket   = sockets_by_player_id[socket_key]
        const {player} = socket
        const {empire} = player

        /* iterate over all empire facet items, looking for:
         *   - completed producer intervals
         *   - completed build intervals
         */
        for (let empire_facet_key in empire) {
            const empire_facet = empire[empire_facet_key]

            for (let facet_item_key in empire_facet) {
                const facet_item       = empire_facet[facet_item_key]
                facet_item.last_update = now

                if (facet_item.products) {
                    const producer   = facet_item
                    const {products} = producer

                    for (let product_key in products) {
                        const product = products[product_key]

                        if (now - product.last_product >= product.interval) { // producer interval is complete
                            // add the product & restart interval
                            const gainer_item     = getEmpireFacetItem(empire, product_key)
                            const {count}         = products[product_key]
                            product.last_product  = now
                            gainer_item.count     += count * (empire_facet_key === `citizens` ? producer.count : 1)

                            socket.emit(`product`, {
                                product_key,
                                count,
                                player,
                            })
                        }
                    }
                }

                if (empire_facet_key === `constructs`) {
                    if (facet_item.build_start_time && now - facet_item.build_start_time >= facet_item.build_time) { // build complete
                        // TODO - increment interval?

                        // increment the facet item count & product count, and stop building
                        facet_item.count++
                        facet_item.products[facet_item.build_product_key].count++
                        delete facet_item.build_product_key
                        delete facet_item.build_start_time

                        socket.emit(`construct_build_complete`, {
                            facet_item_key,
                            player
                        })
                    }
                }
            }
        }
    }
}
setInterval(update, UPDATE_INTERVAL)
