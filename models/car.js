

import mongoose from "mongoose";

const carSchema = new mongoose.Schema({
  brand: { type: String, required: true },
  model: { type: String, required: true },
  year: { type: Number, required: true },
  seats: { type: Number, required: true },
  fuelType: { type: String, required: true }, // e.g., Petrol, Diesel, Electric
  pricePerDay: { type: Number, required: true },
  registrationNumber: { type: String },
  mileage: {type:Number},
  color: {type: String},
  description: {type: String},
  availabilityStatus: { 
    type: String, 
    enum: ["available", "unavailable", "in_maintenance"], 
    default: "available" 
  },
  location: {
    type: { type: String, enum: ["Point"] }, // GeoJSON format      required: true
    coordinates: {
      type: [Number]// [longitude, latitude]
     
    },
  },
  features: [String], // e.g., ['GPS', 'Bluetooth', 'Air Conditioning']
  images: [String], // Array of image URLs
  docs:{
    ownerDoc: { 
       type : [String]
      },
     carDoc :  {
      type: [String]
      },
     vehiclelic: {
      type: [String]
      },
      bankPass: {
        type: String
      },
    },

  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Partner", // Link to the partner managing the car
    required: true,
  },
  // bookings: [
  //   {
  //     startDate: { type: Date, required: true },
  //     endDate: { type: Date, required: true },
  //     customerId: {
  //       type: mongoose.Schema.Types.ObjectId,
  //       ref: "Customer", // Link to the customer who booked
  //     },
  //     status: {
  //       type: String,
  //       enum: ["pending", "confirmed", "completed", "canceled"],
  //       default: "pending",
  //     },
  //   },
  // ],
  pickupLocation:{type:String,required:true},
  dropoffLocation:{type:String,required:true},
  category: { type: String, required: true }, // New category field
  subCategory: { type: String, required: true }, // New subCategory field
  transmissionType : {type : String},
}, { timestamps: true });

// Create a geospatial index for the location field
carSchema.index({ location: "2dsphere" });

const Car = mongoose.model("Car", carSchema);
export {Car};


