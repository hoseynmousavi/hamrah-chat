import express from "express"
import fileUpload from "express-fileupload"
import mongoose from "mongoose"
import cors from "cors"
import webSocket from "ws"
import rootRouter from "./routes/rootRouter"
import data from "./data"
import notFoundRooter from "./routes/notFoundRouter"
import messageRouter from "./routes/messageRouter"
import socketController from "./controllers/socketController"
import tokenHelper from "./functions/tokenHelper"

// Normal Things Never Leave Us Alone ...
const app = express()
app.use(cors())
app.use(fileUpload({createParentPath: true}))
app.use(express.json())
app.use(express.urlencoded({extended: false}))

// Connecting To DB (data file is private babes 😊)
mongoose.Promise = global.Promise
mongoose.connect(data.connectServerDb, {useNewUrlParser: true}).then(() => console.log("connected to db"))

// Run The Server & Socket
const wss = new webSocket.Server({server: app.listen(data.port, () => console.log(`hamrah chat is Now Running on Port ${data.port}`))})
socketController.startSocket(wss)

// app.route("/test")
//     .post((req, res) =>
//     {
//         tokenHelper.decodeToken(req.body.token)
//             .then((payload) => res.send(payload))
//             .catch((err) => res.send(err))
//     })

// Routing Shits
rootRouter(app)
messageRouter(app, wss)
notFoundRooter(app) // & at the end