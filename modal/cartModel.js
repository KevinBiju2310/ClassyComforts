const mongoose = require('mongoose');
const { Schema } = mongoose;

const cartSchema = new mongoose.Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    products: [{
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            default: 1
        },
        productPrice: {
            type: Number,
            required: true
        }
    }],
    total: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

const Cart = mongoose.model('cart', cartSchema)
module.exports = Cart;