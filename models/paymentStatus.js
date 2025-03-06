import mongoose,{Schema} from 'mongoose'

const paymentSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  amount: { type: Number, required: true },
  partnerPaid: { type: Boolean, default: false },
  driverPaid: { type: Boolean, default: false },
  breakdownReported: { type: Boolean, default: false }, // Hold payment if true
  paymentDate: { type: Date, required: true },
}, { timestamps: true });

 export const Payment = mongoose.model('Payment', paymentSchema);

  