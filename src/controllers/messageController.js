import mongoose from "mongoose"
import roomModel from "../models/roomModel"
import messageModel from "../models/messageModel"
import socketController from "./socketController"
import authController from "./authController"
import axios from "axios"

const room = mongoose.model("room", roomModel)
const message = mongoose.model("message", messageModel)

setInterval(() =>
{
    message.countDocuments({sender: "client", seen_by_admin: false, created_date: {$lte: new Date(new Date().getTime() - (1000 * 60 * 60))}}, (err, messages) =>
    {
        if (err) console.log(err)
        else
        {
            if (messages > 0)
            {
                const hour = new Date().getHours()
                if (hour <= 22 && hour >= 8)
                {
                    axios.get(`https://api.kavenegar.com/v1/${data.kavenegarKey}/verify/lookup.json?receptor=${data.supportNumber}&token=${messages}&template=${data.remindTemplate}`)
                        .then(() => console.log("we tried for send sms"))
                        .catch(() => console.log("error in sending sms"))
                }
            }
        }
    })
}, 3600000)

const sendMessage = (req, res) =>
{
    res.setHeader("Access-Control-Allow-Origin", "*")
    const {content, room_id, sender} = req.body
    if (content && room_id && sender)
    {
        if (sender === "admin")
        {
            const token = req.headers.authorization
            authController.verifyToken({token, checkStaff: true})
                .then(user => createMessageFunc({res, admin_id: user.user_id, room_id, content, sender, newRoom: false}))
                .catch(() => res.status(403).send({message: "شما پرمیشن لازم را ندارید!"}))
        }
        else
        {
            const token = req.headers.authorization
            authController.verifyToken({token, checkStaff: false})
                .then(user => createMessageFunc({res, room_id, content, sender, newRoom: false, user}))
                .catch(() => createMessageFunc({res, room_id, content, sender, newRoom: false}))
        }
    }
    else if (content && sender)
    {
        if (sender === "client")
        {
            const token = req.headers.authorization
            authController.verifyToken({token, checkStaff: false})
                .then(user => createRoomFunc({res, content, sender, user}))
                .catch(() => createRoomFunc({res, content, sender}))
        }
        else res.status(400).send({message: "just client can start a room!"})
    }
    else res.status(400).send({message: "send content & sender at least! (room_id optional)"})
}

const createRoomFunc = ({res, content, sender, user}) =>
{
    if (user && user?.user_id)
    {
        room.find({user_id: user.user_id}, (err, rooms) =>
        {
            if (err) res.status(400).send({message: err})
            else
            {
                if (!rooms || rooms.length === 0)
                {
                    new room({user_id: user.user_id}).save((err, createdRoom) =>
                    {
                        if (err) res.status(400).send({message: err})
                        else createMessageFunc({res, room_id: createdRoom._id, content, sender, newRoom: true})
                    })
                }
                else createMessageFunc({res, room_id: rooms[0]._id, content, sender, newRoom: false})
            }
        })
    }
    else
    {
        new room().save((err, createdRoom) =>
        {
            if (err) res.status(400).send({message: err})
            else createMessageFunc({res, room_id: createdRoom._id, content, sender, newRoom: true})
        })
    }
}

const createMessageFunc = ({res, admin_id, room_id, content, sender, newRoom, user}) =>
{
    room.find({_id: room_id}, (err, rooms) =>
    {
        if (err) res.status(400).send({message: err})
        else if (!rooms || rooms.length === 0) res.status(404).send({message: "this room doesn't exists!"})
        else
        {
            new message({
                admin_id,
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
                        if (!newRoom)
                        {
                            room.findOneAndUpdate(
                                {_id: room_id},
                                {updated_date: new Date(), user_id: user?.user_id || rooms[0].user_id},
                                {new: true, useFindAndModify: false, runValidators: true},
                                (err => err && console.log(err)),
                            )
                        }
                    }
                })
        }
    })
}

const getRooms = (req, res) =>
{
    const token = req.headers.authorization
    authController.verifyToken({token, checkStaff: true})
        .then(() =>
        {
            const limit = +req.query.limit > 0 && +req.query.limit <= 50 ? +req.query.limit : 50
            const skip = +req.query.offset > 0 ? +req.query.offset : 0
            let query = {is_deleted: false}
            const fields = "updated_date created_date"
            const options = {sort: "-updated_date", skip, limit}
            room.countDocuments(query, (err, count) =>
            {
                if (err) res.status(500).send({message: err})
                else
                {
                    room.find(query, fields, options, (err, rooms) =>
                    {
                        if (err) res.status(500).send({message: err})
                        else
                        {
                            if (rooms.length > 0)
                            {
                                let sendRooms = rooms.reduce((sum, item) => [...sum, item.toJSON()], [])
                                sendRooms.forEach(item =>
                                    message.find({room_id: item._id}, null, {sort: "-created_date", skip: 0, limit: 1}, (err, messages) =>
                                    {
                                        if (err) res.status(500).send({message: err})
                                        else
                                        {
                                            item.last_message = messages[0]
                                            if (Object.values(sendRooms).every(item => item.last_message)) res.send({results: sendRooms, count})
                                        }
                                    }),
                                )
                            }
                            else res.send({results: rooms, count})
                        }
                    })
                }
            })
        })
        .catch(() => res.status(403).send({message: "شما پرمیشن لازم را ندارید!"}))
}

const getMessages = (req, res) =>
{
    const {room_id} = req.query
    if (room_id)
    {
        const limit = +req.query.limit > 0 && +req.query.limit <= 50 ? +req.query.limit : 50
        const skip = +req.query.offset > 0 ? +req.query.offset : 0
        let query = {room_id}
        const options = {sort: "-created_date", skip, limit}
        message.countDocuments(query, (err, count) =>
        {
            if (err) res.status(500).send({message: err})
            else
            {
                message.find(query, null, options, (err, messages) =>
                {
                    if (err) res.status(500).send({message: err})
                    else res.send({results: messages, count})
                })
            }
        })
    }
    else res.status(400).send({message: "آیدی روم را بفرستید!"})
}

const seenMessages = (req, res) =>
{
    const {sender, room_id} = req.body
    if (sender === "admin" && room_id)
    {
        const token = req.headers.authorization
        authController.verifyToken({token, checkStaff: true})
            .then(user =>
            {
                message.updateMany({sender: "client", room_id, seen_by_admin: false}, {seen_by_admin: true, seen_by_admin_id: user.user_id}, {new: true, useFindAndModify: false, runValidators: true}, err =>
                {
                    if (err) res.status(500).send({message: err})
                    else
                    {
                        res.send({message: "انجام شد"})
                        socketController.sendSeen({room_id, sender})
                    }
                })
            })
            .catch(() => res.status(403).send({message: "شما پرمیشن لازم را ندارید!"}))
    }
    else if (sender === "client" && room_id)
    {
        message.updateMany({sender: "admin", room_id, seen_by_client: false}, {seen_by_client: true}, {new: true, useFindAndModify: false, runValidators: true}, err =>
        {
            if (err) res.status(500).send({message: err})
            else
            {
                res.send({message: "انجام شد"})
                socketController.sendSeen({room_id, sender})
            }
        })
    }
    else res.status(400).send({message: "پارامتر های ارسالی اشتباه است!"})
}

const messageController = {
    sendMessage,
    getRooms,
    getMessages,
    seenMessages,
}

export default messageController