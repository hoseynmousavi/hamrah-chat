import messageController from "../controllers/messageController"

const messageRouter = (app) =>
{
    app.route("/message/seen")
        .post(messageController.seenMessages)

    app.route("/message")
        .get(messageController.getMessages)
        .post(messageController.sendMessage)

    app.route("/room")
        .get(messageController.getRooms)
}

export default messageRouter