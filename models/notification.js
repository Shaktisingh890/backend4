import mongoose, { Schema } from 'mongoose';

const NotificationSchema = new Schema({
    receiverId:{type: String, required :false},
    senderId:{type: String},
    title: { type: String, required: true },                 // Title of the notification
    body: { type: String, required: true },                  // Body of the notification
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: false }, // Associated booking ID
    type: { type: String, required: true },                  // Type of the notification (e.g., "booking", "alert", etc.)
    isRead: { type: Boolean, default: false }                // Status whether the notification is read or not
},{ timestamps:true});

// Create and export the Notification model
const Notification = mongoose.model('Notification', NotificationSchema);


export default Notification;