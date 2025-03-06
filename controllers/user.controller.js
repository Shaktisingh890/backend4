import express from "express";

import User from "../models/user.js"; // Assuming your User model is set up
import cloudinary from "../config/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import fs from "fs";
import jwt from "jsonwebtoken";
import { Customer } from "../models/customer.js";
import { Driver } from "../models/driver.js";

import cookieParser from "cookie-parser";
import { Partner } from "../models/partner.js";
import bcrypt from "bcrypt";

const generateAccessAndRefereshTokens = async (userId, type) => {
  try {
    const user = await User.findById(userId);
    const refreshToken = user.generateRefreshToken(type);
    const accessToken = user.generateAccessToken(type);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { refreshToken, accessToken };
  } catch (error) {
    // /console.log(error.message)
    throw new ApiError(
      500,
      error.message ||
        "Something went wrong while generating referesh and access token"
    );
  }
};
// POST: Register a new user
const registerUser = async (req, res) => {
  const { fullName, email, mobile, password } = req.body;

  // Validate the incoming data
  if (!fullName || !email || !mobile || !password) {
    throw new ApiError(400, "All fields are required");
  }

  try {
    // If a file (photo) is uploaded, handle Cloudinary upload

    const deleteAllTempFiles = (files) => {
      Object.values(files).forEach(fileArray => {
        fileArray.forEach(file => {
          fs.unlink(file.path, (err) => {
            if (err) console.error(`Error deleting temp file ${file.path}:`, err);
          });
        });
      });
    };

    let photoUrl = null;
    if (req.files && req.files.photo) {
      const photo = req.files.photo;

      // console.log(photo[0].path);
      // Upload the photo to Cloudinary
      const cloudinaryResponse = await cloudinary.uploader.upload(
        photo[0].path,
        {
          folder: "user_photos", // Optional: specify a folder in Cloudinary
          public_id: `${email}`, // Optionally specify a public ID
        }
      );

      // Get the URL of the uploaded photo
      photoUrl = cloudinaryResponse.secure_url;
      deleteAllTempFiles(req.files)
      console.log("Photo uploaded successfully:", photoUrl);
    }

    // Check if the email or mobile number already exists in the database
    const existingUser = await User.findOne({ $or: [{ email }, { mobile }] });

    if (existingUser) {
      throw new ApiError(409, "User with email or mobile already exists");
    }

    // Create a new user instance with the provided data (no password hashing)
    const newUser = new User({
      fullName,
      email,
      mobile,
      password, // Store the password as plain text
      photo: photoUrl, // Save the photo URL to the user
    });

    // Save the new user to the database
    await newUser.save();

    // Return success response
    return res
      .status(201)
      .json(
        new ApiResponse(
          200,
          {
            fullName: newUser.fullName,
            email: newUser.email,
            mobile: newUser.mobile,
            photo: photoUrl,
          },
          "User registered successfully"
        )
      );
  } catch (error) {
    // console.error(error);

    // Return error response
    return res
      .status(500)
      .json(
        new ApiResponse(500, null, `Error registering user: ${error.message}`)
      );
  }
};

const updatePassword = async (req, res) => {
  const email = req.user.email;

  const { currentPassword, confirmPassword } = req.body;
  console.log("Passwords : ", req.body);

  if ( !currentPassword || !confirmPassword) {
      throw new ApiError(400, "All fields are required");
  }

  try {
      const user = await User.findOne({ email });
      if (!user) throw new ApiError(404, "User not found");

      let roleSpecificData;
      switch (user.role) {
          case "customer":
              roleSpecificData = await Customer.findById(user.linkedId);
              break;
          case "driver":
              roleSpecificData = await Driver.findById(user.linkedId);
              break;
          case "partner":
              roleSpecificData = await Partner.findById(user.linkedId);
              break;
          default:
              throw new ApiError(400, "Unsupported user role.");
      }

      if (!roleSpecificData) throw new ApiError(404, "Role-specific data not found.");
      // console.log(roleSpecificData)

      const isMatch = await user.isPasswordCorrect(currentPassword);
      const isMatchRoleSpecific = await roleSpecificData.isPasswordCorrect(currentPassword);

      if (!isMatch || !isMatchRoleSpecific) {
          throw new ApiError(401, "Incorrect old password");
      }

      user.password = confirmPassword;
      roleSpecificData.password = confirmPassword;

      await user.save();
      await roleSpecificData.save();

      res.status(200).json(new ApiResponse(200, {user}, "Password updated successfully"));
  } catch (error) {
      console.error("Error: ", error);
      res.status(500).json(new ApiError(500, "An error occurred while updating the password"));
  }
};


