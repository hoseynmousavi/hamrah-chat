import authController from "./authController"

let clients = {}
let admins = {}

const startSocket = wss =>
{
    wss.on("connection", (ws, req) =>
    {
        if (req.url.includes("/?room_id="))
        {
            const roomId = req.url.split("/?room_id=")[1]
            clients[roomId] = {roomId, ws}

            listen(ws)

            ws.on("close", () => clients[roomId] && delete clients[roomId])
        }
        else if (req.url.includes("/?token="))
        {
            const token = decodeURI(req.url.split("/?token=")[1])
            authController.verifyToken({token, checkStaff: true})
                .then(user =>
                {
                    const id = user.username
                    admins[id] = {id, ws}
                    listen(ws)
                    ws.on("close", () => clients[id] && delete clients[id])
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

const sendMessage = message =>
{
    if (message.message.sender === "client") Object.values(admins).forEach(item => item.ws.send(JSON.stringify({message, kind: "chat"})))
    else if (message.message.sender === "admin") clients[message.message.room_id] && clients[message.message.room_id].ws.send(JSON.stringify({message, kind: "chat"}))
}

const sendSeen = ({room_id, sender}) =>
{
    if (sender === "client")
    {
        Object.values(admins).forEach(item =>
            item.ws.send(JSON.stringify({message: room_id, kind: "seen"})),
        )
    }
    else if (sender === "admin")
    {
        clients[room_id] && clients[room_id].ws.send(JSON.stringify({message: room_id, kind: "seen"}))
    }
}

const socketController = {
    startSocket,
    sendMessage,
    sendSeen,
}

export default socketController