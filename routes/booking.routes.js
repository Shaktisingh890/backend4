import {Router} from 'express';
import {Car} from '../models/car.js';
import { authMiddleware } from '../middlewares/authMiddleware.js'; 
import { multerUpload } from '../middlewares/multerService.js';
import { 
    createBooking,
    getAllBooking,
    getBookingByCarId,
    getBookingByUserId,
    getBookingByDriverId,
    deleteBookingById,
    updateBookingPaymentStatus,
    getBookingByPartner,
    getBookingById,
    updatePartnerStatus,
    updateDriverStatus,
    assinDriver
} from '../controllers/booking.controller.js';
import { Booking } from '../models/booking.js';

const router = Router();

router.post('/createBooking',authMiddleware, createBooking)
router.get("/getAllBooking",getAllBooking)
router.get('/getBookingByCarId/:carId',authMiddleware,getBookingByCarId)
router.get("/getBookingByuserId", authMiddleware, getBookingByUserId)
router.get("/getBookingBydriverId", authMiddleware, getBookingByDriverId)
router.get("/getBookingBypartner",authMiddleware, getBookingByPartner)
router.delete("/delete/:driverId", deleteBookingById)
router.put(`/paymentstatus`,updateBookingPaymentStatus)
router.get(`/byId/:bookingId`,authMiddleware ,getBookingById)
router.post('/updatePartnerStatus',authMiddleware,updatePartnerStatus);
router.post('/assignDriver',authMiddleware,assinDriver);
router.post('/updateDriverStatus',authMiddleware,updateDriverStatus)



// router.delete('/deleteAll', async (req, res) => {
//     try {
//       await Booking.deleteMany({}); // Delete all data from the Booking collection
//       console.log("All Booking Delete Successfully")
//       res.status(200).json({ message: 'All booking deleted successfully' });
//     } catch (err) {
//       console.error('Error deleting booking:', err);
//       res.status(500).json({ message: 'Error deleting booking' });
//     }
//   });


export default router;