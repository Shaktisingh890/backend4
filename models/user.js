import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bycrypt from 'bcrypt';

// User schema definition
// const userSchema = new mongoose.Schema({
//   fullName: { type: String, required: true },  // Full Name of the user
//   email: { type: String, required: true, unique: true },  // User's email (must be unique)
//   mobile: { type: String, required: true, unique: true },  // Mobile number (must be unique)
//   password: { type: String, required: true },  // User's password
//   photo: { type: String, default: null },  // Photo URL (stored in Cloudinary or other storage)
//   photoPublicId: { type: String, default: null },  // Cloudinary public ID (for future management of the photo)
//   refreshToken:{type:String,default:null,}
// }, { timestamps: true });  // This will automatically add createdAt and updatedAt timestamps


const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Store hashed passwords
  role: { type: String, enum: ['customer', 'driver', 'partner', 'admin'], required: true },
  linkedId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Link to specific role collection
  isActive: { type: Boolean, default: true }, // To handle account deactivation
  lastLogin: { type: Date },
  refreshToken:{type:String, default:null}
}, { timestamps: true });






userSchema.pre("save", async function(next) {
  if(!this.isModified("password")) return next();
  this.password= await bycrypt.hash(this.password,10);
  return next();
  
})


userSchema.methods.isPasswordCorrect=function(password){
 return bycrypt.compare(password,this.password)
} 

userSchema.methods.generateAccessToken=function(role){
  return jwt.sign(
    {
      _id:this._id,
      type:role,

    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    
    }
  )

}

userSchema.methods.generateRefreshToken=function(role){
  return jwt.sign(
    {
      _id:this._id,
      type:role,

    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    
    }
  )

}
// Create the User model from the schema
const User = mongoose.model('User', userSchema);

export default User;
