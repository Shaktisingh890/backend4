import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const dbURI = process.env.MONGO_URI; // Fetch the Mongo URI from the environment variable
    await mongoose.connect(dbURI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit the process if the database connection fails
  }
};

export { connectDB };
