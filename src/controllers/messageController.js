import mongoose from "mongoose"
import roomModel from "../models/roomModel"
import messageModel from "../models/messageModel"
import socketController from "./socketController"
import authController from "./authController"
import axios from "axios"
import data from "../data"
import gRpcController from "./gRpcController"
import saveFile from "../functions/saveFile"

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
    const hour = new Date().getHours()
    if (hour === 9 || hour === 21) gRpcController.resetCacheNames()
}, 1000 * 60 * 60)

let remindTimer = setInterval(() => sendSmsToSupport(false), 1000 * 15 * 60)

const sendSmsToSupport = resetTimer =>
{
    message.countDocuments({sender: "client", seen_by_admin: false, created_date: {$gte: new Date(new Date().getTime() - (1000 * 15 * 60))}}, (err, messages) =>
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
                        .then(() =>
                        {
                            console.log("we tried for send sms")
                            if (resetTimer)
                            {
                                clearInterval(remindTimer)
                                remindTimer = setInterval(() => sendSmsToSupport(), 1000 * 15 * 60)
                            }
                        })
                        .catch(() => console.log("error in sending sms"))
                }
            }
        }
    })
}

const sendMessage = (req, res) =>
{
    const {room_id, sender, unique, content_width, content_height, url} = req.body
    const content = req.body?.content || req.files?.content
    if (content && room_id && sender && unique)
    {
        if (sender === "admin")
        {
            const token = req.headers.authorization
            authController.verifyToken({token, checkStaff: true})
                .then(user => createMessageFunc({res, admin_username: user.username, room_id, content, content_width, content_height, sender, newRoom: false, url, unique}))
                .catch(() => res.status(403).send({message: "شما پرمیشن لازم را ندارید!"}))
        }
        else
        {
            const token = req.headers.authorization
            authController.verifyToken({token, checkStaff: false})
                .then(user => createMessageFunc({res, room_id, content, content_width, content_height, sender, newRoom: false, user, url, unique}))
                .catch(() => createMessageFunc({res, room_id, content, content_width, content_height, sender, newRoom: false, url, unique}))
        }
    }
    else if (content && sender && unique)
    {
        if (sender === "client")
        {
            const token = req.headers.authorization
            authController.verifyToken({token, checkStaff: false})
                .then(user => createRoomFunc({res, content, content_width, content_height, sender, user, url, unique}))
                .catch(() => createRoomFunc({res, content, content_width, content_height, sender, url, unique}))
        }
        else res.status(400).send({message: "just client can start a room!"})
    }
    else res.status(400).send({message: "send content & sender & unique at least! (room_id optional)"})
}

const createRoomFunc = ({res, content, content_width, content_height, sender, user, url, unique}) =>
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
                            createMessageFunc({res, room_id: createdRoom._id, content, content_width, content_height, sender, user, newRoom: true, url, unique})
                        }
                    })
                }
                else createMessageFunc({res, room_id: rooms[0]._id, content, content_width, content_height, sender, user, newRoom: false, url, unique})
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
                createMessageFunc({res, room_id: createdRoom._id, content, content_width, content_height, sender, newRoom: true, url, unique})
            }
        })
    }
}

const createMessageFunc = ({res, admin_username, room_id, content, content_width, content_height, sender, newRoom, user, url, unique}) =>
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
            saveFile({file: content, folder: "images"})
                .then(content =>
                {
                    const takenRoom = rooms[0].toJSON()
                    new message({
                        admin_username,
                        room_id,
                        content: content.path || content.data,
                        content_width,
                        content_height,
                        url,
                        sender,
                        seen_by_admin: sender === "client" ? false : undefined,
                        seen_by_client: sender === "admin" ? false : undefined,
                        type: content.path ? "image" : "text",
                    })
                        .save((err, createdMessage) =>
                        {
                            if (err) res.status(400).send({message: err})
                            else
                            {
                                res.send(createdMessage)
                                socketController.sendMessage({message: createdMessage, room: {...takenRoom, nickname: user?.nickname}, unique})
                                if (!newRoom)
                                {
                                    const username = takenRoom.username ? takenRoom.username : user?.username ? user.username : undefined
                                    room.findOneAndUpdate(
                                        {_id: room_id},
                                        {updated_date: new Date(), username},
                                        {new: true, useFindAndModify: false, runValidators: true},
                                        (err => err && console.log(err)),
                                    )
                                }
                                if (sender === "client" && !socketController.isSupportOnline()) sendSmsToSupport(true)
                            }
                        })
                })
                .catch(err => res.status(400).send({message: err}))
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
    const {sender, room_id, unique} = req.body
    if (sender === "admin" && room_id && unique)
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
                            socketController.sendSeen({room_id, sender, unique})
                        }
                    })
            })
            .catch(() => res.status(403).send({message: "شما پرمیشن لازم را ندارید!"}))
    }
    else if (sender === "client" && room_id && unique)
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
                    socketController.sendSeen({room_id, sender, unique})
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