import mongoose from "mongoose"

const schema = mongoose.Schema

const roomModel = new schema({
    sent_sms_to_user: {
        type: Boolean,
        default: false,
    },
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