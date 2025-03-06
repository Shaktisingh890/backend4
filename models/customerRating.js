import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    carId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car' },
    rating: { type: Number, min: 1, max: 5 },
    review: { type: String },
    timestamp: { type: Date, default: Date.now },
  });
  
  const Review = mongoose.model('Review', reviewSchema);
  