import fs from 'fs';
import { Car } from "../models/car.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js";
import cloudinary from "../config/cloudinary.js"
import { ObjectId } from "mongodb";
import { Booking } from "../models/booking.js";



// The updated addCar function
export const addCar = async function (req, res, next) {
    try {
        const carDetails = req.body.carDetails ? JSON.parse(req.body.carDetails) : req.body.carDetails;

        // console.log("Car details : ",carDetails)
        // Ensure the carDetails object is not empty or undefined
        if (!carDetails) {
            throw new ApiError(400, "carDetails is missing or empty");
        }

        const {
            carName,
            carModel,
            carYear,
            seatingCapacity,
            fuelType,
            dailyRentalPrice,
            carMileagePerHour: mileage,
            carColor: color,
            description,
            features,
            category,
            subcategory,
            pickupLocation,
            dropoffLocation,
            registrationNumber,
            transmissionType,
        } = carDetails;
        // console.log("Car details : ",carDetails)
        // Check if required fields are missing
        if (!carName || !carModel || !carYear || !category || !subcategory || !pickupLocation || !dropoffLocation) {
            throw new ApiError(400, "Missing required fields in car details.");
        }

        const deleteAllTempFiles = (files) => {
            Object.values(files).forEach(fileArray => {
                fileArray.forEach(file => {
                    fs.unlink(file.path, (err) => {
                        if (err) console.error(`Error deleting temp file ${file.path}:`, err);
                    });
                });
            });
        };

        // Initialize arrays to hold image URLs for documents and car images
        let carImages = [];
        let ownerDocImages = [];
        let carDocImages = [];
        let vehicleLicenseImages = [];
        let bankPassImage = "";

        // console.log("myfiles: ", req.files);

        // Process the uploaded images
        if (req.files) {
            // Loop over the files object to process each image field dynamically
            for (const [key, files] of Object.entries(req.files)) {
                for (let file of files) {
                    const localPath = file.path;
                    // console.log(`Uploading image from path: ${localPath}`);

                    try {
                        const cloudinaryResponse = await cloudinary.uploader.upload(localPath, {
                            folder: 'car_images', // Specify the folder on Cloudinary
                            public_id: `${carModel}_${key}_${Date.now()}`, // Customize the public_id
                        });

                        const imageUrl = cloudinaryResponse.secure_url;

                        // Store URLs based on the fieldname, consolidating arrays where applicable
                        switch (key) {
                            case "image0":
                            case "image1":
                            case "image2":
                            case "image3":
                                carImages.push(imageUrl);
                                break;
                            case "idfront":
                            case "idback":
                                ownerDocImages.push(imageUrl);
                                break;
                            case "cardocumentfront":
                            case "cardocumentback":
                                carDocImages.push(imageUrl);
                                break;
                            case "vechilelicensefront":
                            case "vechilelicenseback":
                                vehicleLicenseImages.push(imageUrl);
                                break;
                            case "bankpassbookphoto":
                                bankPassImage = imageUrl;
                                break;
                            default:
                                console.log(`Unhandled field: ${key}`);
                                break;
                        }

                    } catch (uploadError) {
                        console.error(`Error uploading ${key}:, uploadError.message`);
                    }
                }
            }
            deleteAllTempFiles(req.files)
        } else {
            console.log("No images uploaded");
        }

        // Populate the car data object dynamically
        const carData = {
            brand: carName || "",
            model: carModel || "",
            year: carYear || "",
            seats: seatingCapacity || 0,
            fuelType: fuelType || "",
            pricePerDay: dailyRentalPrice || 0,
            milage: mileage || 0,
            color: color || "",
            description: description || "",
            features: features || [],
            category: category || "",
            subCategory: subcategory || "",
            pickupLocation: pickupLocation || "",
            dropoffLocation: dropoffLocation || "",
            registrationNumber: registrationNumber || "",
            transmissionType: transmissionType || "",
            location: {
                type: "Point",
                coordinates: [12.9716, 77.5946], // Static coordinates (example: Bengaluru, India)
            },
            partnerId: req.user.linkedId,
            images: carImages,
            docs: {
                ownerDoc: ownerDocImages,
                carDoc: carDocImages,
                vehiclelic: vehicleLicenseImages,
                bankPass: bankPassImage,
            },
        };

        // Save the car data to the database
        const newCar = new Car(carData);
        const savedCar = await newCar.save();

        console.log("Car Added Successfully!");
        res.status(201).json(new ApiResponse(201, savedCar, "Car added successfully."));
    } catch (error) {
        console.log("Error : ", error);
        next(new ApiError(400, error.message || "Internal Server Error."));
    }
};





