import fs from 'fs';
import Notification from "../models/notification.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ObjectId } from "mongodb";
import { Partner } from '../models/partner.js';


export const newNotification = async (receiverId, senderId, title, body, isRead = false, type, bookingId) => {
    // Validate inputs
    if (!receiverId || !senderId || !title || !body || !type ||!bookingId) {
        console.log(receiverId)
        console.log(senderId)
        console.log(title)
        console.log(body)
        console.log(bookingId)
        throw new Error("All fields (senderId, title, body, type) are required.");
    }

    try {
        // Create a new notification
        const notification = new Notification({
            receiverId,
            senderId,
            title,
            body,
            isRead,
            type,
            bookingId,
            createdAt: new Date(),
        });

        console.log("NewNotification : ",notification)
        // Save the notification to the database
        const savedNotification = await notification.save();
        console.log("Notification Saved : ",savedNotification)
        // Return the saved notification
        return savedNotification;
    } catch (error) {
        console.error("Error creating notification:", error);
        throw new Error("An error occurred while creating the notification.");
    }
};



const createNotification = async (req, res) => {
    // Extract request data
    const { title, body, bookingId,isRead } = req.body;
    const type = req.user.role;
    const userId=req.user.linkedId;

    // Debug log to inspect incoming request body
    console.log("DEBUG: Incoming request body:", req.body);

    try {
        // Validate required fields
        if (!title || !body ) {
            throw new Error("Missing required fields: title, body, or type");
        }

        // Debug log to confirm all required fields are present
        console.log("DEBUG: All required fields are present.");

        // Create the notification instance
        const newNotification = new Notification({
            receiverId:userId,
            title,
            body,
            bookingId: bookingId ? new ObjectId(bookingId) : null,
            type,
            isRead: isRead || false,
        });

        // Debug log to inspect notification data before saving
        console.log("DEBUG: Notification data to save:", newNotification);

        // Save the notification to the database
        const result = await newNotification.save();

        // Debug log to inspect saved notification result
        console.log("DEBUG: Notification saved successfully:", result);

        // Send success response
        res.status(201).json(
            new ApiResponse(201, result, "Notification saved successfully")
        );
    } catch (err) {
        // Debug log to inspect the error
        console.error("DEBUG: Error storing notification:", err);

        // Handle any errors during notification creation
        res.status(500).json(new ApiError(500, err.message));
    }
};



const fetchPartnerBookingNotification = async (req, res) => {
    const receiverId  = req.user.linkedId;

    console.log("received Id",receiverId);

    if (!receiverId) {
        return res.status(400).json(
            new ApiError(400,"partnerId is required")
           
           
        );
    }

    try {
        // Fetch notifications for the given partnerId
        const notifications = await Notification.find({receiverId});
            // Sort by most recent notifications
        
        console.log("mynotification vhv :",notifications);
        if (!notifications.length) {
            return res.status(404).json(
                new ApiError(404,"No notifications found for the provided partnerId")
                
            );
        }

        res.status(200).json(
            new ApiResponse(201,notifications,"Notifications fetched successfully")
          
        );
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json(
      
            new ApiError(500,error)
        );
    }
};


// Delete all notifications for a partner
 const deleteAllnotification = async (req, res) => {
    try {
        const receiverId = req.user.linkedId;

        // Ensure the partner exists
        const partner = await Partner.findById(receiverId);
        if (!partner) {
            return res.status(404).json(
                new ApiError(404,"Partner not found.")
               
            );
        }

        // Delete all notifications for the partner
        await Notification.deleteMany({ receiverId: receiverId });

        return res.status(200).json(
            new ApiResponse(200,{},'All notifications for the partner have been deleted successfully.')
           
        );
    } catch (error) {
        console.error(error);
        return res.status(500).json(
            new ApiError(500,error.message)
            
        );
    }
};

const deleteNotification = async (req, res) => {
    const notifyId = req.params.id;

    try {
        if(!notifyId){
            return res.status(400).json(new ApiError(400,"notifyId not found!"));
        }
        await Notification.findByIdAndDelete(notifyId);
        res.status(200).json(new ApiResponse(200, "notification Deleted Successfully"))

    } catch (error) {
        console.log("Error : ",error)
        res.status(200).json(new ApiError(500, "Internal server Error"))
    }
}

export { createNotification ,fetchPartnerBookingNotification,deleteAllnotification, deleteNotification};
