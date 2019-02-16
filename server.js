// enable `require('@alias')` syntax
require('module-alias/register')  

const express    = require('express')
const bodyParser = require('body-parser')
const sockets    = require('@src/sockets')

const app = express()

//Here we are configuring express to use body-parser as middle-ware.
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

app.use((req, res, next) => {
    res.header(`Access-Control-Allow-Headers`,  `Origin, X-Requested-With, Content-Type, Accept`)
    res.header(`Access-Control-Allow-Origin`,   `*`)
    res.header(`Access-Control-Allow-Methods`,  `GET,POST,OPTIONS`)
    res.header(`Access-Control-Expose-Headers`, `*`)
    res.header(`Content-Type`,                  `text/plain`)
    res.header(`Upgrade`,                       `$http_upgrade` )
    res.header(`Connection`,                    `upgrade` )

    if(req.method === `OPTIONS`) return res.sendStatus(200)
    else return next()
})

sockets.init(app)
