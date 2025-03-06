import mongoose,{Schema} from 'mongoose';
import bycrypt from "bcrypt";
import jwt from "jsonwebtoken";
const partnerSchema = new Schema({
    fullName: { type: String, required: true },
    email:{type:String,required:true,unique:true},
    phoneNumber: { type: String, required: true },
    address:{type:String},
    password:{type:String,requird:true},
    fleet: [{ type: Schema.Types.ObjectId, ref: 'Car' }], // List of cars under this partner
    drivers: [{ type: Schema.Types.ObjectId, ref: 'Driver' }], // List of drivers
    imgUrl:{type:String,default:null},
    refreshToken:{type:String,default:null},
    paymentDetails: {
      accountNumber: String,
      bankName: String,
      upi_id : String,
    },
    bussinessinfo: {
      company_name : String,
      company_add : String,
      service_area : String,
    },
    termsAccepted: { type: Boolean, default: false },
    deviceTokens: [String],
    
  },{ timestamps: true});
  

partnerSchema.pre("save", async function(next){
  if(!this.isModified("password")) return next();
  this.password = await bycrypt.hash(this.password,10);
  return next();
})  

partnerSchema.methods.isPasswordCorrect=function(password){
 return bycrypt.compare(password,this.password)
}

partnerSchema.methods.generateAccessToken=function(){
  return jwt.sign(
    {
      _id:this._id,
      type:"partner"
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    }
  )
}

partnerSchema.methods.generateRefreshToken=function(){
  return jwt.sign(
    {
     _id:this._id,
      type:"partner"
    },process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    }
  )
}


partnerSchema.methods.isPasswordCorrect=function(password){
  return bycrypt.compare(password,this.password)
 } 


  export const Partner=mongoose.model('Partner', partnerSchema);
  