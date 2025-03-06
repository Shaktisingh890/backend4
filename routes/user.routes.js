// routes/userRoutes.js
import { Router } from 'express';
import {
  registerUser,
  loginUser,
  updateProfile,
  getUserProfile,
  uploadImage,
  logoutUser,
  refreshAccessToken,
  updatePassword
} from '../controllers/user.controller.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { mytest } from '../controllers/test.controller.js';
import { multerUpload } from '../middlewares/multerService.js';
import User from '../models/user.js';
import { Customer } from '../models/customer.js';
import { Driver } from '../models/driver.js';
import { Partner } from '../models/partner.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

const router = Router();

// POST route for login
router.post('/login', loginUser);

// POST route for registration
router.post('/register', multerUpload.fields([
  { name: 'photo', maxCount: 1 }, // Handle image field (photo)
  { name: 'fullName', maxCount: 1 }, // Handle full name (not an image)
  { name: 'email', maxCount: 1 }, // Handle email (not an image)
  { name: 'mobile', maxCount: 1 }, // Handle mobile number (not an image)
  { name: 'password', maxCount: 1 }, // Handle password (not an image)
]), registerUser);

// Define the GET route to fetch the user profile
router.get('/profile', authMiddleware, getUserProfile);

// POST route for image upload
router.post('/uploadImage', authMiddleware, multerUpload.fields([
  { name: 'file', maxCount: 1 }, // Handle image field (photo)

]), uploadImage);  // Image upload route

router.post("/updateProfile", authMiddleware, multerUpload.fields([

  { name: 'fullName', maxCount: 1 }, // Handle full name (not an image)
  { name: 'email', maxCount: 1 }, // Handle email (not an image)
  { name: 'mobile', maxCount: 1 }, // Handle mobile number (not an image)
  { name: 'password', maxCount: 1 }, // Handle password (not an image)
  { name: 'company', maxCount: 1 },
  { name: 'companyAddress', maxCount: 1 },
  { name: 'area', maxCount: 1 },
  { name: 'account', maxCount: 1 },
  { name: 'upi', maxCount: 1 },
]), updateProfile);

router.put('/update_password', authMiddleware, updatePassword);

router.post("/logout", authMiddleware, logoutUser);

router.post("/refresh-token", refreshAccessToken);

router.post("/test", mytest)

// router.get('/removeToken', async (req, res) => {
//   try {

//       const [customerResult, driverResult, partnerResult] = await Promise.all([
//         Customer.updateMany({}, { $set: { deviceTokens: [] } }),
//         Driver.updateMany({}, { $set: { deviceTokens: [] } }),
//         Partner.updateMany({}, { $set: { deviceTokens: [] } })
//       ]);

//       const modifiedCounts = {
//         customers: customerResult.modifiedCount,
//         drivers: driverResult.modifiedCount,
//         partners: partnerResult.modifiedCount
//     }

//       res.status(200).json(new ApiResponse ( 200,modifiedCounts,'Device tokens cleared successfully'));
//   } catch (error) {
//       res.status(500).json(new ApiError(500,'Error clearing device tokens'))
//   }
// });


export default router;

// check