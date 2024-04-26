const mongoose = require('mongoose');
const { Schema } = mongoose;

const walletSchema = new mongoose.Schema({
    userId : {
        type: Schema.Types.ObjectId,
        ref: "users",
      },
      amount: {
        type: Number,
        default: 0,
      },
},
{
    timestamps:true
})

const wallet = mongoose.model('wallet', walletSchema)
module.exports = wallet;


