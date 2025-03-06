import { Car } from "../models/car.js";
import { Driver } from "../models/driver.js";
import { Partner } from "../models/partner.js";
import { Customer } from "../models/customer.js";
import { Booking } from "../models/booking.js";
import { ObjectId } from "mongodb";
import { sendPushNotification } from "../services/NotificationServices.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import moment from 'moment';
import { newNotification } from "./notification.controller.js";
import mongoose from "mongoose";

export const createBooking = async (req, res) => {
  const customerId = req.user.linkedId;
  const role = req.user.role;

  const {
    carId,
    isDriverRequired,
    partnerId,
    pickUpLocation,
    returnLocation,
    durationInHours,
    pickUpDateTime,
    returnDateTime,
    totalRent,
  } = req.body;

  try {
    // Validate that the car exists
    const car = await Car.findById(carId);
    if (!car) {
      return res.status(404).json({ error: "Car not found" });
    }

    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ error: "Partner not found" });
    }


    const start = moment(pickUpDateTime, 'DD/MM/YYYY HH:mm').toDate();
    const end = moment(returnDateTime, 'DD/MM/YYYY HH:mm').toDate();

    // Check if the car is already booked during the specified time range
    const existingCarBooking = await Booking.findOne({
      carId,
      $or: [
        { pickUpDateTime: { $lte: end }, returnDateTime: { $gte: start } },
        { pickUpDateTime: { $gte: start }, returnDateTime: { $lte: end } },
      ],
    });

    if (existingCarBooking) {
      return res.status(400).json({
        error:
          "Car is already booked during the specified time. Please choose another time.",
      });
    }

    // Check if the customer already has a booking during the same time range
    const existingCustomerBooking = await Booking.findOne({
      customerId,
      $or: [
        { pickUpDateTime: { $lte: end }, returnDateTime: { $gte: start } },
        { pickUpDateTime: { $gte: start }, returnDateTime: { $lte: end } },
      ],
    });

    if (existingCustomerBooking) {
      return res.status(400).json({
        error:
          "You already have a booking during the specified time. Please choose another time.",
      });
    }

    // Create the booking
    const newBooking = new Booking({
      customerId,
      carId,
      partnerId,
      pickupLocation: pickUpLocation,
      dropoffLocation: returnLocation,
      startDate: start,
      endDate: end,
      totalAmount: totalRent,
      durationInDays: durationInHours, // Ensure this is the correct unit (Days)
      driverStatus: isDriverRequired ? "pending" : "accepted",
    });

    console.log("New Booking : ", newBooking)
    const savedBooking = await newBooking.save();

    // Use aggregation pipeline to include only brand and model from car data
    const bookingWithCarData = await Booking.aggregate([
      { $match: { _id: savedBooking._id } },
      {
        $lookup: {
          from: "cars", // Collection name for cars
          localField: "carId",
          foreignField: "_id",
          as: "carData",
        },
      },
      {
        $unwind: {
          path: "$carData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          customerId: 1,
          carId: 1,
          partnerId: 1,
          pickupLocation: 1,
          dropoffLocation: 1,
          startDate: 1,
          endDate: 1,
          totalAmount: 1,
          durationInDays: 1,
          driverStatus: 1,
          paymentStatus: 1,
          partnerStatus: 1,
          carData: { brand: 1, model: 1, pricePerDay: 1 }, // Only include brand and model from carData
        },
      },
    ]);

    if (!bookingWithCarData.length) {
      return res
        .status(500)
        .json({ error: "Failed to retrieve booking data with car details" });
    }

    const title1 = 'New Booking Alert'
    const body1 = `Hi ${partner.fullName}, A customer has successfully booked your car ${car.brand} ${car.model}. Please check the booking details.`
    const type = "partner"
    const bookingId = savedBooking._id
    await newNotification(partnerId, customerId, title1, body1, false, type, bookingId);

    const title = `New Car Booking Alert`;
    const body = `Hello ${partner.fullName}, a customer has successfully booked your car ${car.brand} ${car.model}. Please check the booking details.`;
    const dataPayload = {
      bookingId: savedBooking._id.toString(),
      click_action: "OPEN_PARTNER_BOOKING_REQUEST",
    };
    await sendPushNotification(partner.deviceTokens, title, body, dataPayload);

    res
      .status(201)
      .json(
        new ApiResponse(
          200,
          bookingWithCarData[0],
          "Booking created and sent to partner for approval"
        )
      );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create booking" });
  }
};

