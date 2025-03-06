import Router from "express";

const router = Router();

import { multerUpload } from "../middlewares/multerService.js";
import { registerDriver, loginDriver, getAllDrivers, removeDriver, updateDriverStatus, getDriverStatus } from "../controllers/driver.controller.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

router.post(
  "/registerDriver",
  multerUpload.fields([
    { name: 'licenseFront', maxCount: 1 },  // License front image
    { name: 'licenseBack', maxCount: 1 },   // License back image
    { name: 'fullName' },                   // Full name field
    { name: 'email' },                      // Email field
    { name: 'phoneNumber' },                // Phone number field
    { name: 'password' },                   // Password field
    { name: 'licenseNumber' },              // License number field
    { name: 'licenseExpiryDate' }           // License expiry date field
  ]),
  (req, res, next) => {
    // Log the uploaded files and request body before any error handling
    // console.log("Request body:", req.body);
    // console.log("Uploaded files:", req.files);

    // Check for file validation errors
    if (req.fileValidationError) {
      console.error("Multer file validation error:", req.fileValidationError);
      return res.status(400).json({ error: req.fileValidationError });
    }

    // Check if any form data is missing
    if (req.body && Object.keys(req.body).length === 0 && req.files && Object.keys(req.files).length === 0) {
      console.log("No valid form data received");
      return res.status(400).json({ error: "No valid form data received" });
    }

    // If everything looks good, proceed to the next middleware
    next();
  },
  registerDriver
);

router.get('/getAllDriver', authMiddleware, getAllDrivers)

router.delete('/remove', authMiddleware, removeDriver)

router.put('/updateStatus', authMiddleware, updateDriverStatus)

router.get('/getAvailability', authMiddleware, getDriverStatus)


export default router;
