const mongoose = require('mongoose');
const { Schema } = mongoose;

const orderSchema = new mongoose.Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        required: true,
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
    address: [{
        name: {
            type: String,
            required: true
        },
        phone: {
            type: Number,
            required: true
        },
        address: {
            type: String,
            required: true
        },
        district: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        pincode: {
            type: Number,
            required: true
        },
        addressType: {
            type: String,
            enum: ['home', 'work'],
            required: true
        }
    }],
    paymentMethod: {
        type: String,
        enum: ['cod', 'razorpay', 'wallet'],
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'success', 'failure', 'refunded'],
        default: 'pending',
        required: true
    },
    orderStatus: {
        type: String,
        enum: ['pending', 'shipped', 'delivered', 'cancelled', 'returned'],
        default: 'pending',
        required: true
    },
    totalAmount: {
        type: Number,
        required: true,
    },
    cancelReason: {
        type: String,
        default: ''
    }
},
    {
        timestamps: true
    })



const Order = mongoose.model('order', orderSchema)
module.exports = Order;