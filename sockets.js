exports.init = function( app ) {    
    var server;

    const options = {
        origins: "dev.dungeonteam.com:* qa.dungeonteam-server.xyz:* dungeonteam-server.xyz:* chat.dungeonteam-server.xyz",
        path:'/socket.io',
        transports:['websocket']
    };
    
    console.log( 'NODE_ENV: ' + process.env.NODE_ENV );

    server = require('http').createServer( app );   

    var port = process.env.PORT || 8081;
    server.once('listening', () => {
        console.log( "server is listening on port: " + port, true );
    });
    server.listen( port );

    const io = require('socket.io').listen( server, options );

    io.sockets.on( 'connection', function(socket) {
        console.log( 'socket.io connection!' );

        socket.on( 'subscribe', function(reqData) {
            console.log( "on 'subscribe'" );

            if( !socket.channelSubscriptions ) {
                socket.channelSubscriptions = [];
            }

            if( socket.channelSubscriptions.indexOf(reqData.channel)===-1 ) {
                socket.channelSubscriptions.push( reqData.channel );
            }

            var numInChannel = 0;
            for( var socketId in io.sockets.sockets ) {
                var subscriptions = io.sockets.sockets[socketId].channelSubscriptions;

                if( subscriptions && subscriptions.indexOf(reqData.channel) > -1 ) {
                    ++numInChannel;
                }
            }

            console.log( "emitting 'subscribed'" );
            socket.emit( 'subscribed', {
                channel: reqData.channel,
                numInChannel 
            });
        });

        socket.on( 'publish', function(reqData) {
            for( var socketId in io.sockets.sockets ) {
                var subscriptions = io.sockets.sockets[socketId].channelSubscriptions;
                if( subscriptions && subscriptions.indexOf(reqData.channel) > -1 ) {
                    io.sockets.sockets[socketId].emit( 'chatMessage', {
                        channel: reqData.channel,
                        message: reqData.message
                    });
                }
            }
        });

        socket.on( 'error', function(data) {
            console.log( "Socket error:" );
            console.log( data );
        });

        socket.emit( 'connected' );
    });
};