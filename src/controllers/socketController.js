import authController from "./authController"

let clients = {}
let admins = {}

const startSocket = wss =>
{
    wss.on("connection", (ws, req) =>
    {
        if (req.url.includes("/?room_id="))
        {
            const params = req.url.split("/?room_id=")[1]
            const roomId = params.split("&unique=")[0]
            const unique = params.split("&unique=")[1]
            if (clients[roomId]) clients[roomId][unique] = {roomId, unique, ws}
            else clients[roomId] = {[unique]: {roomId, unique, ws}}
            listen(ws)
            ws.on("close", () => clients[roomId] && delete clients[roomId][unique])
        }
        else if (req.url.includes("/?token="))
        {
            const params = decodeURI(req.url.split("/?token=")[1])
            const token = params.split("&unique=")[0]
            const unique = params.split("&unique=")[1]
            authController.verifyToken({token, checkStaff: true})
                .then(user =>
                {
                    const id = user.username
                    if (admins[id]) admins[id][unique] = {id, unique, ws}
                    else admins[id] = {[unique]: {id, unique, ws}}
                    listen(ws)
                    ws.on("close", () => admins[id] && delete admins[id][unique])
                })
                .catch(() => ws.send(JSON.stringify({message: "شما پرمیشن لازم را ندارید!", kind: 403})))
        }
        else
        {
            ws.send(JSON.stringify({message: "ورودی های شما اشتباه است!", kind: 400}))
            ws.close()
        }
    })
}

const listen = ws =>
{
    ws.on("message", data =>
    {
        try
        {
            const parsedData = JSON.parse(data)
            if (parsedData.kind === "ping") ws.send(JSON.stringify({message: new Date().toISOString(), kind: "ping"}))
        }
        catch (e)
        {
            console.log(e)
        }
    })
}

const sendMessage = ({message, room, unique}) =>
{
    if (message.sender === "client")
    {
        Object.values(admins).forEach(item => Object.values(item).forEach(item => item.ws.send(JSON.stringify({message: {message, room}, kind: "chat"}))))
        clients[message.room_id] && Object.values(clients[message.room_id]).forEach(item => item.unique !== unique && item.ws.send(JSON.stringify({message: {message, room}, kind: "chat"})))
    }
    else if (message.sender === "admin")
    {
        clients[message.room_id] && Object.values(clients[message.room_id]).forEach(item => item.ws.send(JSON.stringify({message: {message, room}, kind: "chat"})))
        Object.values(admins).forEach(item => Object.values(item).forEach(item => item.unique !== unique && item.ws.send(JSON.stringify({message: {message, room}, kind: "chat"}))))
    }
}

const sendSeen = ({room_id, sender, unique}) =>
{
    if (sender === "client")
    {
        Object.values(admins).forEach(item => Object.values(item).forEach(item => item.ws.send(JSON.stringify({message: {room_id, sender}, kind: "seen"}))))
        clients[room_id] && Object.values(clients[room_id]).forEach(item => item.unique !== unique && item.ws.send(JSON.stringify({message: {room_id, sender}, kind: "seen"})))
    }
    else if (sender === "admin")
    {
        clients[room_id] && Object.values(clients[room_id]).forEach(item => item.ws.send(JSON.stringify({message: {room_id, sender}, kind: "seen"})))
        Object.values(admins).forEach(item => Object.values(item).forEach(item => item.unique !== unique && item.ws.send(JSON.stringify({message: {room_id, sender}, kind: "seen"}))))
    }
}

const isOnline = room_id => !!clients[room_id]

const socketController = {
    startSocket,
    sendMessage,
    sendSeen,
    isOnline,
}

export default socketController