export const getAllCars = async (req, res) => {
    try {
        const cars = await Car.find()
        // console.log("All Cars", cars)
        return res.status(200).json({
            message: "All Cars Successfully fetched",
            data: cars
        })
    } catch (error) {
        console.log("Error to fetch cars : ", error)
        return res.status(404).json({
            message: "Data not found"
        })
    }
}

export const getCarById = async (req, res) => {
    const carId = req.params.carId;
    console.log("Car Id : ", carId)
    try {
        const cardetails = await Car.findById({ _id: new ObjectId(carId) }).populate('partnerId')
        const bookings = await Booking.find({ carId: new ObjectId(carId) })
        // console.log("Car Details : ", cardetails)
        if (cardetails) {
            res.status(200).json({
                message: " car Details Successfully fetched",
                data: { cardetails, bookings, }
            })
        } else {
            res.status(404).json({
                message: "Car not exist"
            })
        }
    } catch (error) {
        console.log("internal server error")
    }
}

export const getCarByUserId = async (req, res) => {
    const userId = req.user.linkedId;
    console.log(userId)
    try {
        // Validate userId
        if (!userId || !ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "Invalid or missing User ID" });
        }

        // Fetch car details
        const carDetails = await Car.find({ partnerId: new ObjectId(userId) });

        if (carDetails.length === 0) {
            return res.status(404).json({ success: false, message: "No car details found!" });
        }

        // console.log("Car details:", carDetails);

        res.status(200).json(
            new ApiResponse(201, carDetails, "Car details fetched successfully")

        );
    } catch (error) {
        console.error("Error fetching car details:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

export const updateCarDetails = async (req, res) => {
    const carId = req.params.carId;
    console.log("Cars :", carId);
    console.log("CarDetails :", req.body);

    try {
        // Parse carDetails from request body
        const carDetails = req.body.carDetails ? JSON.parse(req.body.carDetails) : req.body.carDetails;
        
        // Ensure the carDetails object is not empty or undefined
        if (!carDetails) {
            throw new ApiError(400, 'carDetails is missing or empty');
        }

        const { carId } = req.params;
        const files = req.files; 
        const {
            carName, carModel, carYear, seatingCapacity, fuelType, dailyRentalPrice, carMileagePerHour: mileage, carColor: color, description, features, category, subcategory, pickupLocation, dropoffLocation, registrationNumber, transmissionType,
        } = carDetails;

        // Find the car by ID
        const car = await Car.findById(carId);
        if (!car) {
            return res.status(404).json({ message: 'Car not found' });
        }

        const deleteAllTempFiles = (files) => {
            Object.values(files).forEach(fileArray => {
                fileArray.forEach(file => {
                    fs.unlink(file.path, (err) => {
                        if (err) console.error(`Error deleting temp file ${file.path}:`, err);
                    });
                });
            });
        };

        // Arrays to store Cloudinary URLs
        let carImages = [];
        let ownerDocImages = [];
        let carDocImages = [];
        let vehicleLicenseImages = [];
        let bankPassImage = "";

        if (files) {
            // Upload images to Cloudinary and store URLs in the respective arrays
            if (files.image0) {
                const image0 = await cloudinary.uploader.upload(files.image0[0].path);
                carImages[0] = image0.secure_url; // Fixed: Use assignment instead of push
            } else {
                carImages[0] = car.images[0]; // Fixed: Use assignment instead of push
            }
        
            if (files.image1) {
                const image1 = await cloudinary.uploader.upload(files.image1[0].path);
                carImages[1] = image1.secure_url;
            } else {
                carImages[1] = car.images[1];
            }
        
            if (files.image2) {
                const image2 = await cloudinary.uploader.upload(files.image2[0].path);
                carImages[2] = image2.secure_url;
            } else {
                carImages[2] = car.images[2];
            }
        
            if (files.image3) {
                const image3 = await cloudinary.uploader.upload(files.image3[0].path);
                carImages[3] = image3.secure_url; // Fixed: Changed carImage to carImages
            } else {
                carImages[3] = car.images[3];
            }
        
            // Owner documents
            if (files.idfront) {
                const idfront = await cloudinary.uploader.upload(files.idfront[0].path);
                ownerDocImages[0] = idfront.secure_url;
            } else {
                ownerDocImages[0] = car.docs.ownerDoc[0]; // Fixed: Retrieve from car.docs
            }
        
            if (files.idback) {
                const idback = await cloudinary.uploader.upload(files.idback[0].path);
                ownerDocImages[1] = idback.secure_url;
            } else {
                ownerDocImages[1] = car.docs.ownerDoc[1];
            }
        
            // Car documents
            if (files.cardocumentfront) {
                const cardocumentfront = await cloudinary.uploader.upload(files.cardocumentfront[0].path);
                carDocImages[0] = cardocumentfront.secure_url;
            } else {
                carDocImages[0] = car.docs.carDoc[0];
            }
        
            if (files.cardocumentback) {
                const cardocumentback = await cloudinary.uploader.upload(files.cardocumentback[0].path);
                carDocImages[1] = cardocumentback.secure_url;
            } else {
                carDocImages[1] = car.docs.carDoc[1];
            }
        
            if (files.vechilelicensefront) {
                const vechilelicensefront = await cloudinary.uploader.upload(files.vechilelicensefront[0].path);
                vehicleLicenseImages[0] = vechilelicensefront.secure_url;
            } else {
                vehicleLicenseImages[0] = car.docs.vehiclelic[0];
            }
        
            if (files.vechilelicenseback) {
                const vechilelicenseback = await cloudinary.uploader.upload(files.vechilelicenseback[0].path);
                vehicleLicenseImages[1] = vechilelicenseback.secure_url;
            } else {
                vehicleLicenseImages[1] = car.docs.vehiclelic[1];
            }
        
            // Bank passbook image
            if (files.bankpassbookphoto) {
                const bankpassbookphoto = await cloudinary.uploader.upload(files.bankpassbookphoto[0].path);
                bankPassImage = bankpassbookphoto.secure_url;
            } else {
                bankPassImage = car.bankpassbookphoto;
            }
            deleteAllTempFiles(files);
        }

        Object.assign(car, {
            brand:carName,
            model:carModel,
            year:carYear,
            seats:seatingCapacity,
            fuelType,
            pricePerDay:dailyRentalPrice,
            mileage,
            color,
            description,
            features,
            category,
            subCategory: subcategory,
            pickupLocation,
            dropoffLocation,
            registrationNumber,
            transmissionType,
           
            images: carImages,
            docs: {
                ownerDoc: ownerDocImages,
                carDoc: carDocImages,
                vehiclelic: vehicleLicenseImages,
                bankPass: bankPassImage,
            },
        });

        // Save updated car
        await car.save();
        console.log("Updated car: ",car);

        res.status(200).json({
            message: 'Car details updated successfully',
            car,
        });
    } catch (error) {
        console.error('Error updating car details:', error);
        res.status(500).json({
            message: 'Failed to update car details',
            error: error.message,
        });
    }
};

export const deleteCar = async (req, res) => {
    const carId = req.params.carId;
    console.log("Car id for Delete:", carId);

    try {
        // Validate carId format
        if (!ObjectId.isValid(carId)) {
            return res.status(400).json({ message: "Invalid car ID format." });
        }

        // Delete the car
        const result = await Car.findOneAndDelete({ _id: new ObjectId(carId) });
        // console.log("Result:", result);

        if (result) {
            console.log("Car deleted successfully");
            return res.status(200).json({ message: `Car with id: ${carId} deleted successfully` });
        } else {
            console.log("Car not found");
            return res.status(404).json({ message: `Car with id: ${carId} not found` });
        }
    } catch (error) {
        console.error("Error occurred while deleting car:", error);
        return res.status(500).json({ error: "Failed to delete car. Please try again later." });
    }
};

export const getCarByCost = async (req, res) => {
    try {
        // Log the user and filter for debugging purposes
        // console.log("User:", req.user);
        const { filter } = req.query;
        console.log("Filter:", filter);

        // Validate the filter query parameter
        if (!filter) {
            return res.status(400).json({ message: 'Filter parameter is required.' });
        }

        if (!['low_cost', 'normal_cost'].includes(filter)) {
            return res.status(400).json({ message: 'Invalid filter value.' });
        }

        // Set the price threshold for 'low_cost' and 'normal_cost'
        const priceThreshold = 50;

        // Build the filter query object based on the filter
        let filterQuery = {};

        if (filter === 'low_cost') {
            filterQuery.pricePerDay = { $lte: priceThreshold }; // Cars with price <= 680
        } else if (filter === 'normal_cost') {
            filterQuery.pricePerDay = { $gt: priceThreshold }; // Cars with price > 680
        }

        // Query the database with the filter query object
        const cars = await Car.find(filterQuery).lean(); // Using .lean() for plain JavaScript objects
        // console.log("Cars:", cars);

        // Return the array of cars directly in the response
        return res.status(200).json(cars);

    } catch (error) {
        console.error('Error fetching filtered cars:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const fetchSubCategory = async (req, res) => {
    const { category } = req.params; // Extract category from request params

    try {
        // Fetch distinct subcategories for the given category
        const subcategories = await Car.distinct("subCategory", { category });

        if (subcategories.length === 0) {
            return res.status(404).json({ message: `No subcategories found for category: ${category}` });
        }

        res.json({
            category,
            subcategories,
        });
    } catch (error) {
        console.error("Error fetching subcategories:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};



export const fetchCategory = async (req, res) => {

    try {
        const categories = await Car.distinct("category");

        categories.forEach((category, index) => {
            console.log(`${index + 1}. ${category}`);
        });
        res.status(200).json(
            new ApiResponse(202, categories, "Successfully Fetch Categories")

        )

    }
    catch (error) {
        next(error.message || "Invalid Refresh Token.")
    }
}
// Fetch cars based on the selected category
export const filterCarsByCategory = async (req, res) => {
    try {
        const { category, filter } = req.query; // Get category and cost filters from query params
        console.log(req.query)
        let filterQuery = { category };

        if (!filter) {
            console.log("select costType First")
            return res.status(404).json({
                message: "Please select costType first!"
            })
        }

        if (!category) {
            console.log("select category First")
            return res.status(404).json({
                message: "Please select category first!"
            })
        }

        // Apply cost filter if specified
        if (filter === 'low_cost') {
            filterQuery.pricePerDay = { $lte: 50 };
        } else if (filter === 'normal_cost') {
            filterQuery.pricePerDay = { $gt: 50 };
        }

        // Fetch the cars filtered by category
        const cars = await Car.find(filterQuery);

        // console.log("Filtered Car : ", cars)

        // Return the filtered cars
        if (cars.length === 0) {
            return res.status(404).json({ message: 'No cars found for the selected category' });
        }

        return res.status(200).json({ cars });
    } catch (error) {
        console.error('Error while fetching cars by category:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};


// Fetch cars based on the selected subcategory
export const filterCarsBySubCategory = async (req, res) => {
    try {
        const { subCategory, category, filter } = req.query; // Get subcategory, category, and cost filters from query params
        console.log(req.query);

        if (!filter) {
            console.log("select costType First");
            return res.status(404).json({
                message: "Please select costType first!"
            });
        }

        if (!category) {
            console.log("select category First");
            return res.status(404).json({
                message: "Please select category first!"
            });
        }

        if (!subCategory) {
            console.log("select Subcategory First");
            return res.status(404).json({
                message: "Please select Subcategory first!"
            });
        }

        // Build match stage based on query filters
        const matchStage = {
            subCategory: subCategory
        };

        if (category) {
            matchStage.category = category;
        }

        if (filter === 'low_cost') {
            matchStage.pricePerDay = { $lte: 50 };
        } else if (filter === 'normal_cost') {
            matchStage.pricePerDay = { $gt: 50 };
        }

        // Aggregation pipeline
        const cars = await Car.aggregate([
            { $match: matchStage },
            {
                $lookup: {
                    from: 'partners', // Replace with your partners collection name
                    localField: 'partnerId',
                    foreignField: '_id',
                    as: 'partnerDetails'
                }
            },
            {
                $unwind: {
                    path: "$partnerDetails",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    id: "$_id",
                    brand: 1,
                    model: 1,
                    year: 1,
                    seats: 1,
                    fuelType: 1,
                    description: 1,
                    pricePerDay: 1,
                    milage: 1,
                    color: 1,
                    pickupLocation: 1,
                    dropoffLocation: 1,
                    availabilityStatus: 1,
                    features: 1,
                    images: 1,
                    location: 1,
                    category: 1,
                    subCategory: 1,
                    partnerId: 1,
                    partnerDetails: 1 // Include partner details in the response
                }
            }
        ]);

        // Return the filtered cars
        if (cars.length === 0) {
            return res.status(404).json({ message: 'No cars found for the selected subcategory' });
        }

        return res.status(200).json(cars);
    } catch (error) {
        console.error('Error while fetching cars by subcategory:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

