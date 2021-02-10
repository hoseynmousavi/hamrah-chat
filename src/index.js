import express from "express"
import fileUpload from "express-fileupload"
import rootRouter from "./routes/rootRouter"
import data from "./data"
import notFoundRooter from "./routes/notFoundRouter"

// Normal Things Never Leave Us Alone ...
const app = express()
app.use(fileUpload({createParentPath: true}))
app.use(express.json())
app.use(express.urlencoded({extended: false}))

// Connecting To DB (data file is private babes 😊)
// mongoose.Promise = global.Promise
// mongoose.connect(data.connectServerDb, {useNewUrlParser: true}).then(() => console.log("connected to db"))

// Add Header To All Responses & Token Things
// addHeaderAndCheckPermissions(app)

// Routing Shits
rootRouter(app)
notFoundRooter(app) // & at the end

// Eventually Run The Server
app.listen(data.port, () => console.log(`hamrah chat is Now Running on Port ${data.port}`))