export const getBookingByPartner = async (req, res) => {
  const partnerId = req.user.linkedId;

  try {
    if (!partnerId || !ObjectId.isValid(partnerId)) {
      return res.status(400).json(new ApiError(400, "Invalid or missing PartnerId"));
    }

    const bookings = await Booking.find({
      partnerId: new ObjectId(partnerId),
    })
      .populate("carId")
      .populate("driverId")
      .limit(4);

    if (!bookings.length) {
      return res.status(404).json(new ApiError(404, "No Bookings Found!"));
    }

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${monthNames[date.getMonth()]}-${date.getDate().toString().padStart(2, "0")}-${date.getFullYear()}`;
    };

    const formattedBookings = bookings.map((booking) => ({
      ...booking._doc,
      startDate: formatDate(booking.startDate),
      endDate: formatDate(booking.endDate),
    }));

    res.status(200).json(new ApiResponse(200, formattedBookings, "All Bookings Fetched"));
  } catch (error) {
    console.error("Error fetching Bookings: ", error);
    res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

// export const partnerConfirmBooking = async (req, res) => {
//     const {bookingId, driverId } = req.body;
//     console.log(req.body);

//     try {
//         const booking = await Booking.findById(bookingId);
//         console.log("Booking Found : ",booking)
//         if(!booking) {
//             return res.status(404).json({ error: " Booking Not Found "});
//         }

//         booking.driverId = driverId;
//         booking.partnerStatus = 'confirmed'

//         console.log("Now Booking Status: ",booking)
//         await booking.save();

//         // await sendPushNotification(driver.deviceTokens, title, body);

//         res.status(200).json({message: " Booking confirmed by the partner, driver Notified"})
//     } catch (error) {
//         console.error("Ye Error : ",error);
//         res.status(500).json({error : "Failed to confirm booking by partner"})
//     }
// }

// // Function to send notification to driver
// const sendDriverNotification = async (driverId, bookingId) => {
//     // Assuming you have a driver model to find driver details
//     const driver = await Driver.findById(driverId);
//     const message = `You have a new booking request. Please confirm or reject the booking. Booking ID: ${bookingId}`;

//     // Send notification to driver (email, SMS, in-app)
//     await sendEmail(driver.email, 'New Booking Request', message);
//   };

//   export const driverConfirmBooking = async (req, res) => {
//     const { bookingId, driverStatus } = req.body; // driverStatus can be 'accepted' or 'rejected'

//     try {
//       const booking = await Booking.findById(bookingId);
//       if (!booking) {
//         return res.status(404).json({ error: 'Booking not found' });
//       }

//       // Update the driver status based on the driver's action
//       booking.driverStatus = driverStatus;
//       await booking.save();

//       if (driverStatus === 'accepted') {
//         // Notify the partner that the driver accepted
//         await sendPartnerNotification(booking.partnerId, bookingId);
//         res.status(200).json({ message: 'Driver accepted the booking' });
//       } else {
//         // Notify both partner and customer that the driver rejected
//         await sendRejectionNotifications(booking.partnerId, booking.customerId, bookingId);
//         res.status(200).json({ message: 'Driver rejected the booking' });
//       }
//     } catch (error) {
//       console.error(error);
//       res.status(500).json({ error: 'Failed to update driver status' });
//     }
//   };

//   // Send rejection notifications to partner and customer
// const sendRejectionNotifications = async (partnerId, bookingId) => {
//     const partner = await Partner.findById(partnerId);

//     // Notify partner
//     const partnerMessage = `Driver rejected the booking. Please select another driver for Booking ID: ${bookingId}`;
//     await sendEmail(partner.email, 'Booking Rejected by Driver', partnerMessage);

//   };

//   export const partnerFinalConfirm = async (req, res) => {
//     const { bookingId } = req.body;

//     try {
//       const booking = await Booking.findById(bookingId);
//       if (!booking) {
//         return res.status(404).json({ error: 'Booking not found' });
//       }

//       // Final confirmation by partner
//       booking.status = 'confirmed'; // Booking finalized

//       await booking.save();

//       // Notify customer and driver about the final confirmation
//       await sendFinalNotification(booking.customerId, booking.driverId, bookingId);

//       res.status(200).json({ message: 'Booking confirmed successfully' });
//     } catch (error) {
//       console.error(error);
//       res.status(500).json({ error: 'Failed to confirm booking by partner' });
//     }
//   };

//   // Send final confirmation notification to customer and driver
// const sendFinalNotification = async (customerId, driverId, bookingId) => {
//     const customer = await Customer.findById(customerId);
//     const driver = await Driver.findById(driverId);

//     // Notify customer
//     const customerMessage = `Your booking has been confirmed. Booking ID: ${bookingId}`;
//     await sendEmail(customer.email, 'Booking Confirmed', customerMessage);

//     // Notify driver
//     const driverMessage = `You have been assigned to a new booking. Booking ID: ${bookingId}`;
//     await sendEmail(driver.email, 'Booking Assigned', driverMessage);
//   };

export const getBookingByCarId = async (req, res) => {
  const carId = req.params.carId;
  try {
    if (!carId || !ObjectId.isValid(carId)) {
      return res
        .status(400)
        .json({ success: false, message: " Invalid or missing Car Id" });
    }

    const bookings = await Booking.find({ carId: new ObjectId(carId) });
    if (bookings.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: " No Bookings Found! " });
    }

    // console.log("Bookings : ", bookings);
    res.status(200).json({
      success: true,
      message: "Booking Fetched SucccessFully",
      data: bookings,
    });
  } catch (error) {
    console.error("Error fetching Bookings : ", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getBookingByUserId = async (req, res) => {
  const userId = req.user.linkedId;

  try {
    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing UserId",
      });
    }
    const booking = await Booking.find({
      customerId: new ObjectId(userId),
    }).populate("carId").populate("driverId");
    if (booking.length === 0) {
      return res.status(404).json({
        success: false,
        message: " No Booking found! ",
      });
    }

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = monthNames[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
      return `${month}-${day.toString().padStart(2, '0')}-${year}`;
    };
    // Modify date format in each booking
    const bookings = booking.map((booking) => ({
      ...booking._doc, // Ensure you include the original data from the document
      startDate: formatDate(booking.startDate),
      endDate: formatDate(booking.endDate),
    }));
    // console.log("Bookings : ", bookings);
    res.status(200).json({
      success: true,
      message: "Bookings SucccessFully Fetched ",
      data: bookings,
    });
  } catch (error) {
    console.error("Error fetching Bookings : ", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getBookingByDriverId = async (req, res) => {
  const driverId = req.user;
  try {
    if (!driverId || !ObjectId.isValid(driverId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing Driver Id",
      });
    }

    const bookings = await Booking.find({
      driverId: new ObjectId(driverId),
    }).populate("customerId");
    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Bookings Not found!",
      });
    }

    // console.log("bookings : ", bookings);

    res.status(200).json({
      success: true,
      message: "bookings SuccessFully fetched!",
      data: bookings,
    });
  } catch (error) {
    console.error("Error fetching Bookings : ", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getAllBooking = async (req, res) => {
  try {
    const formattedBookings = await Booking.find();

    // Helper function to format date
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = monthNames[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
      return `${month}-${day.toString().padStart(2, '0')}-${year}`;
    };

    // Modify date format in each booking
    const bookings = formattedBookings.map((booking) => ({
      ...booking._doc, // Ensure you include the original data from the document
      startDate: formatDate(booking.startDate),
      endDate: formatDate(booking.endDate),
    }));

    return res.status(200).json({
      message: "Bookings fetched",
      data: bookings,
    });
  } catch (error) {
    return res.status(404).json({ message: "Data not found" });
  }
};

export const updateBookingPaymentStatus = async (req, res) => {
  const { bookingId, paymentStatus } = req.body;
  // console.log("request : ", req.body);

  try {
    const booking = await Booking.findById(bookingId);
    // console.log("Booking : ", booking);
    if (!booking) {
      throw new Error("Booking not found");
    }
    booking.paymentStatus = paymentStatus;

    if (paymentStatus === "completed") {
      booking.status = "booked"; // Optionally, update booking status based on payment
    } else {
      console.log("Not Matched");
    }
    await booking.save();
    return booking;
  } catch (error) {
    throw new Error("Failed to update payment status");
  }
};

export const deleteBookingById = async (req, res) => {
  const driverId = req.params.driverId;

  console.log("Booking ID:", driverId);

  try {
    // Convert bookingId to ObjectId
    if (!ObjectId.isValid(driverId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Booking ID format",
      });
    }

    const driver = new ObjectId(driverId);
    // console.log("objectId Booking:", driver);

    // Find and delete the booking
    const deletedBooking = await Booking.findOneAndDelete({ driverId: driver });

    // console.log("Deleted Booking:", deletedBooking);

    if (!deletedBooking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found with the provided ID",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Booking deleted successfully",
      data: deletedBooking,
    });
  } catch (error) {
    console.error("Error deleting booking:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getBookingById = async (req, res) => {
  const { bookingId } = req.params;

  try {
    if (!bookingId) {
      return res.status(400).json(new ApiError(400, {}, "Booking ID is required"));
    }

    // Use aggregation to join Booking, Car, and Customer collections
    const bookingData = await Booking.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(bookingId) } }, // Match the booking by ID
      {
        $lookup: {
          from: "cars", // Car collection
          localField: "carId",
          foreignField: "_id",
          as: "carDetails",
        },
      },
      {
        $lookup: {
          from: "customers", // Customer collection
          localField: "customerId",
          foreignField: "_id",
          as: "customerDetails",
        },
      },
      {
        $lookup: {
          from: "partners",
          localField: "partnerId",
          foreignField: "_id",
          as: "partnerDetails"
        }
      },
      {
        $unwind: "$carDetails", // Unwind to get single car object
      },
      {
        $unwind: "$customerDetails", // Unwind to get single customer object
      },
      {
        $unwind: "$partnerDetails",
      },
      {
        $project: {
          _id: 1,
          startDate: 1,
          endDate: 1,
          totalAmount: 1,
          pickupLocation: 1,
          dropoffLocation: 1,
          durationInDays: 1,
          paymentStatus: 1,
          penalties: 1,
          partnerStatus: 1,
          driverStatus: 1,
          status: 1,
          partnerId: 1,
          driverId: 1,
          carId: 1,
          customerId: 1,
          carModel: "$carDetails.model",
          carName: "$carDetails.brand",
          RegistrationNumber: "$carDetails.registrationNumber",
          pricePerDay: "$carDetails.pricePerDay",
          carPickupLocation: "$carDetails.pickupLocation",
          carDropoffLocation: "$carDetails.dropoffLocation",
          cName: "$customerDetails.fullName",
          cPhone: "$customerDetails.phoneNumber",
          cImage: "$customerDetails.imgUrl",
          partnerName: "$partnerDetails.fullName",
          partnerPhone: "$partnerDetails.phoneNumber",
        },
      },
    ]);

    if (!bookingData.length) {
      return res.status(404).json(new ApiError(404, {}, "Booking not found"));
    }

    // Format the date fields
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = monthNames[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
      return `${month}-${day.toString().padStart(2, '0')}-${year}`;
    };

    const booking = {
      ...bookingData[0],
      startDate: formatDate(bookingData[0].startDate),
      endDate: formatDate(bookingData[0].endDate),
    };

    console.log("Booking : ", booking)

    return res.status(200).json(new ApiResponse(200, booking, "Booking fetched successfully"));
  } catch (error) {
    console.error("Error fetching booking:", error);
    return res.status(500).json(new ApiError(500, {}, "Error fetching booking"));
  }
};

export const updatePartnerStatus = async (req, res) => {
  const userId = req.user.linkedId;
  const { bookingId, partnerStatus, status } = req.body;
  console.log("userId : ", userId)
  console.log("req.body : ", req.body)

  try {
    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        partnerStatus,
        status,
      },
      { new: true }
    );

    const customer = await Customer.findById(updatedBooking.customerId)
    // console.log("Customer : ",customer)

    const partner = await Partner.findById(updatedBooking.partnerId)
    // console.log("Partner : ",partner)

    if (!updatedBooking) {
      return res.status(404).json(new ApiError(404, "Booking not found"));
    }

    const title = `New Drive Assignment Alert`;
    const body = `You've been assigned as the driver for an upcoming drive. Please check the details and get ready to hit the road!`;
    const dataPayload = {
      bookingId: updatedBooking._id.toString(),
      click_action: "OPEN_PARTNER_BOOKING_REQUEST",
    };
    // await sendPushNotification(driver.deviceTokens, title, body,dataPayload);
    res.status(200).json(new ApiResponse(200, updatedBooking, "Booking updated successfully"));
  } catch (error) {
    console.error("Error updating booking:", error);
    res.status(500).json(new ApiError(500, {}, "Failed to update booking"));
  }
};

