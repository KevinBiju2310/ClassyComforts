const mongoose = require('mongoose');
const { Schema } = mongoose;

const walletSchema = new mongoose.Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "users",
  },
  amount: {
    type: Number,
    default: 0,
  },
  transaction: [{
    date: {
      type: Date,
      default: Date.now
    },
    paymentMethod: {
      type: String,
      enum: ['razorpay', 'wallet', 'referral']
    },
    amount: {
      type: Number,
      required: true
    },
    paymentStatus: {
      type: String,
      enum: ['refund', 'debit', 'credit'],
      required: true
    }
  }]
},
  {
    timestamps: true
  })

const wallet = mongoose.model('wallet', walletSchema)
module.exports = wallet;


