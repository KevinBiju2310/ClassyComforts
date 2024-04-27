const mongoose = require('mongoose');


const couponSchema = new mongoose.Schema({
    couponname: {
        type: String,
        required: true,
    },
    couponcode: {
        type: String,
        required: true,
    },
    discountamount: {
        type: Number,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    minimumamount: {
        type: Number,
        required: true
    }
},
    {
        timestamps: true
    })



const Coupon = mongoose.model('coupon', couponSchema)
module.exports = Coupon;