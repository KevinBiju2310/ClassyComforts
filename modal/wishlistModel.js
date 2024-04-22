const mongoose = require('mongoose');
const { Schema } = mongoose;

const wishlistSchema = new mongoose.Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    products: [{
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            requried: true,
        }
    }]
}, {
    timestamps: true
})


const wishlist = mongoose.model('wishlist', wishlistSchema)
module.exports = wishlist;