import mongoose, { Schema } from "mongoose";

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Hashed password
  role: { type: String, enum: ['admin'], required: true },
  permissions: [{ type: String, enum: ['manageBookings', 'managePayments', 'viewReports'] }],
}, { timestamps: true });

export const Admin = mongoose.model('Admin', adminSchema);

