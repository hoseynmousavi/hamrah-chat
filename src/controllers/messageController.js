import mongoose from "mongoose"
import roomModel from "../models/roomModel"
import messageModel from "../models/messageModel"
import socketController from "./socketController"
import authController from "./authController"
import axios from "axios"
import data from "../data"
import gRpcController from "./gRpcController"

const room = mongoose.model("room", roomModel)
const message = mongoose.model("message", messageModel)

let roomCount = 0

room.countDocuments(null, (err, countRooms) =>
{
    if (err) console.log(err)
    else roomCount = countRooms
})

setInterval(() =>
{
    message.countDocuments({sender: "client", seen_by_admin: false, created_date: {$lte: new Date(new Date().getTime() - (1000 * 60 * 60))}}, (err, messages) =>
    {
        if (err) console.log(err)
        else
        {
            const hour = new Date().getHours()

            if (messages > 0)
            {
                if (hour <= 22 && hour >= 8)
                {
                    axios.get(`https://api.kavenegar.com/v1/${data.kavenegarKey}/verify/lookup.json?receptor=${data.supportNumber}&token=${messages}&template=${data.remindTemplate}`)
                        .then(() => console.log("we tried for send sms"))
                        .catch(() => console.log("error in sending sms"))
                }
            }

            if (hour === 9 || hour === 21) gRpcController.resetCacheNames()
        }
    })
}, 3600000)

const sendMessage = (req, res) =>
{
    const {content, room_id, sender} = req.body
    if (content && room_id && sender)
    {
        if (sender === "admin")
        {
            const token = req.headers.authorization
            authController.verifyToken({token, checkStaff: true})
                .then(user => createMessageFunc({res, admin_username: user.username, room_id, content, sender, newRoom: false}))
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
    if (user && user?.username)
    {
        room.find({username: user.username}, (err, rooms) =>
        {
            if (err) res.status(400).send({message: err})
            else
            {
                if (!rooms || rooms.length === 0)
                {
                    new room({order: roomCount + 1, username: user.username}).save((err, createdRoom) =>
                    {
                        if (err) res.status(400).send({message: err})
                        else
                        {
                            roomCount++
                            createMessageFunc({res, room_id: createdRoom._id, content, sender, user, newRoom: true})
                        }
                    })
                }
                else createMessageFunc({res, room_id: rooms[0]._id, content, sender, user, newRoom: false})
            }
        })
    }
    else
    {
        new room({order: roomCount + 1}).save((err, createdRoom) =>
        {
            if (err) res.status(400).send({message: err})
            else
            {
                roomCount++
                createMessageFunc({res, room_id: createdRoom._id, content, sender, newRoom: true})
            }
        })
    }
}

const createMessageFunc = ({res, admin_username, room_id, content, sender, newRoom, user}) =>
{
    let query = {_id: room_id}
    const fields = "order username updated_date created_date"
    const options = {sort: "-updated_date", skip: 0, limit: 1}
    room.find(query, fields, options, (err, rooms) =>
    {
        if (err) res.status(400).send({message: err})
        else if (!rooms || rooms.length === 0) res.status(404).send({message: "this room doesn't exists!"})
        else
        {
            const takenRoom = rooms[0].toJSON()
            new message({
                admin_username,
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
                        socketController.sendMessage({message: createdMessage, room: {...takenRoom, nickname: user?.nickname}})
                        if (!newRoom)
                        {
                            const username = takenRoom.username ? takenRoom.username : user?.username ? user.username : undefined
                            room.findOneAndUpdate(
                                {_id: room_id},
                                {updated_date: new Date(), username},
                                {new: true, useFindAndModify: false, runValidators: true},
                                (err => err && console.log(err)),
                            )

                            // if (sender === "admin" && !socketController.isOnline(room_id) && takenRoom.username)
                            // {
                            //     axios.get(`https://api.kavenegar.com/v1/${data.kavenegarKey}/verify/lookup.json?receptor=${data.supportNumber}&token=${messages}&template=${data.remindTemplate}`)
                            //         .then(() => console.log("we tried for send sms"))
                            //         .catch(() => console.log("error in sending sms"))
                            // }
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
            const limit = +req.query.limit > 0 && +req.query.limit <= 15 ? +req.query.limit : 15
            const skip = +req.query.offset > 0 ? +req.query.offset : 0
            const fields = "order username updated_date created_date"
            const options = {sort: "-updated_date", skip, limit}
            room.find(null, fields, options, (err, rooms) =>
            {
                if (err) res.status(500).send({message: err})
                else
                {
                    if (rooms.length > 0)
                    {
                        let sendRooms = rooms.reduce((sum, item) => [...sum, item.toJSON()], [])
                        sendRooms.forEach(item =>
                        {
                            message.find({room_id: item._id}, null, {sort: "-created_date", skip: 0, limit: 1}, (err, messages) =>
                            {
                                if (err) res.status(500).send({message: err})
                                else
                                {
                                    item.last_message = messages[0]
                                    if (Object.values(sendRooms).every(item => item.last_message && item.nickname !== undefined)) res.send({results: sendRooms, count: roomCount})
                                }
                            })
                            gRpcController.getFullName(item.username)
                                .then(nickname =>
                                {
                                    item.nickname = nickname
                                    if (Object.values(sendRooms).every(item => item.last_message && item.nickname !== undefined)) res.send({results: sendRooms, count: roomCount})
                                })
                                .catch(() => res.status(500).send({message: "error getting names"}))
                        })
                    }
                    else res.send({results: rooms, count: roomCount})
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
                message.updateMany(
                    {sender: "client", room_id, seen_by_admin: false},
                    {seen_by_admin: true, seen_by_admin_username: user.username, seen_date: new Date()},
                    {new: true, useFindAndModify: false, runValidators: true},
                    err =>
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
        message.updateMany(
            {sender: "admin", room_id, seen_by_client: false},
            {seen_by_client: true, seen_date: new Date()},
            {new: true, useFindAndModify: false, runValidators: true},
            err =>
            {
                if (err) res.status(500).send({message: err})
                else
                {
                    res.send({message: "انجام شد"})
                    socketController.sendSeen({room_id, sender})
                    room.findOneAndUpdate({room_id}, {sent_sms_to_user: false}, {new: true, useFindAndModify: false, runValidators: true}, err => err && console.log(err))
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