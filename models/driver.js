
import mongoose,{ Schema } from 'mongoose';
import bycryt from 'bcrypt';
import jwt from "jsonwebtoken";

const driverSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Hashed password
  phoneNumber: { type: String, required: true },
  licenseNumber: { type: String, required: true },
  address:{type:String,default:true},
  licenseExpiryDate: { type: String, required: true },

  licenseFrontImgUrl:{type:String,default:true},
  licenseBackImgUrl:{type:String,default:true},


  availabilityStatus: { type: Boolean, default: true }, // Track if driver is available
  imgUrl:{type:String},
  refreshToken:{type:String},


  // List of bookings assigned to this driver
  bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
  deviceTokens: [String],

}, { timestamps: true });


driverSchema.pre("save",async function(next){
if(!this.isModified("password")) return next();
return this.password=  await bycryt.hash(this.password,10)
})




export const Driver = mongoose.model('Driver', driverSchema);

  