require('dotenv').config()
const {Server:WebSocketServer} = require('ws')
const http = require('http')
const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000

let occupants = 0
let totalAttendees = occupants

const getNowISODateTime = ()=> new Date().toISOString();

(async ()=>{
    if(process.env.MONGO_URI) {
        const {Events, mongoose} = require('./db')
        await mongoose.connect(process.env.MONGO_URI)
        console.log(`${getNowISODateTime()} Connected to DB`)
        
        const myEvent = await Events.findOne({name:process.env.EVENT_NAME})
        
        occupants = myEvent.occupants
        totalAttendees = myEvent.totalAttendees
        console.log(`${getNowISODateTime()} Found event: ${process.env.EVENT_NAME}, occupants: ${occupants}, totalAttendees: ${totalAttendees}`)

        const updateDBOccupants = async () => {
            myEvent.occupants = occupants
            myEvent.totalAttendees = totalAttendees
            await myEvent.save()
            console.log(`${getNowISODateTime()} DB update - occupants: ${myEvent.occupants}, totalAttendees: ${myEvent.totalAttendees}`)
        }
        const updateDBInterval = setInterval(updateDBOccupants,process.env.UPDATE_INTERVAL)

        const disconnectDB = async () => {
            console.log(`${getNowISODateTime()} Server shutdown initiated`)

            clearInterval(updateDBInterval)
            console.log(`${getNowISODateTime()} Cleared update db intervals`)
            
            console.log(`${getNowISODateTime()} Updating DB before server shutdown`)
            await updateDBOccupants()

            await mongoose.disconnect()
            console.log(`${getNowISODateTime()} DB connection closed`)
            process.exit()
        } 
        
        process.on('beforeExit', disconnectDB)
        process.on('SIGINT', disconnectDB)
        process.on('SIGTERM', disconnectDB)
        process.on('SIGKILL', disconnectDB)
        process.on('uncaughtException', disconnectDB)
    }


    app.use(express.json())

    app.get('/increment', (req, res) =>{
        totalAttendees++
        broadcastOccupantsChanges(1)
        res.sendStatus(200)
    })
    
    app.get('/decrement', (req,res)=> {
        if(occupants > 0) broadcastOccupantsChanges(-1)
        res.sendStatus(200)
    })
    
    app.post('/set', (req, res) => {
        const data = req.body
    
        if(!data) return res.status(400).send({error:{message:'No payload provided'}})
    
        const {setOccupants} = data
    
        if(setOccupants < 0) return res.status(400).send({error:{message:'"setOccupants" must be more than 0!'}})
    
        setOccupant(setOccupants)
    
        res.sendStatus(200)
    })
    
    
    app.use(express.static('public'))
    
    
    const server = http.createServer(app)
    const wss = new WebSocketServer({ server });
    
    // Start REST server
    server.listen(PORT, () => {
        console.log(`${getNowISODateTime()} Websocket event broadcaster REST API listening on PORT ${PORT}`)
      });
    
    
      wss.on('connection', (ws, req)=> {
        console.log(`${getNowISODateTime()} WS connected: ${(req.headers['x-forwarded-for'] || '').split(',').pop().trim() ||
        req.socket.remoteAddress}`)
        ws.send(JSON.stringify({eventName: 'initialize', occupants, totalAttendees}))
    })
    
    wss.on('close', (ws, req)=> {
        console.log(`${getNowISODateTime()} WS DISconnected - ${(req.headers['x-forwarded-for'] || '').split(',').pop().trim() ||
        req.socket.remoteAddress}`)
    })
    
    
    function broadcastOccupantsChanges(changes){
        occupants += changes
        const data = JSON.stringify({eventName: 'change', occupants, totalAttendees})
    
        wss.clients.forEach((client) => {
            client.send(data)
          });
    }
    
    function setOccupant(value){
        occupants = value
        console.log(`${getNowISODateTime()} setOccupants called, new occupants value: ${value}`)
    
        const data = JSON.stringify({eventName: 'change', occupants, totalAttendees})
    
        wss.clients.forEach((client) => {
            client.send(data)
          });
    }
})();