// POST: Login a user
const loginUser = async (req, res, next) => {
  const { email, password, deviceToken } = req.body;
  // console.log("Ye : ", req.body);

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required.");
  }

  try {
    const user = await User.findOne({ email });

    // console.log("User hai : ", user);

    if (!user) {
      throw new ApiError(401, "User does not exist.");
    }

    const type = user.role;

    const isPasswordValid = await user.isPasswordCorrect(password);
    // Compare the plain text password directly (no hashing)
    if (!isPasswordValid) {
      throw new ApiError(401, "Invalid user credentials.");
    }

    // Step 3: Check the user's role and associated collection
    let roleSpecificData;
    if (user.role === "customer") {
      roleSpecificData = await Customer.findById(user.linkedId); // Assuming linkedId connects User to Customer
      // console.log("User DATA by ROLE : ", roleSpecificData);
    } else if (user.role === "driver") {
      roleSpecificData = await Driver.findById(user.linkedId); // Example for another role
      // console.log("User DATA by ROLE : ", roleSpecificData);
    } else if (user.role === "partner") {
      roleSpecificData = await Partner.findById(user.linkedId); // Example for another role
      // console.log("User DATA by ROLE : ", roleSpecificData);
    } else {
      throw new ApiError(400, "Unsupported user role.");
    }

    if (!roleSpecificData) {
      throw new ApiError(404, "Role-specific data not found.");
    }

    // Step 4: Check if the deviceToken already exists
    if (
      roleSpecificData.deviceTokens &&
      roleSpecificData.deviceTokens.includes(deviceToken)
    ) {
      // console.log(
      //   `Device token already exists for this ${user.role}:`,
      //   deviceToken
      // );
    } else {
      if (!roleSpecificData.deviceTokens) {
        roleSpecificData.deviceTokens = [];
      }
      roleSpecificData.deviceTokens.push(deviceToken);
      await roleSpecificData.save();
      // console.log(`Device token saved for the ${user.role}:`, deviceToken);
    }

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
      user._id,
      type
    );
    const loggedInUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    const options = {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    };

    console.log("access token", accessToken);
    console.log("refresh token", refreshToken);
    console.log(req.user);

    return res
      .status(201)
      .cookie("accessToken", accessToken, options)
      .cookie("refersToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            user: loggedInUser,
            accessToken,
            refreshToken,
          },
          "User logged In Successfully"
        )
      );
  } catch (err) {
    // console.error('Error during login attempt:', err);
    // return res.status(500).json(
    //   new ApiResponse(500, null, `Error Login user`)
    // );
    next(err);
  }
};