export const assinDriver = async (req, res) => {
  const userId = req.user.linkedId;
  const { bookingId, driverId } = req.body;
  console.log("userId : ", userId)
  console.log("req.body : ", req.body)

  try {
    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
        { driverId: driverId },
        { new: true } 
    );

    const driver = await Driver.findById(driverId)
    console.log("Driver ID: ", driver);

    const customer = await Customer.findById(updatedBooking.customerId)
    console.log("Customer ID: ", customer);
    console.log("updatedBooking : ", updatedBooking)
    if (!updatedBooking) {
      return res.status(404).json(new ApiError(404, "Booking not found"));
    }

    const title = "New Ride Assignment 🚗";
    const body = `You have been assigned to a new ride. Pickup at ${updatedBooking.pickupLocation} and drop-off at ${updatedBooking.dropoffLocation}. Start time: ${updatedBooking.startDate}.`;
    const dataPayload = {
      bookingId: updatedBooking._id.toString(),
      click_action: "OPEN_DRIVER_BOOKING_REQUEST",
    };

    const title1 = `Your Booking Confirmed ,${driver.fullName} Assigned to Your Ride 🚖`;
    const body1 = `Your driver, ${driver.fullName}, is on the way. Pickup at ${updatedBooking.pickupLocation}. Contact: ${driver.phoneNumber}."`;
    const dataPayload1 = {
      bookingId: updatedBooking._id.toString(),
      click_action: "CUSTOMER_CONFIRMED_NOTIFICATION",
    };

    await newNotification(driverId, userId, title, body, false, 'driver', bookingId);
    await newNotification(updatedBooking.customerId, userId, title1, body1, false, 'customer', bookingId);

    await sendPushNotification(driver.deviceTokens, title, body, dataPayload);
    await sendPushNotification(customer.deviceTokens, title1, body1, dataPayload1);
    res.status(200).json(new ApiResponse(200, updatedBooking, "Booking updated successfully"));
  } catch (error) {
    console.error("Error updating booking:", error);
    res.status(500).json(new ApiError(500, {}, "Failed to update booking"));
  }
};

