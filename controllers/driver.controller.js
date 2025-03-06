import { Driver } from '../models/driver.js'
import { ApiError } from '../utils/apiError.js'
import User from '../models/user.js'
import { Booking } from '../models/booking.js'
import { multerUpload } from '../middlewares/multerService.js'
import cloudinary from '../config/cloudinary.js'
import { ApiResponse } from '../utils/apiResponse.js'
import {Car} from '../models/car.js'
import fs from 'fs';



const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const driver = await Driver.findById(userId);
    const refreshToken = driver.generateRefreshToken();
    const accessToken = driver.generateAccessToken();
    driver.refreshToken = refreshToken;
    await driver.save({ validateBeforeSave: false });
    return { refreshToken, accessToken }
  } catch (error) {
    // /console.log(error.message)
    throw new ApiError(500, error.message || "Something went wrong while generating referesh and access token")
  }

}

const registerDriver = async (req, res, next) => {

  try {
    const { fullName, email, phoneNumber, password, address, licenseNumber, licenseExpiryDate } = req.body;
    let licenseFront = null;
    let licenseBack = null;
    let imgUrl = null;
    if (!fullName || !email || !phoneNumber || !password || !licenseNumber || !licenseExpiryDate) {
      throw new ApiError(401, "All Fields are required");
    }


    // Check if the email or phone number already exists in both Customer and User schemas
    const [existingDriver, existingUser] = await Promise.all([
      Driver.findOne({ $or: [{ email }, { phoneNumber }] }),
      User.findOne({ $or: [{ email }] }),
    ]);

    if (existingDriver || existingUser) {
      throw new ApiError(409, "Email or phone number already registered");
    }

    // console.log("file is ", req.files);
    const deleteAllTempFiles = (files) => {
      Object.values(files).forEach(fileArray => {
        fileArray.forEach(file => {
          fs.unlink(file.path, (err) => {
            if (err) console.error(`Error deleting temp file ${file.path}:`, err);
          });
        });
      });
    };

    if (req.files && req.files.licenseFront) {
      const localPath1 = req.files.licenseFront[0].path;
      // console.log("localPath1", localPath1);

      const cloudinaryResponse = await cloudinary.uploader.upload(localPath1, {
        folder: 'driver_photos', // Optional: specify a folder in Cloudinary
        public_id: `${email}`,  // Optionally specify a public ID
      });

      licenseFront = cloudinaryResponse.secure_url;
      // deleteAllTempFiles(req.files)

    }

    else {
      console.log("not found")
    }


    if (req.files && req.files.licenseBack) {
      const localPath1 = req.files.licenseBack[0].path;
      console.log("localPath1", localPath1);

      const cloudinaryResponse = await cloudinary.uploader.upload(localPath1, {
        folder: 'driver_photos', // Optional: specify a folder in Cloudinary
        public_id: `${email}`,  // Optionally specify a public ID
      });

      licenseBack = cloudinaryResponse.secure_url;
      deleteAllTempFiles(req.files)

    } else {
      console.log("not found1")
    }



    const newDriver = await Driver.create(
      {
        fullName,
        email,
        phoneNumber,
        password,
        address,
        licenseNumber,
        licenseExpiryDate,
        licenseFrontImgUrl: licenseFront,
        licenseBackImgUrl: licenseBack,
        imgUrl
      }
    )



    // Save user linked to driver
    const user = await new User({
      email: email,
      password: password,
      role: 'driver',
      linkedId: newDriver._id
    });

    if (!user) {
      throw new ApiError(401, "Driver Registration Failed");
    }
    const savedUser = await user.save();

    return res.status(201).json(new ApiResponse(200, { fullName, email, phoneNumber, address, licenseNumber, imgUrl, licenseFront, licenseBack }, "Driver registered successfully"))



  } catch (error) {
    console.log(error);
    next(error.message || "error in Registering Driver");


  }


}



