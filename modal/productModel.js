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
    length: {
        type: Number,
        required: true,
    },
    width: {
        type: Number,
        required: true,
    },
    height: {
        type: Number,
        required: true
    },
    weight: {
        type: Number,
        required: true,
    },
    shape: {
        type: String,
        required: true,
    },
    color: {
        type: String,
        required: true,
    },
    material: {
        type: String,
        required: true,
    },
    productImages: {
        type: Array,
        required: true
    },
    deleted: {
        type: Boolean,
        default: false
    }
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;