import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    reportType: { type: String, enum: ['trip', 'payment', 'penalty'], required: true },
    description: { type: String },
    timestamp: { type: Date, default: Date.now },
  });
  
  export const Report = mongoose.model('Report', reportSchema);
  