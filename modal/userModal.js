const mongoose = require('mongoose')


const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: Number,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    isAdmin: {
        type: String,
        default: 0
    },
    isBlocked: {
        type: Boolean,
        default: false
    }
}
)

const User = mongoose.model('users', userSchema)
module.exports = User