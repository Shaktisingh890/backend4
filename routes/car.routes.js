import { Router } from 'express';
import { Car } from '../models/car.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { multerUpload } from '../middlewares/multerService.js';

import { addCar, deleteCar, getAllCars, getCarById, updateCarDetails, getCarByCost, getCarByUserId, filterCarsByCategory, filterCarsBySubCategory, fetchCategory, fetchSubCategory } from '../controllers/car.controller.js';



const router = Router();


router.post('/addCar', authMiddleware, multerUpload.fields(
    [
        { name: 'image0', maxCount: 1 },
        { name: 'image1', maxCount: 1 },
        { name: 'image2', maxCount: 1 },
        { name: 'image3', maxCount: 1 },
        { name: 'idfront', maxCount: 1 },
        { name: 'idback', maxCount: 1 },
        { name: 'cardocumentfront', maxCount: 1 },
        { name: 'cardocumentback', maxCount: 1 },
        { name: 'vechilelicensefront', maxCount: 1 },
        { name: 'vechilelicenseback', maxCount: 1 },
        { name: 'bankpassbookphoto', maxCount: 1 }
    ]
), addCar)

router.get('/getAllCars', getAllCars)
router.get('/getCarByid/:carId', getCarById)
router.get('/getCarByCost', authMiddleware, getCarByCost);
router.get('/getCarByUserId', authMiddleware, getCarByUserId)

router.put('/updateCar/:carId', authMiddleware, multerUpload.fields(
    [
        { name: 'image0', maxCount: 1 },
        { name: 'image1', maxCount: 1 },
        { name: 'image2', maxCount: 1 },
        { name: 'image3', maxCount: 1 },
        { name: 'idfront', maxCount: 1 },
        { name: 'idback', maxCount: 1 },
        { name: 'cardocumentfront', maxCount: 1 },
        { name: 'cardocumentback', maxCount: 1 },
        { name: 'vechilelicensefront', maxCount: 1 },
        { name: 'vechilelicenseback', maxCount: 1 },
        { name: 'bankpassbookphoto', maxCount: 1 }
    ]
), updateCarDetails)

router.delete('/deleteCar/:carId', deleteCar)

// Route for filtering cars by category
router.get('/getCarByCategory', authMiddleware, filterCarsByCategory);

router.get('/getFetchCategory', authMiddleware, fetchCategory);
router.get('/getFetchSubCategory/:category', authMiddleware, fetchSubCategory);
// Route for filtering cars by subcategory
router.get('/getCarBysubCategory', authMiddleware, filterCarsBySubCategory);

// router.delete('/deleteAll', async (req, res) => {
//     try {
//       await Car.deleteMany({}); // Delete all data from the Car collection
//       console.log("All Cars Delete Successfully")
//       res.status(200).json({ message: 'All cars deleted successfully' });
//     } catch (err) {
//       console.error('Error deleting cars:', err);
//       res.status(500).json({ message: 'Error deleting cars' });
//     }
//   });


export default router;


// just check GitHub Revert


