import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from 'jsonwebtoken';
import User from "../models/user.js";




// Secret key used to sign the JWT token (this should be stored securely, like in environment variables)
const secretKey = process.env.ACCESS_TOKEN_SECRET;

// Middleware to check if the request has a valid JWT token
export const authMiddleware = async (req, res, next) => {
  try {
    // Check if the Authorization header exists
    const token = req.headers['authorization']?.split(' ')[1]; // Format: 'Bearer <token>'
    if (!token) {
      throw new ApiError(401, "Access Denied. No token provided.");
    }
    
    // console.log("Token received:", token);

    // Verify the token using jwt.verify() method
    const decodedToken = jwt.verify(token, secretKey);
    console.log("Decoded token:", decodedToken);

    // Extract the type from the decoded token
    const type = decodedToken.type;
    const userId = decodedToken._id;

    
    const user = await User.findById(userId).select("-password -refreshToken");
    
    // console.log("user  :",user)
    // Check if the user exists
    if (!user) {
      throw new ApiError(401, "Invalid Access Token");
    }

    // Attach the user object to the request for further use
    req.user = user;

    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    // Catch errors and handle them appropriately
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new ApiError(401, "Invalid Token"));
    }
    if (error instanceof ApiError) {
      return next(error); // Re-throw the custom error
    }

    // Unexpected error
    console.error("Unexpected error in authMiddleware:", error);
    return next(new ApiError(500, "Internal Server Error"));
  }
};
