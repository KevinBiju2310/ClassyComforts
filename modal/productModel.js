const mongoose = require('mongoose')
const { Schema } = mongoose;

const productSchema = new mongoose.Schema({
    productname: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: Schema.Types.String,
        ref: 'Category',
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
    },
    productImage: {
        type: Array,
        required: true
    },
    deleted: { type: Boolean, default: false }
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;