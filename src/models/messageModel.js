import mongoose from "mongoose"

const schema = mongoose.Schema

const messageModel = new schema({
    message: {
        type: schema.Types.ObjectId,
    },
    created_date: {
        type: Date,
        default: Date.now,
    },
})

export default messageModel