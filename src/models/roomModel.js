import mongoose from "mongoose"

const schema = mongoose.Schema

const roomModel = new schema({
    user_id: {
        type: schema.Types.ObjectId,
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