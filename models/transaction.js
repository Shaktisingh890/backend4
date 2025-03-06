import mongoose from "mongoose";


const transactionSchema = new mongoose.Schema({
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    paymentMethod: { type: String, enum: ['credit_card', 'paypal', 'bank_transfer'], required: true },
    amount: { type: Number, required: true },
    transactionId: { type: String, unique: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    timestamp: { type: Date, default: Date.now },
  });
  
export const Transaction = mongoose.model('Transaction', transactionSchema);
  