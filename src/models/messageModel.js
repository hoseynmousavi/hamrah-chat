import mongoose from "mongoose"

const schema = mongoose.Schema

const messageModel = new schema({
    admin_username: {
        type: String,
    },
    room_id: {
        type: schema.Types.ObjectId,
        required: "Enter room_id!",
    },
    content: {
        type: String,
        required: "Enter content!",
    },
    content_width: {
        type: Number,
    },
    content_height: {
        type: Number,
    },
    sender: {
        type: String,
        enum: ["admin", "client"],
        required: "Enter sender!",
    },
    seen_by_admin: {
        type: Boolean,
    },
    seen_by_admin_username: {
        type: String,
    },
    seen_by_client: {
        type: Boolean,
    },
    seen_date: {
        type: Date,
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