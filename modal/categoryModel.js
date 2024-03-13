const mongoose = require('mongoose')

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active'
    },
    deleted: {
        type: Boolean,
        default: false
    }
});

const Category = mongoose.model('Category', categorySchema)
module.exports = Category;