const updateProfile = async (req, res) => {
  // console.log(req.body);
  const { fullName, email, phoneNumber, address } = req.body; // Extract text fields from body

  try {
    const userId = req.user.linkedId; // Replace with dynamic user ID if needed
    const role = req.user.role;

    let user;

    // Fetch user based on role
    switch (role) {
      case "customer":
        user = await Customer.findById(userId);
        if (!user) {
          throw new ApiError(404, "Customer not found");
        }
        // Update customer-specific fields
        user.fullName = fullName || user.fullName;
        user.email = email || user.email; // Update email in Customer schema
        user.phoneNumber = phoneNumber || user.phoneNumber;
        user.address = address || user.address;
        break;

      case "partner":
        user = await Partner.findById(userId);
        if (!user) {
          throw new ApiError(404, "Partner not found");
        }

        user.fullName = fullName || user.fullName;
        user.email = email || user.email;
        user.phoneNumber = phoneNumber || user.phoneNumber;
        user.address = address || user.address;
        user.imgUrl = req.body.imgUrl || user.imgUrl;
        user.termsAccepted =
          req.body.termsAccepted !== undefined
            ? req.body.termsAccepted
            : user.termsAccepted;
        user.paymentDetails.accountNumber =
          req.body.account || user.paymentDetails.accountNumber;
        user.paymentDetails.upi_id = req.body.upi || user.paymentDetails.upi_id;
        user.bussinessinfo.company_name =
          req.body.company || user.bussinessinfo.company_name;
        user.bussinessinfo.company_add =
          req.body.companyAddress || user.bussinessinfo.company_add;
        user.bussinessinfo.service_area =
          req.body.area || user.bussinessinfo.service_area;

        break;

      case "driver":
        user = await Driver.findById(userId);
        if (!user) {
          throw new ApiError(404, "Driver not found");
        }
        // Update driver-specific fields
        user.fullName = fullName || user.fullName;
        user.email = email || user.email; // Update email in Driver schema
        user.phoneNumber = phoneNumber || user.phoneNumber;
        user.licenseNumber = req.body.licenseNumber || user.licenseNumber; // Optional
        break;

      default:
        throw new ApiError(404, "User not found");
    }

    const updatedUser = await user.save();
    // console.log("updated user :",updatedUser)
    const mainUserId = req.user._id;
    // Now, also update the email in the main User schema to ensure consistency
    const mainUser = await User.findById(mainUserId);
    if (!mainUser) {
      throw new ApiError(404, "User Not found");
    }

    mainUser.email = email || mainUser.email;
    const updatedMainUser = await mainUser.save();

    // If saving the main user fails, throw an error
    if (!updatedMainUser) {
      throw new ApiError(404, "Failed to update main user email");
    }

    // Log the updated user data to the console (response logging)
    // console.log("Updated User Profile:", {
    //   fullName: updatedUser.fullName,
    //   email: updatedUser.email,
    //   phoneNumber: updatedUser.phoneNumber,
    //   address: updatedUser.address,
    // });

    // Send the success response
    res
      .status(200)
      .json(new ApiResponse(200, updatedUser, "Update Successfully"));
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Server error. Could not update profile." });
  }
};

