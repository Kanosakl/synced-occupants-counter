let myWebSocket

window.addEventListener('beforeunload', async ()=> {
    await myWebSocket.close()
    console.log('Web socket closed')
})

window.addEventListener('load', ()=> {
    let HOST = location.origin.replace(/^http/, 'ws')
     myWebSocket = new WebSocket(HOST);


    let occupants = 0
    let totalAttendees = 0

    myWebSocket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data)
    const {eventName} = data


    switch(eventName){
        case 'initialize':
        case 'change':{
            const {occupants, totalAttendees} = data
            document.querySelector('span.occupants').textContent = occupants
            document.querySelector('span.totalAttendees').textContent = totalAttendees
        }
        break
        
        default:
        break
    }

    });

    myWebSocket.addEventListener('close', (event) => {
        alert('Disconnected from server! Refresh page to reconnect to server.')
    })
})

function incrementOccupant(){
    fetch('/increment')
}

function decrementOccupant(){
    fetch('/decrement')
}

async function setOccupant(){
    const setOccupants = Number.parseInt(document.querySelector('input.set').value)
    const body = JSON.stringify({setOccupants})
    const response = await fetch('/set', {method:'POST', body, headers:{"Content-Type":"application/json"}})
    
    if(!response.ok){
        const responseBody = await response.json()
        alert(JSON.stringify(responseBody))
    }
}

// TODO: handle auto connect if not connected

// TODO: warn user if ws closed