export const updateDriverStatus = async (req, res) => {
  const userId = req.user.linkedId;
  const { bookingId, driverStatus, status} = req.body;
  console.log("userId : ", userId)
  console.log("req.body : ", req.body)

  try {
    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        driverStatus,
        status,
      },
      { new: true }
    );

    const driver = await Driver.findById(userId)
    console.log("Driver ID: ", driver);

    const customer = await Customer.findById(updatedBooking.customerId)
    console.log("Customer ID: ", customer);
    console.log("updatedBooking : ", updatedBooking)
    if (!updatedBooking) {
      return res.status(404).json(new ApiError(404, "Booking not found"));
    }

    const title = "New Ride Assignment 🚗";
    const body = `You have been assigned to a new ride. Pickup at ${updatedBooking.pickupLocation} and drop-off at ${updatedBooking.dropoffLocation}. Start time: ${updatedBooking.startDate}.`;
    const dataPayload = {
      bookingId: updatedBooking._id.toString(),
      click_action: "OPEN_DRIVER_BOOKING_REQUEST",
    };

    const title1 = `Your Booking Confirmed ,${driver.fullName} Assigned to Your Ride 🚖`;
    const body1 = `Your driver, ${driver.fullName}, is on the way. Pickup at ${updatedBooking.pickupLocation}. Contact: ${driver.phoneNumber}."`;
    const dataPayload1 = {
      bookingId: updatedBooking._id.toString(),
      click_action: "CUSTOMER_CONFIRMED_NOTIFICATION",
    };

    // await newNotification(userId, userId, title, body, false, 'driver', bookingId);
    await newNotification(updatedBooking.customerId, userId, title1, body1, false, 'customer', bookingId);

    // await sendPushNotification(driver.deviceTokens, title, body, dataPayload);
    await sendPushNotification(customer.deviceTokens, title1, body1, dataPayload1);
    res.status(200).json(new ApiResponse(200, updatedBooking, "Booking updated successfully"));
  } catch (error) {
    console.error("Error updating booking:", error);
    res.status(500).json(new ApiError(500, {}, "Failed to update booking"));
  }
};