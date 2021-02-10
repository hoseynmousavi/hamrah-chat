import messageController from "../controllers/messageController"

const messageRouter = (app) =>
{
    app.route("/message")
        .post(messageController.sendMessage)
}

export default messageRouter