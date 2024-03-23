const mongoose = require('mongoose')
const { Schema } = mongoose

const cartSchema = new mongoose.Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        required: true,
    },
    items: {
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            default: 1
        }
    },
    total: {
        type: Number,
        default: 0,
        required: true,
    }
});


const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;