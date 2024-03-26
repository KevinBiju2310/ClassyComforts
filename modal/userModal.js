const mongoose = require('mongoose');

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
    },
    cart: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        quantity: {
            type: Number,
        },
        totalAmount: {
            type: Number,
        }
    }]
}
)

const User = mongoose.model('users', userSchema)
module.exports = User