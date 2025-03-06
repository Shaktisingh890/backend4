import mongoose,{Schema} from "mongoose";
import bycrypt from 'bcrypt';

import jwt from 'jsonwebtoken'



const customerSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Hashed password
  phoneNumber: { type: String, required: true },
  address: { type: String },
  imgUrl:{type:String},

  // Booking history for this customer
  bookingHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],

  // Identification details
  identification: {
    idType: {
      type: String,
      enum: ["Passport", "National ID"], // Specify type of ID
    },
    idNumber: {
      type: String,
    },
    idImages: {
      type: [String], // Array of image URLs
      // validate: {
      //   validator: function (value) {
      //     return value.length >= 2; // Ensure at least two images are provided
      //   },
      //   message: "At least two images are required.",
      // },
    },
  },

  deviceTokens: [String],

}, { timestamps: true });


customerSchema.pre("save", async function(next) {
  if(!this.isModified("password")) return next();
  this.password= await bycrypt.hash(this.password,10);
  return next();
  
})





export const Customer = mongoose.model('Customer', customerSchema);