// Fetch user profile by userId
const getUserProfile = async (req, res) => {
  const userId = req.user.linkedId;
  const role = req.user.role;
  // console.log("my req file is ", req.user);
  try {
    // Find the user by userId, excluding the password field
    let user = null;
    switch (role) {
      case "customer":
        user = await Customer.findById(userId).select("-password");
        break;
      case "driver":
        user = await Driver.findById(userId).select("-password");
        break;
      case "partner":
        user = await Partner.findById(userId).select("-password");
        break;

      default:
        throw new ApiError(400, "Invalid user role");
    }

    // If user is not found, return an error
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Log the user object to the terminal for debugging purposes
    // console.log("Fetched User Profile:", user);
    // console.log("access token",accessToken)
    // console.log("refresh token",refreshToken)

    // Send the user profile data in the response
    res
      .status(201)
      .json(new ApiResponse(200, user, "Fetch User Profile Successfully"));
  } catch (err) {
    console.error("Error fetching user profile:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// handle image upload and Cloudinary integration
const uploadImage = async (req, res) => {
  console.log("Received upload request with file:", req.files); // Debugging log

  try {
    // Ensure file is received
    if (!req.files) {
      throw new ApiError(400, "NO File Uploaded");
    }

    // console.log(req.files.file[0].path);
    // Log the file details for debugging

    // Upload image to Cloudinary
    const cloudinaryResponse = await cloudinary.uploader.upload(
      req.files.file[0].path,
      {
        folder: "profile_images", // Optional: Specify folder in Cloudinary
        public_id: `${Date.now()}`, // Optional: Use a custom public ID (e.g., using the timestamp)
      }
    );

    // console.log("my file is ", req.user);
    // Hardcoded user ID for testing
    const userId = req.user.linkedId;
    const role = req.user.role;
    // console.log("my id  is", userId);

    let updatedUser;

    // Use switch case to handle updates based on role
    switch (role) {
      case "customer":
        updatedUser = await Customer.findByIdAndUpdate(
          userId,
          { imgUrl: cloudinaryResponse.secure_url }, // Update the user's profile image URL
          { new: true } // Return the updated user document
        );
        break;

      case "driver":
        updatedUser = await Driver.findByIdAndUpdate(
          userId,
          { imgUrl: cloudinaryResponse.secure_url }, // Update the driver's profile image URL
          { new: true } // Return the updated user document
        );
        break;

      case "partner":
        updatedUser = await Partner.findByIdAndUpdate(
          userId,
          { imgUrl: cloudinaryResponse.secure_url }, // Update the partner's profile image URL
          { new: true } // Return the updated user document
        );
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid role specified",
        });
    }
    if (!updatedUser) {
      throw new ApiError(
        404,
        "User not found or unable to update the profile image"
      );
    }

    fs.unlinkSync(req.files.file[0].path); //unlink the file from the local storage after upload successfully image

    // Send the updated user data back in the response
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { imageUrl: cloudinaryResponse.secure_url },
          "Image uploaded and user updated successfully"
        )
      );
  } catch (error) {
    console.error("Error uploading image:", error); // Log errors
    fs.unlinkSync(req.files.file[0].path); //delete the image file in localstorage because faliure of image upload on cloudinary;
    throw new ApiError(500, error.message);
    next(error.message);
  }
};

//log out user
const logoutUser = async (req, res, next) => {
  try {
    // Make sure the user object is set and exists
    if (!req.user || !req.user._id) {
      throw new ApiError(400, "User not authenticated");
    }

    // Update user's refreshToken to undefined in the database
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          refreshToken: undefined, // Removing the refresh token
        },
      },
      { new: true }
    );

    // Clear cookies with the httpOnly and secure options
    const options = {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      // Ensure the `secure` flag is set only if using HTTPS
    };

    return (
      res
        .status(200)
        // .clearCookie("accessToken",accessToken,options)
        // .clearCookie("refreshToken", newRefreshToken,options)
        .json(new ApiResponse(200, {}, "User logged Out"))
    );
  } catch (error) {
    next(error); // Pass error to error handling middleware
  }
};

//refresh access-token or give a new access token using refeshToken which is saved in database

const refreshAccessToken = async (req, res, next) => {
  try {
    const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
      throw new ApiError(401, "RefreshToken Not Found");
    }
    const decodeInformation = await jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    if (!decodeInformation) {
      throw new ApiError(401, "Invalid refreshToken");
    }

    const user = await User.findById(decodeInformation._id);

    if (!user) {
      throw new ApiError(401, "Invalid RefreshToken");
    }

    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const { refreshToken, accessToken } = await generateAccessAndRefereshTokens(
      user._id
    );
    console.log(refreshToken, accessToken);
    const options = {
      httpOnly: true,
      secure: true,
    };
    return res
      .status(200)

      .cookie("accessToken", accessToken, options)
      .cookie("newrefreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: refreshToken },
          "Access Token Refreshed"
        )
      );
  } catch (error) {
    next(error.message || "Invalid Refresh Token.");
  }
};

// Apply the multer middleware for file upload, and then handle profile update
// app.post('/profile', multerUpload, updateProfile);

export {
  registerUser,
  loginUser,
  updateProfile,
  getUserProfile,
  uploadImage,
  logoutUser,
  refreshAccessToken,
  updatePassword,
};
