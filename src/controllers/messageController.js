import mongoose from "mongoose"
import roomModel from "../models/roomModel"
import messageModel from "../models/messageModel"
import socketController from "./socketController"

const room = mongoose.model("room", roomModel)
const message = mongoose.model("message", messageModel)

const sendMessage = (req, res) =>
{
    const {content, room_id, sender} = req.body
    if (content && room_id && sender)
    {
        // TODO if sender is admin, we should verify that
        room.find({_id: room_id}, (err, rooms) =>
        {
            if (err) res.status(400).send({message: err})
            else if (!rooms || rooms.length === 0) res.status(404).send({message: "this room doesn't exists!"})
            else
            {
                new message({
                    room_id,
                    content,
                    sender,
                    seen_by_admin: sender === "client" ? false : undefined,
                    seen_by_client: sender === "admin" ? false : undefined,
                    type: "text",
                })
                    .save((err, createdMessage) =>
                    {
                        if (err) res.status(400).send({message: err})
                        else
                        {
                            res.send(createdMessage)
                            socketController.sendMessage(createdMessage)
                            room.findOneAndUpdate(
                                {_id: room_id},
                                {updated_date: new Date()},
                                {new: true, useFindAndModify: false, runValidators: true},
                                (err => err && console.log(err)),
                            )
                        }
                    })
            }
        })
    }
    else if (content && sender)
    {
        if (sender === "client")
        {
            new room().save((err, createdRoom) =>
            {
                if (err) res.status(400).send({message: err})
                else
                {
                    new message({
                        room_id: createdRoom._id,
                        content,
                        sender,
                        seen_by_admin: sender === "client" ? false : undefined,
                        seen_by_client: sender === "admin" ? false : undefined,
                        type: "text",
                    })
                        .save((err, createdMessage) =>
                        {
                            if (err) res.status(400).send({message: err})
                            else
                            {
                                res.send(createdMessage)
                                socketController.sendMessage(createdMessage)
                            }
                        })
                }
            })
        }
        else res.status(400).send({message: "just client can start a room!"})
    }
    else res.status(400).send({message: "send content & sender at least! (room_id optional)"})
}

const messageController = {
    sendMessage,
}

export default messageController