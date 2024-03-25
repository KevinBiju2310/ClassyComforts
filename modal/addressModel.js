const mongoose = require('mongoose')
const { Schema } = mongoose

const addressSchema = new mongoose.Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
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
        enum: ['Home', 'Work'],
        required: true
    }

})

const Address = mongoose.model('Address', addressSchema);
module.exports = Address;