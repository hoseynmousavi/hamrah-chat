import mongoose from "mongoose"

const schema = mongoose.Schema

const messageModel = new schema({
    room_id: {
        type: schema.Types.ObjectId,
        required: "Enter room_id!",
    },
    content: {
        type: String,
        required: "Enter content!",
    },
    type: {
        type: String,
        enum: ["text", "image", "file"],
        required: "Enter type!",
    },
    created_date: {
        type: Date,
        default: Date.now,
    },
})

export default messageModel