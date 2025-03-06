import mongoose from "mongoose";
const penaltySchema = new mongoose.Schema({
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    penaltyAmount: { type: Number, required: true },
    reason: { type: String, required: true }, // e.g., 'Cancellation within 24 hours'
  }, { timestamps: true });
  
 export const Penalty = mongoose.model('Penalty', penaltySchema);
  