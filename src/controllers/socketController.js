import axios from "axios"
import data from "../data"

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

            ws.on("close", () => clients[roomId] && delete clients[roomId])
        }
        else if (req.url.includes("/?token="))
        {
            const token = req.url.split("/?token=")[1]
            console.log(token)
            axios.get(data.REST_URL + "/u/verify-token/", {headers: {"Authorization": token}})
                .then(response =>
                {
                    console.log(response.data)
                })
                .catch(err =>
                {
                    console.log(err?.response)
                })
        }
    })
}

const sendMessage = message =>
{
    if (message.sender === "client")
    {
        Object.values(admins).forEach(item =>
            item.ws.send(JSON.stringify(message)),
        )
    }
    else if (message.sender === "admin")
    {
        clients[message.room_id].ws(JSON.stringify(message))
    }
}

const socketController = {
    startSocket,
    sendMessage,
}

export default socketController