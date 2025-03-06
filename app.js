import express from 'express';
import cors from 'cors'
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import crypto from 'crypto';
import bodyParser from 'body-parser';

// Import route handlers
import userRouter from './routes/user.routes.js';
import customerRouter from './routes/customer.routes.js';
import driverRouter from './routes/driver.routes.js';
import partnerRouter from './routes/partner.routes.js';
import carRouter from './routes/car.routes.js';
import bookingRouter from './routes/booking.routes.js'
import notificationRouter from './routes/notification.routes.js'

// Initialize dotenv
dotenv.config({
  path: './.env'
});

// Initialize express app
const app = express();

connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());
app.use(bodyParser.json());

// Request Logger Middleware (logs incoming requests)
const requestLogger = (req, res, next) => {
  console.log('--- Incoming Request ---');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Method: ${req.method}`);
  console.log(`URL: ${req.originalUrl}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('------------------------');
  
  next();
};

app.post('/callback', (req, res) => {
  console.log('Received callback:', req.body);
  res.status(200).send('OK'); // Respond with 200 status
});
// Use the request logger middleware to log all incoming requests
app.use(requestLogger);

// Register a test endpoint
app.post("/registerDriver", (req, res) => {
  console.log(req.body); // Log non-file fields
  console.log(req.files); // Log uploaded files
});

// Routes
app.use("/api/v1/users", userRouter);
app.use("/api/v1/customers", customerRouter);
app.use("/api/v1/drivers", driverRouter);
app.use("/api/v1/partners", partnerRouter);
app.use("/api/v1/cars", carRouter);
app.use("/api/v1/booking", bookingRouter);
app.use("/api/v1/notifications",notificationRouter)

// Webhook endpoint for PhonePe payment callback
app.post('/phonepe-webhook', (req, res) => {
  const receivedSignature = req.headers['x-verify'];  // Get the signature from request headers
  const requestBody = JSON.stringify(req.body);  // Stringify the request body for checksum calculation
  
  console.log("Request Body: ", requestBody);
  console.log("Received Signature: ", receivedSignature);

  // Step 1: Validate the signature using the updated checksum formula
  const base64Body = prepareBase64Payload(req.body);  // Create Base64 encoded payload from request body
  const calculatedSignature = calculateSignature(base64Body);
  console.log("Calculated Signature: ", calculatedSignature);

  // Check if the received signature matches the calculated signature
  if (receivedSignature === calculatedSignature) {
    // Step 2: Process the payment response
    const { status, transactionId, amount } = req.body;
    console.log(`Payment Status: ${status}`);
    console.log(`Transaction ID: ${transactionId}`);
    console.log(`Amount: ${amount}`);

    // Depending on the status, you can update the database or take action here
    if (status === 'PAYMENT_SUCCESS') {
      res.status(200).json({ status: 'success', message: 'Payment successful' });
    } else {
      res.status(400).json({ status: 'error', message: 'Payment failed' });
    }
  } else {
    // If the signatures do not match, respond with an error
    console.error('Invalid Signature');
    res.status(400).json({ status: 'error', message: 'Invalid signature' });
  }
});

// Function to calculate the HMAC-SHA256 signature for validation
function calculateSignature(base64Body) {
 
  const checksumString = base64Body + "/pg/v1/pay" + '58a63b64-574d-417a-9214-066bee1e4caa';  // Combine the base64Body + apiEndPoint + salt + "###1"
  return sha256(checksumString)+"###1";
}

// Function to compute SHA-256 hash of a string
function sha256(input) {
  return crypto
    .createHash('sha256')
    .update(input, 'utf8')
    .digest('hex');
}

// Function to prepare the Base64 encoded payload from request body
function prepareBase64Payload(body) {
  try {
    const payloadString = JSON.stringify(body);  // Convert the body to a string
    const base64Payload = Buffer.from(payloadString, 'utf8').toString('base64');  // Base64 encode it
    return base64Payload;
  } catch (error) {
    console.error('Error preparing Base64 payload:', error);
    return null;
  }
}


export { app };

//  remove added 