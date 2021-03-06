import mongoose from "mongoose"

const schema = mongoose.Schema

const roomModel = new schema({
    order: {
        type: Number,
        required: "order is required",
    },
    username: {
        type: String,
    },
    updated_date: {
        type: Date,
        default: Date.now,
    },
    created_date: {
        type: Date,
        default: Date.now,
    },
})

export default roomModel