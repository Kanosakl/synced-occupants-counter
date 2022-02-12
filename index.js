require('dotenv-safe').config()
const {Server:WebSocketServer} = require('ws')
const http = require('http')
const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000

let occupants = 0
let totalAttendees = occupants

app.use(express.json())

app.get('/increment', (req, res) =>{
    totalAttendees++
    broadcastOccupantsChanges(1)
    res.send(200)
})

app.get('/decrement', (req,res)=> {
    if(occupants > 0) broadcastOccupantsChanges(-1)
    res.send(200)
})

app.post('/set', (req, res) => {
    const data = req.body

    if(!data) return res.status(400).send({error:{message:'No payload provided'}})

    const {setOccupants} = data

    if(setOccupants < 0) return res.status(400).send({error:{message:'"setOccupants" must be more than 0!'}})

    setOccupant(setOccupants)

    res.status(200)
})


app.use(express.static('public'))


const server = http.createServer(app)
// server.on('request',app)
const wss = new WebSocketServer({ server });

// Start REST server
server.listen(PORT, () => {
    console.log(`Websocket event broadcaster REST API listening on PORT ${PORT}`)
  });


  wss.on('connection', (ws, req)=> {
    console.log(`WS connected: ${(req.headers['x-forwarded-for'] || '').split(',').pop().trim() ||
    req.socket.remoteAddress}`)
    ws.send(JSON.stringify({eventName: 'initialize', occupants, totalAttendees}))
})

wss.on('close', (ws, req)=> {
    console.log(`WS DISconnected: ${(req.headers['x-forwarded-for'] || '').split(',').pop().trim() ||
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
    console.log(`setOccupants called, new occupants value: ${value}`)

    const data = JSON.stringify({eventName: 'change', occupants, totalAttendees})

    wss.clients.forEach((client) => {
        client.send(data)
      });
}

//TODO: Save to DB/file every once in a while
//TODO: on start, if DB/file exist, read from there
//TODO: have server up on heroku for testing