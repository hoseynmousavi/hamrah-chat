import mongoose from "mongoose"
import roomModel from "../models/roomModel"
import messageModel from "../models/messageModel"

const room = mongoose.model("room", roomModel)
const message = mongoose.model("message", messageModel)

const sendMessage = (req, res) =>
{
    const {content, room_id} = req.body
    if (content && room_id)
    {
        room.find({_id: room_id}, (err, rooms) =>
        {
            if (err) res.status(500)
            else if (rooms.length === 0) res.status(404).send({message: "this room doesn't exists!"})
            else
            {
                new message({room_id, content, type: "text"}).save((err, createdMessage) =>
                {
                    if (err) res.status(500).send(err)
                    else
                    {
                        res.send(createdMessage)
                        room.findOneAndUpdate(
                            {_id: room_id},
                            {updated_date: new Date()},
                            {new: true, useFindAndModify: false, runValidators: true},
                            (err => console.log(err)),
                        )
                    }
                })
            }
        })
    }
    else if (content)
    {
        new room().save((err, createdRoom) =>
        {
            if (err) res.status(500).send(err)
            else
            {
                new message({room_id: createdRoom._id, content, type: "text"}).save((err, createdMessage) =>
                {
                    if (err) res.status(500).send(err)
                    else res.send(createdMessage)
                })
            }
        })
    }
    else res.status(400).send({message: "send message at least! (room_id optional)"})
}

const messageController = {
    sendMessage,
}

export default messageController