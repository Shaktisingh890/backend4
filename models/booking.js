import mongoose,{Schema} from "mongoose";
const bookingSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  carId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' }, // Assigned driver
  partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner' },
  pickupLocation: {type : String, required : true},
  dropoffLocation: {type : String, required : true},
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  durationInDays: { type: Number, required: true }, // Automatically calculated
  totalAmount: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['pending', 'completed', 'refunded'], default: 'pending' },
  status: { type: String, enum: ['pending', 'ongoing', 'booked', 'completed', 'cancelled'], default: 'pending' },

  penalties: { type: Number, default: 0 }, // Penalties for cancellations or amendments
  partnerStatus: { type: String, enum: ['pending', 'confirmed', 'rejected'], default: 'pending' },
  driverStatus: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  driverRejectionReason: { type: String, default: null },
}, { timestamps: true });

// Automatically calculate durationInDays before saving the document
bookingSchema.pre('save', function (next) {
  if (this.startDate && this.endDate) {
    this.durationInDays = Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
  }
  next();
});

// Indexes to optimize queries
bookingSchema.index({ customerId: 1 });
bookingSchema.index({ carId: 1 });
bookingSchema.index({ startDate: 1 });

export const Booking = mongoose.model('Booking', bookingSchema);

  