const loginDriver = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {

    throw new ApiError(400, "Email and password are required.");
  }

  try {
    const driver = await Driver.findOne({ email });

    if (!driver) {
      throw new ApiError(401, 'Driver does not exist.')
    }
    const isPasswordValid = await driver.isPasswordCorrect(password);
    // Compare the plain text password directly (no hashing)
    if (!isPasswordValid) {

      throw new ApiError(401, 'Invalid Driver credentials.')
    }

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(driver._id);
    const loggedInDriver = await Driver.findById(driver._id).select("-password -refreshToken");

    const options = {
      httpOnly: true,
      secure: true,
      sameSite: 'None'
    }



    console.log("access token", accessToken)
    console.log("refresh token", refreshToken)
    console.log(req.Partner);

    return res.status(201)
      .cookie("accessToken", accessToken, options)
      .cookie("refersToken", refreshToken, options)
      .json(new ApiResponse(
        200,
        {
          Driver: loggedInDriver, accessToken, refreshToken
        },
        "Driver logged In Successfully"
      ))
  } catch (err) {
    // console.error('Error during login attempt:', err);
    // return res.status(500).json(
    //   new ApiResponse(500, null, `Error Login Partner`)
    // );
    next(err)
  }
};

const getAllDrivers = async(req,res) => {

  try {
    const drivers = await Driver.find({ availabilityStatus: true })
    if (!drivers.length) {
      return res.status(404).json({ message: 'No drivers found' });
    }
    return res.status(201).json(new ApiResponse(200,drivers,'driver found Successfully'));
  } catch (error) {
    console.error('Error fetching drivers:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

const removeDriver = async (req, res) => {
  const userId = req.user.linkedId;
  const userId2 = req.user._id;
  console.log("User : ",userId)

  try {
      // Delete user from 'users' collection
      const userResult = await User.findByIdAndDelete(userId2);
      // Delete user from 'customers' collection
      const driverResult = await Driver.findByIdAndDelete(userId);
      // Delete related bookings
      const bookingResult = await Booking.deleteMany({ driverId: userId });

      if (!userResult && !driverResult) {
          return res.status(404).json({ message: "User not found" });
      }

      // console.log("Deleted User : ", userResult);
      // console.log("Deleted Driver : ", driverResult);
      // console.log(`Deleted ${bookingResult.deletedCount} bookings`);

      res.status(200).json({
          message: "User, driver, and related bookings removed successfully.",
      });
  } catch (error) {
      console.error("Error removing user and related data:", error);
      res.status(500).json({ message: "Error removing user and related data", error });
  }
};

const updateDriverStatus = async(req,res) => {
  const driverId = req.user.linkedId;
  const {availability} = req.body;

  try {
     if(!driverId){
      return res.status(400).json(new ApiError(400,'invalid driver'))
     }
     const updateDriver = await Driver.findByIdAndUpdate(driverId,{availabilityStatus:availability},{ new: true, runValidators: true })
     console.log("UpdateDriver : ",updateDriver)
     res.status(200).json(new ApiResponse(200,updateDriver,"driver status updated!"))
  } catch (error) {
    console.log("driver status not updated! : ",error)
    res.status(500).json(new ApiError(500,{},"internal Server Error"))
  }
}

const getDriverStatus = async(req,res) => {
  const driverId = req.user.linkedId;

  try {
     if(!driverId){
      return res.status(400).json(new ApiError(400,'invalid driver'))
     }
     const driver = await Driver.findById(driverId)
     console.log("Driver : ",driver)
     const availability = driver.availabilityStatus;
     res.status(200).json({availability,message : "fetched successfully!"})
  } catch (error) {
    console.log("driver nor available! : ",error)
    res.status(500).json(new ApiError(500,{},"internal Server Error"))
  }
}

export { registerDriver, loginDriver, getAllDrivers, removeDriver, updateDriverStatus, getDriverStatus }